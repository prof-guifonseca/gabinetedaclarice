import { beforeEach, describe, expect, it } from "vitest";
import {
  CLARICE_GREETING,
  DEFAULT_LIVE_VOICE,
  buildLiveInstructions,
  buildTextInstructions,
  inferMoodFromText,
} from "../src/shared/persona";
import worker, {
  buildFallbackDirectorPatch,
  formatLiveVoiceParam,
  parseLiveVoice,
  resetRateLimitStore,
} from "../worker/index";
import { createInitialLedger } from "../src/shared/scenarios";

function createTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    GPT_LIVE_MODEL: "gpt-live-1.1",
    OPENAI_TEXT_MODEL: "gpt-6-luna",
    DEFAULT_VOICE: DEFAULT_LIVE_VOICE,
    OPENAI_API_KEY: "sk-test-dummy",
    ACCESS_CODE: "",
    ASSETS: {
      fetch: async () => new Response("<html>ok</html>", { status: 200 }),
    } as unknown as Fetcher,
    ...overrides,
  };
}

const dummyCtx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

beforeEach(() => {
  resetRateLimitStore();
});

describe("Mente da Clarice (antifeminismo satírico, Trinca Caótica & voz feminina customizada)", () => {
  it("keeps opening greeting warm and spoiler-free", () => {
    expect(CLARICE_GREETING).toContain("Gabinete 222");
    expect(CLARICE_GREETING).not.toContain("Frankfurt");
    expect(CLARICE_GREETING).not.toContain("Hotmart");
    expect(CLARICE_GREETING).not.toContain("babá");
  });

  it("embeds anti-prudence rule, 10 thematic blocks, and Trinca Caótica lore in Live and Text", () => {
    for (const prompt of [buildLiveInstructions(), buildTextInstructions()]) {
      expect(prompt).toContain("LEI ABSOLUTA ANTI-PRUDÊNCIA");
      expect(prompt).toContain("Escola de Frankfurt");
      expect(prompt).toContain("Mentoria Esposa de Alto Valor");
      expect(prompt).toContain("FAMILIA10");
      expect(prompt).toContain("3 babás");
      expect(prompt).toContain("Dr. Fabrício");
      expect(prompt).toContain("Prof. Bento");
      expect(prompt).toContain("Dr. Vavá");
      expect(prompt).toContain("Canal Escola Sem Doutrinação");
    }
    const liveWithHistory = buildLiveInstructions([
      { role: "user", content: "E o pão artesanal?" },
    ]);
    expect(liveWithHistory).toContain("CONTEXTO RECENTE");
    expect(liveWithHistory).toContain("E o pão artesanal?");
    expect(liveWithHistory).toContain("voz feminina articulada de 34 anos");
  });

  it("defaults live voice to DeputadaClariceBR34 ID and formats custom voices as { id }", () => {
    expect(DEFAULT_LIVE_VOICE).toBe("voice_6b09ff1be43c8191979b962ac464113d");
    expect(parseLiveVoice(DEFAULT_LIVE_VOICE, "tempo")).toBe(DEFAULT_LIVE_VOICE);
    expect(parseLiveVoice("invalid_voice", DEFAULT_LIVE_VOICE)).toBe(
      DEFAULT_LIVE_VOICE
    );
    expect(formatLiveVoiceParam(DEFAULT_LIVE_VOICE)).toEqual({
      id: DEFAULT_LIVE_VOICE,
    });
    expect(formatLiveVoiceParam("tempo")).toBe("tempo");
  });

  it("infers all 6 studio moods cleanly from complete replies", () => {
    expect(
      inferMoodFromText("O Dr. Fabrício mandou WhatsApp perguntando da babá!")
    ).toBe("celular");
    expect(
      inferMoodFromText("Usa o cupom FAMILIA10 na Mentoria da Hotmart, link na bio!")
    ).toBe("livro");
    expect(
      inferMoodFromText("Enzo, liga o ring light que esse corte vai bater 1 milhão no Reels!")
    ).toBe("reels");
    expect(
      inferMoodFromText("Isso é Marxismo Cultural da Escola de Frankfurt, vou denunciar!")
    ).toBe("crise");
    expect(
      inferMoodFromText("Vamos conversar com calma sobre os fatos históricos.")
    ).toBe("falando");
  });
});

describe("Gabinete da Clarice 2.0 Worker API", () => {
  it("GET /api/health returns v2.0 live/text models and custom voice without secrets", async () => {
    const req = new Request("https://gabinetedaclarice.pages.dev/api/health");
    const res = await worker.fetch(req, createTestEnv(), dummyCtx);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(data.version).toBe("2.0");
    expect(data.service).toBe("gabinetedaclarice");
    expect(data.liveModel).toBe("gpt-live-1.1");
    expect(data.textModel).toBe("gpt-6-luna");
    expect(data.defaultVoice).toBe(DEFAULT_LIVE_VOICE);
    expect(JSON.stringify(data)).not.toContain("sk-test-dummy");
  });

  it("POST /api/auth/verify validates ACCESS_CODE properly", async () => {
    const env = createTestEnv({ ACCESS_CODE: "gabinete222" });

    const badRes = await worker.fetch(
      new Request("https://gabinetedaclarice.pages.dev/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: "errada" }),
      }),
      env,
      dummyCtx
    );
    expect(badRes.status).toBe(401);

    const goodRes = await worker.fetch(
      new Request("https://gabinetedaclarice.pages.dev/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode: "gabinete222" }),
      }),
      env,
      dummyCtx
    );
    expect(goodRes.status).toBe(200);
    expect(await goodRes.json()).toEqual({ ok: true });
  });

  it("POST /api/live/session rejects invalid SDP and enforces ACCESS_CODE", async () => {
    const badSdp = await worker.fetch(
      new Request("https://gabinetedaclarice.pages.dev/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: "invalid" }),
      }),
      createTestEnv(),
      dummyCtx
    );
    expect(badSdp.status).toBe(400);

    const unauth = await worker.fetch(
      new Request("https://gabinetedaclarice.pages.dev/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n",
          accessCode: "errada",
        }),
      }),
      createTestEnv({ ACCESS_CODE: "gabinete222" }),
      dummyCtx
    );
    expect(unauth.status).toBe(401);
  });

  it("POST /api/chat rejects empty message with 400", async () => {
    const res = await worker.fetch(
      new Request("https://gabinetedaclarice.pages.dev/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "   " }),
      }),
      createTestEnv(),
      dummyCtx
    );
    expect(res.status).toBe(400);
  });

  it("POST /api/director returns heuristic fallback cleanly when no API key is configured", async () => {
    const ledger = createInitialLedger("mentoria_hotmart");
    const res = await worker.fetch(
      new Request("https://gabinetedaclarice.pages.dev/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Quero comprar a Mentoria com cupom!",
          assistantReply:
            "Perfeito, meu bem! Clica no link na bio da Hotmart e usa o cupom FAMILIA10 em 12x de R$ 197!",
          ledger,
        }),
      }),
      createTestEnv({ OPENAI_API_KEY: "" }),
      dummyCtx
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      source: string;
      patch: { action: { type: string }; mood: string };
    };
    expect(data.source).toBe("fallback");
    expect(data.patch.action.type).toBe("lancar_oferta_hotmart");
    expect(data.patch.mood).toBe("livro");
  });

  it("buildFallbackDirectorPatch triggers Ring Light silence when Clarice cuts the mic", () => {
    const ledger = createInitialLedger("paradoxo_tradwife");
    const patch = buildFallbackDirectorPatch(
      "E as 3 babás em SC?",
      "Silêncio agora que o Enzo ligou o ring light pro meu corte de 60 segundos!",
      ledger
    );
    expect(patch.action.type).toBe("ligar_ring_light_silenciar");
    expect(patch.meterDelta.paradoxoTradwife).toBeGreaterThan(0);
  });
});
