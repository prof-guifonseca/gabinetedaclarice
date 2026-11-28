import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  DIRECTOR_RESPONSE_SCHEMA,
  DEFAULT_LIVE_VOICE,
  buildDirectorInstructions,
  buildLiveInstructions,
  buildTextInstructions,
  inferMoodFromText,
  sanitizeUntrustedPromptText,
  type RecentTurn,
} from "../src/shared/persona";
import {
  clamp,
  isDocumentAction,
  sanitizeDirectorPatch,
  type DirectorPatch,
  type ScenarioId,
  type SessionLedger,
} from "../src/shared/gameState";
import { SCENARIOS, createInitialLedger } from "../src/shared/scenarios";

const app = new Hono<{
  Bindings: Env;
  Variables: { rawBodyText?: string };
}>();

const PRESET_LIVE_VOICES = new Set(["tempo", "bossa", "stone", "ripple", "coral"]);
const FALLBACK_PRESET_VOICE = "tempo";
const CUSTOM_VOICE_ID_RE = /^voice_[a-zA-Z0-9_-]{8,80}$/;
const MAX_API_BODY_BYTES = 32 * 1024;
const MAX_SDP_CHARS = 24_000;
const RATE_LIMIT_MAX_ENTRIES = 2000;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

function getClientKey(request: Request, bucket: string): string {
  const ip = request.headers.get("CF-Connecting-IP")?.trim() || "local";
  return `${bucket}:${ip}`;
}

function checkRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const key = getClientKey(request, bucket);
  const existing = rateLimitStore.get(key);

  if (!existing || now >= existing.resetAt) {
    if (existing) {
      rateLimitStore.delete(key);
    }
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    if (rateLimitStore.size > RATE_LIMIT_MAX_ENTRIES) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now >= v.resetAt) rateLimitStore.delete(k);
      }
      while (rateLimitStore.size > RATE_LIMIT_MAX_ENTRIES) {
        const oldestKey = rateLimitStore.keys().next().value;
        if (oldestKey === undefined) break;
        rateLimitStore.delete(oldestKey);
      }
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

async function readBodyTextWithLimit(
  req: Request,
  maxBytes: number
): Promise<{ exceeded: true } | { exceeded: false; text: string }> {
  const contentLengthRaw = req.headers.get("Content-Length");
  if (contentLengthRaw !== null) {
    const contentLength = Number(contentLengthRaw);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return { exceeded: true };
    }
  }
  const body = req.body;
  if (!body) {
    return { exceeded: false, text: "" };
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { exceeded: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { exceeded: false, text: new TextDecoder().decode(merged) };
}

function parseJsonBody<T>(rawText: string | undefined): T {
  return JSON.parse(rawText ?? "") as T;
}

function mapUpstreamStatus(status: number): ContentfulStatusCode {
  if (status === 429) return 429;
  if (status === 408 || status === 504) return 504;
  if (status === 503) return 503;
  return 502;
}

// Global security headers + API Cache-Control middleware
app.use("*", async (c, next) => {
  await next();
  const headers = new Headers(c.res.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(self)"
  );
  if (c.req.path.startsWith("/api/")) {
    const ct = headers.get("Content-Type") || "";
    headers.set(
      "Cache-Control",
      ct.includes("text/event-stream") ? "no-store, no-transform" : "no-store"
    );
  }
  c.res = new Response(c.res.body, {
    status: c.res.status,
    statusText: c.res.statusText,
    headers,
  });
});

// API POST origin, Content-Type and 32KB body-size hardening
app.use("/api/*", async (c, next) => {
  if (c.req.method === "POST") {
    const origin = c.req.header("Origin");
    if (origin) {
      let expectedOrigin = "";
      try {
        expectedOrigin = new URL(c.req.url).origin;
      } catch {
        expectedOrigin = "";
      }
      if (!expectedOrigin || origin !== expectedOrigin) {
        return c.json({ error: "Origem não autorizada." }, 403);
      }
    }

    const contentType = c.req.header("Content-Type") || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return c.json(
        { error: "Content-Type deve começar com application/json." },
        415
      );
    }

    const bodyResult = await readBodyTextWithLimit(
      c.req.raw,
      MAX_API_BODY_BYTES
    );
    if (bodyResult.exceeded) {
      return c.json(
        { error: "Payload excede o limite máximo de 32KB." },
        413
      );
    }
    c.set("rawBodyText", bodyResult.text);
  }
  await next();
});

function isValidLiveVoice(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (PRESET_LIVE_VOICES.has(value) || CUSTOM_VOICE_ID_RE.test(value))
  );
}

export function parseLiveVoice(value: unknown, fallback: string): string {
  if (isValidLiveVoice(value)) {
    return value;
  }
  return isValidLiveVoice(fallback) ? fallback : DEFAULT_LIVE_VOICE;
}

export function formatLiveVoiceParam(voice: string): string | { id: string } {
  return CUSTOM_VOICE_ID_RE.test(voice) ? { id: voice } : voice;
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean;
  };
  if (typeof subtle.timingSafeEqual === "function") {
    return subtle.timingSafeEqual(a, b);
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function verifyAccessCode(
  provided: unknown,
  expected: string | undefined
): Promise<boolean> {
  const normalizedExpected = expected?.trim() ?? "";
  if (normalizedExpected === "") {
    return true;
  }
  if (typeof provided !== "string") {
    return false;
  }
  const normalizedProvided = provided.trim();
  if (normalizedProvided.length === 0) {
    return false;
  }
  const [a, b] = await Promise.all([
    sha256Bytes(normalizedProvided),
    sha256Bytes(normalizedExpected),
  ]);
  return constantTimeEqual(a, b);
}

function sanitizeHistory(input: unknown, limit = 16): RecentTurn[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-(limit * 2))
    .filter(
      (item): item is RecentTurn =>
        typeof item === "object" &&
        item !== null &&
        ((item as RecentTurn).role === "user" ||
          (item as RecentTurn).role === "assistant") &&
        typeof (item as RecentTurn).content === "string" &&
        (item as RecentTurn).content.trim().length > 0
    )
    .slice(-limit)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 1500),
    }));
}

function sanitizeLedger(input: unknown): SessionLedger | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const obj = input as Record<string, unknown>;
  const rawScenario = String(obj.scenarioId || "livre");
  const scenarioId: ScenarioId =
    rawScenario in SCENARIOS ? (rawScenario as ScenarioId) : "livre";
  const base = createInitialLedger(scenarioId);

  const rawMeters =
    typeof obj.meters === "object" && obj.meters !== null
      ? (obj.meters as Record<string, unknown>)
      : {};

  const actNum = Number(obj.act);
  const act = actNum === 2 || actNum === 3 ? actNum : 1;

  const facts = Array.isArray(obj.facts)
    ? obj.facts
        .slice(-30)
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(-10)
        .map((s) => sanitizeUntrustedPromptText(s, 140))
        .filter(Boolean)
    : [];

  const recentTropes = Array.isArray(obj.recentTropes)
    ? obj.recentTropes
        .slice(-24)
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(-8)
        .map((s) => sanitizeUntrustedPromptText(s, 48))
        .filter(Boolean)
    : [];

  const documents: SessionLedger["documents"] = Array.isArray(obj.documents)
    ? obj.documents.slice(-12).flatMap((doc, idx) => {
        if (typeof doc !== "object" || doc === null) return [];
        const rec = doc as Record<string, unknown>;
        const sanitizedAction = sanitizeDirectorPatch({
          action: rec.action,
        }).action;
        if (!isDocumentAction(sanitizedAction)) return [];
        return [
          {
            id:
              typeof rec.id === "string" && rec.id.trim().length > 0
                ? sanitizeUntrustedPromptText(rec.id, 48)
                : `doc-${idx}`,
            createdAt:
              typeof rec.createdAt === "string" && rec.createdAt.trim().length > 0
                ? sanitizeUntrustedPromptText(rec.createdAt, 24)
                : "",
            turn: clamp(Math.round(Number(rec.turn) || 1), 1, 200),
            action: sanitizedAction,
          },
        ];
      })
    : [];

  return {
    ...base,
    turnCount: clamp(Math.round(Number(obj.turnCount) || 0), 0, 200),
    act,
    meters: {
      cortesVirais: clamp(
        Math.round(
          typeof rawMeters.cortesVirais === "number"
            ? rawMeters.cortesVirais
            : base.meters.cortesVirais
        ),
        0,
        100
      ),
      paradoxoTradwife: clamp(
        Math.round(
          typeof rawMeters.paradoxoTradwife === "number"
            ? rawMeters.paradoxoTradwife
            : base.meters.paradoxoTradwife
        ),
        0,
        100
      ),
      faturamentoHotmartK: clamp(
        Math.round(
          typeof rawMeters.faturamentoHotmartK === "number"
            ? rawMeters.faturamentoHotmartK
            : base.meters.faturamentoHotmartK
        ),
        0,
        500
      ),
      compostura: clamp(
        Math.round(
          typeof rawMeters.compostura === "number"
            ? rawMeters.compostura
            : base.meters.compostura
        ),
        0,
        100
      ),
    },
    facts,
    recentTropes,
    documents,
  };
}

function extractResponseText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const output = payload.output;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      if (
        typeof item === "object" &&
        item !== null &&
        Array.isArray((item as { content?: unknown[] }).content)
      ) {
        for (const block of (item as { content: unknown[] }).content) {
          if (
            typeof block === "object" &&
            block !== null &&
            typeof (block as { text?: unknown }).text === "string"
          ) {
            parts.push((block as { text: string }).text);
          }
        }
      }
    }
    if (parts.length > 0) return parts.join("\n").trim();
  }
  return "";
}

export function buildFallbackDirectorPatch(
  userMessage: string,
  assistantReply: string,
  _ledger: SessionLedger
): DirectorPatch {
  const combined = `${userMessage} ${assistantReply}`.toLowerCase();
  const replyLower = assistantReply.toLowerCase();
  const mood = inferMoodFromText(assistantReply, "falando");

  const meterDelta: DirectorPatch["meterDelta"] = {
    cortesVirais: 0,
    paradoxoTradwife: 0,
    faturamentoHotmartK: 0,
    compostura: 0,
  };
  let action: DirectorPatch["action"] = { type: "none" };

  if (
    /(silêncio|fica quiet|ring light|meu corte de 60|corta esse áudio)/.test(
      replyLower
    )
  ) {
    meterDelta.compostura = -14;
    meterDelta.cortesVirais = 10;
    action = {
      type: "ligar_ring_light_silenciar",
      segundos: 4,
      motivo:
        "Silêncio agora que o Enzo ligou o Ring Light pro corte de 60 segundos!",
    };
  } else if (
    /(denúncia|canal escola sem|notific|gravar em 4k|doutrina)/.test(replyLower)
  ) {
    meterDelta.cortesVirais = 10;
    meterDelta.compostura = -6;
    action = {
      type: "protocolar_denuncia_escola",
      protocolo: `ESD-${Math.floor(1000 + Math.random() * 8999)}/2026`,
      instituicao: "Departamento de Humanas & Sala de Aula Suspeita",
      acusacaoAbsurda:
        "Suspeita grave de Marxismo Cultural e menção não autorizada à Revolução Francesa sem elogiar a família tradicional.",
      penalidadeProposta:
        "Substituição imediata da matéria por 40h de Etiqueta Doméstica e Finanças do Lar.",
    };
  } else if (/(hotmart|mentoria|cupom|12x|197|link na bio)/.test(replyLower)) {
    meterDelta.faturamentoHotmartK = 45;
    meterDelta.cortesVirais = 8;
    action = {
      type: "lancar_oferta_hotmart",
      nomeProduto: "Mentoria Esposa de Alto Valor + Livro Best-Seller",
      valorFaturadoK: 45,
      parcela: "12x de R$ 197,00",
      cupom: "FAMILIA10",
      modulosBonus:
        "Módulo bônus: Como mandar no marido por WhatsApp parecendo dócil + Pão artesanal que a babá assa.",
    };
  } else if (/(enzo|reels|corte|thumbnail|milhão)/.test(replyLower)) {
    meterDelta.cortesVirais = 12;
    action = {
      type: "gravar_corte_reels",
      tituloViral: "DEPUTADA CLARICE DESTRÓI CARTILHA DE FRANKFURT AO VIVO!",
      viewsEstimadas: "1,2 MI",
      legendaCorte:
        "Veja o silêncio quando os fatos históricos entraram na sala! Cupom FAMILIA10 na bio.",
      hashtag: "#GuerraCultural #Gabinete222",
    };
  } else if (/(página 42|meu livro|armadilha de frankfurt)/.test(replyLower)) {
    meterDelta.compostura = -8;
    action = {
      type: "bater_livro_mesa",
      motivo:
        "Leia a página 42 do meu best-seller antes de repetir cartilha pronta!",
    };
  }

  if (
    /(babá|marido|fabrício|salário|brasília|voto feminino|fogão|bistrô)/.test(
      combined
    )
  ) {
    meterDelta.paradoxoTradwife = (meterDelta.paradoxoTradwife ?? 0) + 14;
    meterDelta.compostura = (meterDelta.compostura ?? 0) - 8;
  }

  const usedTropes: string[] = [];
  if (/frankfurt|marxismo/.test(combined)) usedTropes.push("escola de frankfurt");
  if (/babá|fabrício|marido/.test(combined))
    usedTropes.push("3 babas e marido sc");
  if (/hotmart|mentoria|197|cupom/.test(combined))
    usedTropes.push("mentoria hotmart");
  if (/bento|matcha/.test(combined)) usedTropes.push("prof bento");
  if (/vavá|rodeio/.test(combined)) usedTropes.push("dr vava");
  if (/jeremias|cabo|hilux|ursal|caveira/.test(combined))
    usedTropes.push("cabo jeremias");
  if (/burnout|gato/.test(combined)) usedTropes.push("burnout e gatos");
  if (/denúncia|4k/.test(combined)) usedTropes.push("canal denuncias");

  return {
    mood,
    meterDelta,
    action,
    usedTropes: usedTropes.slice(0, 3),
    newFacts: [],
    suggestedMoves: [],
  };
}

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    service: "gabinetedaclarice",
    version: "2.0",
    liveModel: c.env.GPT_LIVE_MODEL || "gpt-live-1.1",
    textModel: c.env.OPENAI_TEXT_MODEL || "gpt-6-luna",
    defaultVoice: parseLiveVoice(c.env.DEFAULT_VOICE, DEFAULT_LIVE_VOICE),
    requiresAccessCode: Boolean(
      c.env.ACCESS_CODE && c.env.ACCESS_CODE.trim() !== ""
    ),
    hasOpenAIKey: Boolean(
      c.env.OPENAI_API_KEY && c.env.OPENAI_API_KEY.trim() !== ""
    ),
  });
});

app.post("/api/auth/verify", async (c) => {
  const rl = checkRateLimit(c.req.raw, "auth", 15, 5 * 60_000);
  if (!rl.allowed) {
    c.header("Retry-After", String(rl.retryAfterSec));
    return c.json(
      {
        error:
          "Muitas tentativas na portaria do Gabinete 222. Aguarde um pouco.",
      },
      429
    );
  }

  let body: { accessCode?: string };
  try {
    body = parseJsonBody<{ accessCode?: string }>(c.get("rawBodyText"));
  } catch {
    return c.json({ error: "Payload JSON inválido." }, 400);
  }

  const authorized = await verifyAccessCode(body.accessCode, c.env.ACCESS_CODE);
  if (!authorized) {
    return c.json({ ok: false, error: "Senha de gabinete inválida." }, 401);
  }

  return c.json({ ok: true });
});

app.post("/api/live/session", async (c) => {
  const startedAt = Date.now();
  const rl = checkRateLimit(c.req.raw, "live", 10, 5 * 60_000);
  if (!rl.allowed) {
    c.header("Retry-After", String(rl.retryAfterSec));
    return c.json(
      {
        error:
          "Calma, meu bem! Muitas chamadas de voz seguidas — aguarde uns segundos pro Enzo ajustar o ring light.",
      },
      429
    );
  }

  let body: {
    sdp?: string;
    voice?: string;
    history?: unknown;
    ledger?: unknown;
    accessCode?: string;
  };

  try {
    body = parseJsonBody(c.get("rawBodyText"));
  } catch {
    return c.json({ error: "Payload JSON inválido." }, 400);
  }

  const authorized = await verifyAccessCode(body.accessCode, c.env.ACCESS_CODE);
  if (!authorized) {
    console.warn(
      JSON.stringify({
        event: "live_session_unauthorized",
        path: "/api/live/session",
      })
    );
    return c.json({ error: "Senha de gabinete inválida." }, 401);
  }

  if (
    typeof body.sdp !== "string" ||
    !body.sdp.includes("v=0") ||
    body.sdp.length > MAX_SDP_CHARS
  ) {
    return c.json(
      { error: "SDP offer WebRTC ausente, inválido ou grande demais." },
      400
    );
  }

  if (!c.env.OPENAI_API_KEY) {
    console.error(
      JSON.stringify({ event: "missing_openai_key", path: "/api/live/session" })
    );
    return c.json({ error: "Serviço de voz indisponível no servidor." }, 500);
  }

  const requestedVoice = parseLiveVoice(
    body.voice,
    c.env.DEFAULT_VOICE || DEFAULT_LIVE_VOICE
  );
  const model = c.env.GPT_LIVE_MODEL || "gpt-live-1.1";
  const recentHistory = sanitizeHistory(body.history, 8);
  const ledger = sanitizeLedger(body.ledger);
  const instructions = buildLiveInstructions(recentHistory, ledger);

  const attemptSession = async (
    includeStandby: boolean,
    activeVoice: string
  ) => {
    const sessionConfig: Record<string, unknown> = {
      model,
      instructions,
      audio: {
        output: {
          voice: formatLiveVoiceParam(activeVoice),
        },
      },
    };
    if (includeStandby) {
      sessionConfig.wake_policy = { type: "speech" };
      sessionConfig.idle_timeout_s = 20;
    }

    return fetch("https://api.openai.com/v1/live/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: sessionConfig,
        transport: {
          type: "webrtc",
          sdp: body.sdp,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  };

  try {
    let effectiveVoice = requestedVoice;
    let standbyEnabled = true;
    let upstream = await attemptSession(true, effectiveVoice);
    let rawText = await upstream.text();

    if (!upstream.ok && (upstream.status === 400 || upstream.status === 422)) {
      console.warn(
        JSON.stringify({
          event: "live_session_standby_fallback",
          status: upstream.status,
          voice: effectiveVoice,
          detail: rawText.slice(0, 240),
        })
      );
      standbyEnabled = false;
      upstream = await attemptSession(false, effectiveVoice);
      rawText = await upstream.text();
    }

    if (
      !upstream.ok &&
      (upstream.status === 400 || upstream.status === 422) &&
      CUSTOM_VOICE_ID_RE.test(effectiveVoice)
    ) {
      console.warn(
        JSON.stringify({
          event: "live_session_voice_fallback",
          status: upstream.status,
          fromVoice: effectiveVoice,
          toVoice: FALLBACK_PRESET_VOICE,
          detail: rawText.slice(0, 240),
        })
      );
      effectiveVoice = FALLBACK_PRESET_VOICE;
      upstream = await attemptSession(false, effectiveVoice);
      rawText = await upstream.text();
    }

    if (!upstream.ok) {
      const clientStatus = mapUpstreamStatus(upstream.status);
      console.error(
        JSON.stringify({
          event: "live_session_upstream_error",
          upstreamStatus: upstream.status,
          clientStatus,
          model,
          voice: effectiveVoice,
          durationMs: Date.now() - startedAt,
          detail: rawText.slice(0, 400),
        })
      );
      return c.json(
        {
          error:
            clientStatus === 429
              ? "Muitas chamadas ao vivo simultâneas na linha da OpenAI. Aguarde alguns segundos e tente novamente."
              : "Falha ao inicializar a conversa por voz no Gabinete 222. Tente novamente em instantes.",
        },
        clientStatus
      );
    }

    const parsed = JSON.parse(rawText) as {
      session?: Record<string, unknown>;
      transport?: { type?: string; sdp?: string };
    };

    console.info(
      JSON.stringify({
        event: "live_session_started",
        model,
        voice: effectiveVoice,
        standbyEnabled,
        scenarioId: ledger?.scenarioId ?? "livre",
        durationMs: Date.now() - startedAt,
      })
    );

    return c.json(
      {
        session: parsed.session,
        transport: parsed.transport,
        model,
        voice: effectiveVoice,
        standbyEnabled,
      },
      201
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "live_session_exception",
        model,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json(
      { error: "Erro interno ao negociar a conexão de voz no Gabinete 222." },
      502
    );
  }
});

app.post("/api/chat", async (c) => {
  const rl = checkRateLimit(c.req.raw, "chat", 30, 60_000);
  if (!rl.allowed) {
    c.header("Retry-After", String(rl.retryAfterSec));
    return c.json(
      {
        error:
          "Calma, meu bem! Tá mandando mensagem rápido demais — respira fundo e toma um chazinho.",
      },
      429
    );
  }

  let body: {
    message?: string;
    history?: unknown;
    ledger?: unknown;
    stream?: boolean;
    accessCode?: string;
  };

  try {
    body = parseJsonBody(c.get("rawBodyText"));
  } catch {
    return c.json({ error: "Payload JSON inválido." }, 400);
  }

  const authorized = await verifyAccessCode(body.accessCode, c.env.ACCESS_CODE);
  if (!authorized) {
    return c.json({ error: "Senha de gabinete inválida." }, 401);
  }

  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return c.json({ error: "Mensagem vazia." }, 400);
  }

  if (!c.env.OPENAI_API_KEY) {
    console.error(
      JSON.stringify({ event: "missing_openai_key", path: "/api/chat" })
    );
    return c.json({ error: "Serviço de chat indisponível no servidor." }, 500);
  }

  const textModel = c.env.OPENAI_TEXT_MODEL || "gpt-6-luna";
  const history = sanitizeHistory(body.history, 16);
  const ledger = sanitizeLedger(body.ledger);
  const message = body.message.trim().slice(0, 1500);
  const wantsStream = body.stream === true;

  const input = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const upstreamAbort = new AbortController();
  const reqSignal = c.req.raw.signal;
  const onClientAbort = () => upstreamAbort.abort();
  if (reqSignal.aborted) {
    upstreamAbort.abort();
  } else {
    reqSignal.addEventListener("abort", onClientAbort, { once: true });
  }
  const timeoutHandle = setTimeout(() => upstreamAbort.abort(), 30_000);

  const cleanupUpstreamAbort = () => {
    clearTimeout(timeoutHandle);
    reqSignal.removeEventListener("abort", onClientAbort);
  };

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: textModel,
        instructions: buildTextInstructions(ledger),
        input,
        max_output_tokens: 700,
        ...(wantsStream ? { stream: true } : {}),
      }),
      signal: upstreamAbort.signal,
    });

    if (!upstream.ok) {
      cleanupUpstreamAbort();
      const errText = await upstream.text().catch(() => "");
      const clientStatus = mapUpstreamStatus(upstream.status);
      console.error(
        JSON.stringify({
          event: "text_chat_upstream_error",
          upstreamStatus: upstream.status,
          clientStatus,
          model: textModel,
          detail: errText.slice(0, 300),
        })
      );
      return c.json(
        {
          error:
            clientStatus === 429
              ? "O Gabinete 222 está lotado no momento. Aguarde alguns segundos e tente novamente."
              : "Falha ao conversar com a Deputada Clarice agora. Tente novamente.",
        },
        clientStatus
      );
    }

    if (wantsStream && upstream.body) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = upstream.body.getReader();
      let closed = false;
      let hadError = false;

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          let fullText = "";

          const sendEvent = (event: string, data: unknown) => {
            if (closed) return;
            try {
              controller.enqueue(
                encoder.encode(
                  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
                )
              );
            } catch {
              closed = true;
            }
          };

          const processLine = (rawLine: string) => {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) return;
            const dataStr = line.slice(5).trim();
            if (!dataStr || dataStr === "[DONE]") return;

            try {
              const evt = JSON.parse(dataStr) as Record<string, unknown>;
              const evtType = String(evt.type ?? "");
              if (
                evtType === "response.output_text.delta" &&
                typeof evt.delta === "string"
              ) {
                fullText += evt.delta;
                sendEvent("delta", { delta: evt.delta });
              } else if (
                evtType === "response.output_text.done" &&
                typeof evt.text === "string" &&
                !fullText
              ) {
                fullText = evt.text;
                sendEvent("delta", { delta: evt.text });
              } else if (evtType === "response.failed" || evtType === "error") {
                hadError = true;
                console.error(
                  JSON.stringify({
                    event: "text_chat_stream_upstream_error",
                    evtType,
                    model: textModel,
                    detail: JSON.stringify(evt).slice(0, 300),
                  })
                );
                sendEvent("error", {
                  error:
                    "O estúdio do Gabinete 222 teve uma oscilação na resposta. Tente novamente.",
                });
              }
            } catch {
              // ignore non-JSON SSE comments
            }
          };

          try {
            while (!closed && !hadError) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer = (buffer + decoder.decode(value, { stream: true }))
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n");

              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const rawLine of lines) {
                processLine(rawLine);
                if (hadError || closed) break;
              }
            }

            if (!closed && !hadError) {
              const tail = decoder.decode();
              if (tail) {
                buffer = (buffer + tail)
                  .replace(/\r\n/g, "\n")
                  .replace(/\r/g, "\n");
              }
              if (buffer.trim()) {
                for (const rawLine of buffer.split("\n")) {
                  processLine(rawLine);
                  if (hadError || closed) break;
                }
              }
            }
          } catch (err) {
            if (!closed) {
              hadError = true;
              console.error(
                JSON.stringify({
                  event: "text_chat_stream_exception",
                  model: textModel,
                  error: err instanceof Error ? err.message : String(err),
                })
              );
              sendEvent("error", {
                error:
                  "A transmissão do Gabinete 222 foi interrompida. Tente novamente.",
              });
            }
          } finally {
            cleanupUpstreamAbort();
            if (!hadError && !closed) {
              const finalReply =
                fullText.trim() ||
                "Ai, meu bem, deu uma piscada aqui no ring light do gabinete. Pode repetir o que você falou?";
              sendEvent("done", { reply: finalReply, model: textModel });
            }
            if (!closed) {
              closed = true;
              try {
                controller.close();
              } catch {
                // ignore already closed
              }
            }
          }
        },
        async cancel() {
          closed = true;
          cleanupUpstreamAbort();
          upstreamAbort.abort();
          await reader.cancel().catch(() => {});
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const raw = await upstream.text();
    cleanupUpstreamAbort();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const reply =
      extractResponseText(parsed) ||
      "Ai, meu bem, deu uma piscada aqui no ring light do gabinete. Pode repetir o que você falou?";

    return c.json({ reply, model: textModel });
  } catch (err) {
    cleanupUpstreamAbort();
    console.error(
      JSON.stringify({
        event: "text_chat_exception",
        model: textModel,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json(
      { error: "Erro interno ao conversar com a Deputada." },
      502
    );
  }
});

app.post("/api/director", async (c) => {
  const rl = checkRateLimit(c.req.raw, "director", 40, 60_000);
  if (!rl.allowed) {
    c.header("Retry-After", String(rl.retryAfterSec));
    return c.json({ error: "Diretor ocupado, aguarde alguns segundos." }, 429);
  }

  let body: {
    userMessage?: string;
    assistantReply?: string;
    ledger?: unknown;
    accessCode?: string;
  };

  try {
    body = parseJsonBody(c.get("rawBodyText"));
  } catch {
    return c.json({ error: "Payload JSON inválido." }, 400);
  }

  const authorized = await verifyAccessCode(body.accessCode, c.env.ACCESS_CODE);
  if (!authorized) {
    return c.json({ error: "Senha de gabinete inválida." }, 401);
  }

  const userMessage =
    typeof body.userMessage === "string"
      ? body.userMessage.trim().slice(0, 800)
      : "";
  const assistantReply =
    typeof body.assistantReply === "string"
      ? body.assistantReply.trim().slice(0, 1200)
      : "";

  if (!assistantReply) {
    return c.json({ error: "assistantReply obrigatório." }, 400);
  }

  const ledger = sanitizeLedger(body.ledger) ?? createInitialLedger("livre");

  if (!c.env.OPENAI_API_KEY) {
    return c.json({
      patch: buildFallbackDirectorPatch(userMessage, assistantReply, ledger),
      source: "fallback",
    });
  }

  const model =
    (c.env as unknown as Record<string, string | undefined>)
      .OPENAI_DIRECTOR_MODEL ||
    c.env.OPENAI_TEXT_MODEL ||
    "gpt-6-luna";

  const callDirector = async (reasoningEffort?: "minimal" | "low") => {
    const payload: Record<string, unknown> = {
      model,
      instructions: buildDirectorInstructions(ledger),
      input: [
        {
          role: "user",
          content: `Visitante disse: "${userMessage || "(início / fala por voz)"}"\nClarice respondeu: "${assistantReply}"`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "clarice_director_patch",
          strict: true,
          schema: DIRECTOR_RESPONSE_SCHEMA,
        },
      },
      max_output_tokens: 1400,
    };
    if (reasoningEffort) {
      payload.reasoning = { effort: reasoningEffort };
    }
    return fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
  };

  try {
    let upstream = await callDirector("minimal");
    if (!upstream.ok && (upstream.status === 400 || upstream.status === 422)) {
      await upstream.body?.cancel().catch(() => {});
      upstream = await callDirector("low");
    }
    if (!upstream.ok && (upstream.status === 400 || upstream.status === 422)) {
      await upstream.body?.cancel().catch(() => {});
      upstream = await callDirector(undefined);
    }

    if (!upstream.ok) {
      const errDetail = await upstream.text().catch(() => "");
      console.warn(
        JSON.stringify({
          event: "director_upstream_fallback",
          status: upstream.status,
          detail: errDetail.slice(0, 260),
        })
      );
      return c.json({
        patch: buildFallbackDirectorPatch(userMessage, assistantReply, ledger),
        source: "fallback",
      });
    }

    const parsed = (await upstream.json()) as Record<string, unknown>;
    const rawJsonText = extractResponseText(parsed);
    const patch = sanitizeDirectorPatch(JSON.parse(rawJsonText));
    return c.json({ patch, source: "model" });
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "director_exception_fallback",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json({
      patch: buildFallbackDirectorPatch(userMessage, assistantReply, ledger),
      source: "fallback",
    });
  }
});

app.all("*", (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("Not Found", 404);
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
