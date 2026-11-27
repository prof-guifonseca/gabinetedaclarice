import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import {
  DIRECTOR_RESPONSE_SCHEMA,
  DEFAULT_LIVE_VOICE,
  buildDirectorInstructions,
  buildLiveInstructions,
  buildTextInstructions,
  inferMoodFromText,
  type RecentTurn,
} from "../src/shared/persona";
import {
  clamp,
  sanitizeDirectorPatch,
  type DirectorPatch,
  type ScenarioId,
  type SessionLedger,
} from "../src/shared/gameState";
import { SCENARIOS, createInitialLedger } from "../src/shared/scenarios";

const app = new Hono<{ Bindings: Env }>();

const PRESET_LIVE_VOICES = new Set(["tempo", "bossa", "stone", "ripple"]);
const CUSTOM_VOICE_ID_RE = /^voice_[a-zA-Z0-9_-]{8,80}$/;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

function getClientKey(request: Request, bucket: string): string {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "local";
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
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    if (rateLimitStore.size > 2000) {
      for (const [k, v] of rateLimitStore.entries()) {
        if (now >= v.resetAt) rateLimitStore.delete(k);
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

async function verifyAccessCode(
  provided: unknown,
  expected: string | undefined
): Promise<boolean> {
  if (!expected || expected.trim() === "") {
    return true;
  }
  if (typeof provided !== "string" || provided.length === 0) {
    return false;
  }
  const [a, b] = await Promise.all([
    sha256Bytes(provided),
    sha256Bytes(expected),
  ]);
  return timingSafeEqual(a, b);
}

function sanitizeHistory(input: unknown, limit = 16): RecentTurn[] {
  if (!Array.isArray(input)) return [];
  return input
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
    facts: Array.isArray(obj.facts)
      ? obj.facts
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .slice(-10)
          .map((s) => s.slice(0, 140))
      : [],
    recentTropes: Array.isArray(obj.recentTropes)
      ? obj.recentTropes
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .slice(-8)
          .map((s) => s.slice(0, 48))
      : [],
    documents: Array.isArray(obj.documents)
      ? (obj.documents.slice(-12) as SessionLedger["documents"])
      : [],
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

  if (/(silêncio|fica quiet|ring light|meu corte de 60|corta esse áudio)/.test(replyLower)) {
    meterDelta.compostura = -14;
    meterDelta.cortesVirais = 10;
    action = {
      type: "ligar_ring_light_silenciar",
      segundos: 4,
      motivo: "Silêncio agora que o Enzo ligou o Ring Light pro corte de 60 segundos!",
    };
  } else if (/(denúncia|canal escola sem|notific|gravar em 4k|doutrina)/.test(replyLower)) {
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
      motivo: "Leia a página 42 do meu best-seller antes de repetir cartilha pronta!",
    };
  }

  if (/(babá|marido|fabrício|salário|brasília|voto feminino|fogão|bistrô)/.test(combined)) {
    meterDelta.paradoxoTradwife = (meterDelta.paradoxoTradwife ?? 0) + 14;
    meterDelta.compostura = (meterDelta.compostura ?? 0) - 8;
  }

  const usedTropes: string[] = [];
  if (/frankfurt|marxismo/.test(combined)) usedTropes.push("escola de frankfurt");
  if (/babá|fabrício|marido/.test(combined)) usedTropes.push("3 babas e marido sc");
  if (/hotmart|mentoria|197|cupom/.test(combined)) usedTropes.push("mentoria hotmart");
  if (/bento|matcha/.test(combined)) usedTropes.push("prof bento");
  if (/vavá|rodeio/.test(combined)) usedTropes.push("dr vava");
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
      { error: "Muitas tentativas na portaria do Gabinete 222. Aguarde um pouco." },
      429
    );
  }

  let body: { accessCode?: string };
  try {
    body = await c.req.json();
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
    body = await c.req.json();
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

  if (typeof body.sdp !== "string" || !body.sdp.includes("v=0")) {
    return c.json({ error: "SDP offer WebRTC ausente ou inválido." }, 400);
  }

  if (!c.env.OPENAI_API_KEY) {
    console.error(
      JSON.stringify({ event: "missing_openai_key", path: "/api/live/session" })
    );
    return c.json({ error: "OPENAI_API_KEY não configurada no servidor." }, 500);
  }

  const voice = parseLiveVoice(
    body.voice,
    c.env.DEFAULT_VOICE || DEFAULT_LIVE_VOICE
  );
  const model = c.env.GPT_LIVE_MODEL || "gpt-live-1.1";
  const recentHistory = sanitizeHistory(body.history, 8);
  const ledger = sanitizeLedger(body.ledger);
  const instructions = buildLiveInstructions(recentHistory, ledger);

  const attemptSession = async (includeStandby: boolean) => {
    const sessionConfig: Record<string, unknown> = {
      model,
      instructions,
      audio: {
        output: {
          voice: formatLiveVoiceParam(voice),
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
    });
  };

  try {
    let upstream = await attemptSession(true);
    let rawText = await upstream.text();
    let standbyEnabled = true;

    if (!upstream.ok && (upstream.status === 400 || upstream.status === 422)) {
      standbyEnabled = false;
      upstream = await attemptSession(false);
      rawText = await upstream.text();
    }

    if (!upstream.ok) {
      return c.json(
        {
          error: "Falha ao inicializar conversa por voz com a OpenAI.",
          status: upstream.status,
          detail: rawText.slice(0, 400),
        },
        upstream.status >= 400 && upstream.status < 600
          ? (upstream.status as 400)
          : 502
      );
    }

    const parsed = JSON.parse(rawText) as {
      session?: Record<string, unknown>;
      transport?: { type?: string; sdp?: string };
    };

    return c.json(
      {
        session: parsed.session,
        transport: parsed.transport,
        model,
        voice,
        standbyEnabled,
      },
      201
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "live_session_exception",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json({ error: "Erro interno ao negociar conexão de voz." }, 502);
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
    body = await c.req.json();
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
    return c.json({ error: "OPENAI_API_KEY não configurada no servidor." }, 500);
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
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return c.json(
        {
          error: "Falha ao conversar com a Deputada Clarice.",
          detail: errText.slice(0, 300),
        },
        502
      );
    }

    if (wantsStream && upstream.body) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const reader = upstream.body.getReader();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          let fullText = "";

          const sendEvent = (event: string, data: unknown) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          };

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line.startsWith("data:")) continue;
                const dataStr = line.slice(5).trim();
                if (!dataStr || dataStr === "[DONE]") continue;

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
                  }
                } catch {
                  // ignore non-JSON SSE comments
                }
              }
            }
          } catch (err) {
            sendEvent("error", {
              error: err instanceof Error ? err.message : "Erro de streaming",
            });
          } finally {
            const finalReply =
              fullText.trim() ||
              "Ai, meu bem, deu uma piscada aqui no ring light do gabinete. Pode repetir o que você falou?";
            sendEvent("done", { reply: finalReply, model: textModel });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const raw = await upstream.text();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const reply =
      extractResponseText(parsed) ||
      "Ai, meu bem, deu uma piscada aqui no ring light do gabinete. Pode repetir o que você falou?";

    return c.json({ reply, model: textModel });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "text_chat_exception",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return c.json({ error: "Erro interno ao conversar com a Deputada." }, 502);
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
    body = await c.req.json();
  } catch {
    return c.json({ error: "Payload JSON inválido." }, 400);
  }

  const authorized = await verifyAccessCode(body.accessCode, c.env.ACCESS_CODE);
  if (!authorized) {
    return c.json({ error: "Senha de gabinete inválida." }, 401);
  }

  const userMessage =
    typeof body.userMessage === "string" ? body.userMessage.trim().slice(0, 800) : "";
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

  const model = c.env.OPENAI_TEXT_MODEL || "gpt-6-luna";

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
        max_output_tokens: 1800,
      }),
    });

    if (!upstream.ok) {
      return c.json({
        patch: buildFallbackDirectorPatch(userMessage, assistantReply, ledger),
        source: "fallback",
      });
    }

    const parsed = (await upstream.json()) as Record<string, unknown>;
    const rawJsonText = extractResponseText(parsed);
    const patch = sanitizeDirectorPatch(JSON.parse(rawJsonText));
    return c.json({ patch, source: "model" });
  } catch {
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
};
