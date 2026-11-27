import { describe, expect, it } from "vitest";
import {
  applyDirectorPatch,
  classifyVisitorArchetype,
  computeDramaticAct,
  sanitizeDirectorPatch,
} from "../src/shared/gameState";
import {
  SCENARIOS,
  createInitialLedger,
  pickBackstageInterrupt,
} from "../src/shared/scenarios";
import {
  buildLiveInstructions,
  buildTextInstructions,
} from "../src/shared/persona";

describe("Cabinet State Engine & Scenarios (Gabinete da Clarice 2.0)", () => {
  it("initializes all 5 scenarios with distinct meters, first-person moves, and zero-spoiler openings", () => {
    for (const id of Object.keys(SCENARIOS) as Array<keyof typeof SCENARIOS>) {
      const ledger = createInitialLedger(id);
      expect(ledger.scenarioId).toBe(id);
      expect(ledger.act).toBe(1);
      expect(ledger.suggestedMoves.length).toBe(3);
      expect(ledger.headlineTicker.length).toBeGreaterThan(10);
    }
  });

  it("applies Hotmart offer patch, increments revenue, triggers victory and classifies Aluno VIP", () => {
    const start = createInitialLedger("mentoria_hotmart");
    const patch = sanitizeDirectorPatch({
      mood: "livro",
      meterDelta: {
        cortesVirais: 12,
        paradoxoTradwife: 5,
        faturamentoHotmartK: 0,
        compostura: 6,
      },
      action: {
        type: "lancar_oferta_hotmart",
        nomeProduto: "Mentoria Esposa de Alto Valor VIP",
        valorFaturadoK: 140,
        parcela: "12x de R$ 197,00",
        cupom: "FAMILIA10",
        modulosBonus: "Bônus: Pão artesanal que a babá assa em SC.",
      },
      usedTropes: ["mentoria hotmart", "pao artesanal"],
      newFacts: ["Visitante fechou pacote VIP com cupom FAMILIA10"],
      suggestedMoves: [
        {
          label: "💳 Fechar no PIX",
          prompt: "Fechado, Deputada! Vou passar o cupom FAMILIA10 agora mesmo!",
          tone: "acordo",
        },
      ],
      headlineTicker: "CARRINHO HOTMART EXPLODIU NO GABINETE 222",
    });

    const result = applyDirectorPatch(
      start,
      patch,
      "Link na bio com cupom FAMILIA10, meu bem!",
      "19:10"
    );

    expect(result.newDocument).not.toBeNull();
    expect(result.nextLedger.documents).toHaveLength(1);
    expect(result.nextLedger.meters.faturamentoHotmartK).toBe(185);
    expect(result.nextLedger.facts).toContain(
      "Visitante fechou pacote VIP com cupom FAMILIA10"
    );
    expect(result.nextLedger.recentTropes).toEqual([
      "mentoria hotmart",
      "pao artesanal",
    ]);
    expect(result.justEnded).toBe(true);
    expect(result.nextLedger.endedReason).toBe("vitoria");
    expect(classifyVisitorArchetype(result.nextLedger).id).toBe(
      "aluno_vip_hotmart"
    );
  });

  it("does NOT end mentoria_hotmart prematurely on Turn 1 with a small R$ 45k offer", () => {
    const start = createInitialLedger("mentoria_hotmart");
    const patch = sanitizeDirectorPatch({
      mood: "livro",
      meterDelta: { cortesVirais: 8, faturamentoHotmartK: 0, compostura: 4 },
      action: {
        type: "lancar_oferta_hotmart",
        nomeProduto: "Mentoria Esposa de Alto Valor",
        valorFaturadoK: 45,
        parcela: "12x de R$ 197,00",
        cupom: "FAMILIA10",
        modulosBonus: "Bônus da babá.",
      },
      usedTropes: ["hotmart"],
      newFacts: [],
      suggestedMoves: [],
    });

    const result = applyDirectorPatch(
      start,
      patch,
      "Usa o cupom FAMILIA10 na bio!",
      "19:11"
    );
    expect(result.nextLedger.meters.faturamentoHotmartK).toBe(90);
    expect(result.justEnded).toBe(false);
    expect(result.nextLedger.endedReason).toBeUndefined();
  });

  it("triggers Paradoxo Tradwife victory at 85%+ and prioritizes Desmascarador even if a denúncia occurred earlier", () => {
    const start = createInitialLedger("paradoxo_tradwife");
    start.meters.paradoxoTradwife = 68;
    start.documents = [
      {
        id: "doc-prior",
        createdAt: "19:08",
        turn: 1,
        action: {
          type: "protocolar_denuncia_escola",
          protocolo: "ESD-1234/2026",
          instituicao: "Colégio Estadual",
          acusacaoAbsurda: "Regra de três suspeita",
          penalidadeProposta: "Etiqueta doméstica",
        },
      },
    ];
    const patch = sanitizeDirectorPatch({
      mood: "celular",
      meterDelta: { paradoxoTradwife: 20, compostura: -10 },
      action: { type: "none" },
      usedTropes: ["3 babas"],
      newFacts: ["Marido confirmou 3 babás em Santa Catarina"],
      suggestedMoves: [],
    });

    const result = applyDirectorPatch(
      start,
      patch,
      "Eu apenas coordeno a logística familiar por WhatsApp com firmeza dócil!",
      "19:12"
    );
    expect(result.nextLedger.meters.paradoxoTradwife).toBe(88);
    expect(result.justEnded).toBe(true);
    expect(result.nextLedger.endedReason).toBe("vitoria");
    expect(classifyVisitorArchetype(result.nextLedger).id).toBe(
      "desmascarador_tradwife"
    );
  });

  it("expels visitor and classifies Alvo do Canal de Denúncias when compostura drops to zero", () => {
    const start = createInitialLedger("livre");
    start.meters.compostura = 10;
    const patch = sanitizeDirectorPatch({
      mood: "crise",
      meterDelta: { compostura: -25, paradoxoTradwife: 10 },
      action: {
        type: "ligar_ring_light_silenciar",
        segundos: 5,
        motivo: "Enzo, liga o Ring Light e silencia o microfone!",
      },
      usedTropes: ["ring light"],
      newFacts: [],
      suggestedMoves: [],
    });

    const result = applyDirectorPatch(
      start,
      patch,
      "Fica quietinho que o Enzo ligou o Ring Light pro meu corte!",
      "19:15"
    );
    expect(result.nextLedger.meters.compostura).toBe(0);
    expect(result.nextLedger.endedReason).toBe("expulso");
    expect(classifyVisitorArchetype(result.nextLedger).id).toBe(
      "alvo_canal_denuncias"
    );
  });

  it("escalates acts, picks non-duplicate interrupts, and injects cooldown + facts into prompts", () => {
    const ledger = createInitialLedger("guerra_corredor");
    expect(computeDramaticAct(1, ledger.meters)).toBe(1);
    expect(computeDramaticAct(4, { ...ledger.meters, paradoxoTradwife: 50 })).toBe(2);
    expect(computeDramaticAct(7, { ...ledger.meters, paradoxoTradwife: 80 })).toBe(3);

    ledger.turnCount = 3;
    const first = pickBackstageInterrupt(ledger);
    expect(first).not.toBeNull();
    ledger.triggeredInterruptIds.push(first!.id);
    ledger.turnCount = 6;
    const second = pickBackstageInterrupt(ledger);
    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(first!.id);

    ledger.facts = ["Dr. Vavá ofereceu relatoria da Comissão de Costumes"];
    ledger.recentTropes = ["escola de frankfurt", "prof bento"];
    ledger.meters.compostura = 20;

    for (const prompt of [
      buildTextInstructions(ledger),
      buildLiveInstructions([], ledger),
    ]) {
      expect(prompt).toContain("Batalha do Anexo IV");
      expect(prompt).toContain("COOLDOWN OBRIGATÓRIO");
      expect(prompt).toContain("escola de frankfurt, prof bento");
      expect(prompt).toContain("Dr. Vavá ofereceu relatoria");
      expect(prompt).toContain("COMPOSTURA TRADICIONAL ESTÁ POR UM FIO");
    }
  });
});
