export type AvatarMood =
  | "neutro"
  | "falando"
  | "reels"
  | "crise"
  | "livro"
  | "celular";

export type ScenarioId =
  | "livre"
  | "paradoxo_tradwife"
  | "professor_historia"
  | "mentoria_hotmart"
  | "guerra_corredor";

export type DramaticAct = 1 | 2 | 3;

export interface CabinetMeters {
  cortesVirais: number;        // 0..100
  paradoxoTradwife: number;    // 0..100
  faturamentoHotmartK: number; // R$ 0k..500k
  compostura: number;          // 0..100
}

export interface SuggestedMove {
  id: string;
  label: string;
  prompt: string;
  tone: "acordo" | "pressao" | "blefe";
}

export interface ReelsCorteAction {
  type: "gravar_corte_reels";
  tituloViral: string;
  viewsEstimadas: string;
  legendaCorte: string;
  hashtag: string;
}

export interface DenunciaEscolaAction {
  type: "protocolar_denuncia_escola";
  protocolo: string;
  instituicao: string;
  acusacaoAbsurda: string;
  penalidadeProposta: string;
}

export interface OfertaHotmartAction {
  type: "lancar_oferta_hotmart";
  nomeProduto: string;
  valorFaturadoK: number;
  parcela: string;
  cupom: string;
  modulosBonus: string;
}

export type DocumentAction =
  | ReelsCorteAction
  | DenunciaEscolaAction
  | OfertaHotmartAction;

export type CabinetAction =
  | { type: "none" }
  | DocumentAction
  | { type: "bater_livro_mesa"; motivo: string }
  | { type: "ligar_ring_light_silenciar"; segundos: number; motivo: string };

export interface CabinetDocument {
  id: string;
  createdAt: string;
  turn: number;
  action: DocumentAction;
}

export interface BackstageInterrupt {
  id: string;
  source:
    | "marido_zap"
    | "hotmart"
    | "social_media"
    | "corredor_bento"
    | "recado_vava"
    | "flagra_x"
    | "invasao_jeremias";
  badge: string;
  headline: string;
  chatSystemNote: string;
  liveInstruction: string;
  liveCommentary: string;
  mood: AvatarMood;
  meterDelta?: Partial<CabinetMeters>;
  minTurn?: number;
  minParadoxo?: number;
  minCortes?: number;
  maxCompostura?: number;
}

export interface DirectorPatch {
  mood: AvatarMood;
  meterDelta: Partial<CabinetMeters>;
  action: CabinetAction;
  usedTropes: string[];
  newFacts: string[];
  suggestedMoves: SuggestedMove[];
  headlineTicker?: string;
}

export type SessionEndReason =
  | "vitoria"
  | "expulso"
  | "paradoxo_explodiu"
  | "manual";

export interface SessionLedger {
  scenarioId: ScenarioId;
  turnCount: number;
  act: DramaticAct;
  meters: CabinetMeters;
  facts: string[];
  recentTropes: string[];
  documents: CabinetDocument[];
  triggeredInterruptIds: string[];
  suggestedMoves: SuggestedMove[];
  headlineTicker: string;
  cortesGravados: number;
  ringLightCutsCount: number;
  bestQuote: { text: string; mood: AvatarMood } | null;
  endedReason?: SessionEndReason;
  endedTitle?: string;
  endedSummary?: string;
}

export interface VisitorArchetype {
  id: string;
  title: string;
  subtitle: string;
  stamp: string;
}

const VALID_MOODS = new Set<AvatarMood>([
  "neutro",
  "falando",
  "reels",
  "crise",
  "livro",
  "celular",
]);

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function computeDramaticAct(
  turnCount: number,
  meters: CabinetMeters
): DramaticAct {
  if (
    turnCount >= 7 ||
    meters.paradoxoTradwife >= 75 ||
    meters.compostura <= 25 ||
    meters.faturamentoHotmartK >= 220
  ) {
    return 3;
  }
  if (
    turnCount >= 3 ||
    meters.paradoxoTradwife >= 45 ||
    meters.cortesVirais >= 65 ||
    meters.faturamentoHotmartK >= 60
  ) {
    return 2;
  }
  return 1;
}

export function isDocumentAction(
  action: CabinetAction
): action is DocumentAction {
  return (
    action.type === "gravar_corte_reels" ||
    action.type === "protocolar_denuncia_escola" ||
    action.type === "lancar_oferta_hotmart"
  );
}

export function sanitizeDirectorPatch(raw: unknown): DirectorPatch {
  const obj =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  const mood: AvatarMood =
    typeof obj.mood === "string" && VALID_MOODS.has(obj.mood as AvatarMood)
      ? (obj.mood as AvatarMood)
      : "falando";

  const rawDelta =
    typeof obj.meterDelta === "object" && obj.meterDelta !== null
      ? (obj.meterDelta as Record<string, unknown>)
      : {};

  const meterDelta: Partial<CabinetMeters> = {};
  if (
    typeof rawDelta.cortesVirais === "number" &&
    Number.isFinite(rawDelta.cortesVirais)
  ) {
    meterDelta.cortesVirais = clamp(Math.round(rawDelta.cortesVirais), -25, 30);
  }
  if (
    typeof rawDelta.paradoxoTradwife === "number" &&
    Number.isFinite(rawDelta.paradoxoTradwife)
  ) {
    meterDelta.paradoxoTradwife = clamp(
      Math.round(rawDelta.paradoxoTradwife),
      -20,
      35
    );
  }
  if (
    typeof rawDelta.faturamentoHotmartK === "number" &&
    Number.isFinite(rawDelta.faturamentoHotmartK)
  ) {
    meterDelta.faturamentoHotmartK = clamp(
      Math.round(rawDelta.faturamentoHotmartK),
      -30,
      140
    );
  }
  if (
    typeof rawDelta.compostura === "number" &&
    Number.isFinite(rawDelta.compostura)
  ) {
    meterDelta.compostura = clamp(Math.round(rawDelta.compostura), -35, 25);
  }

  let action: CabinetAction = { type: "none" };
  const rawAction =
    typeof obj.action === "object" && obj.action !== null
      ? (obj.action as Record<string, unknown>)
      : null;

  if (rawAction && typeof rawAction.type === "string") {
    switch (rawAction.type) {
      case "gravar_corte_reels": {
        action = {
          type: "gravar_corte_reels",
          tituloViral: String(
            rawAction.tituloViral ||
              "DEPUTADA DESTRÓI CARTILHA DE FRANKFURT AO VIVO NO GABINETE!"
          )
            .toUpperCase()
            .slice(0, 110),
          viewsEstimadas: String(rawAction.viewsEstimadas || "1,3 MI").slice(
            0,
            24
          ),
          legendaCorte: String(
            rawAction.legendaCorte ||
              "Assista até o final pra ver o silêncio constrangedor quando eu mostrei os fatos históricos! Link da Mentoria na bio."
          ).slice(0, 210),
          hashtag: String(
            rawAction.hashtag || "#GuerraCultural #FamiliaTradicional"
          ).slice(0, 64),
        };
        break;
      }
      case "protocolar_denuncia_escola": {
        action = {
          type: "protocolar_denuncia_escola",
          protocolo: String(
            rawAction.protocolo ||
              `ESD-${Math.floor(1000 + Math.random() * 8999)}/2026`
          ).slice(0, 32),
          instituicao: String(
            rawAction.instituicao || "Colégio Estadual & Departamento de Humanas"
          ).slice(0, 100),
          acusacaoAbsurda: String(
            rawAction.acusacaoAbsurda ||
              "Uso suspeito de Marxismo Cultural em exercício de regra de três e citação não autorizada da Revolução Francesa sem elogiar a família."
          ).slice(0, 220),
          penalidadeProposta: String(
            rawAction.penalidadeProposta ||
              "Substituição imediata da disciplina por 40h de Etiqueta Doméstica, Costura e Finanças do Lar."
          ).slice(0, 180),
        };
        break;
      }
      case "lancar_oferta_hotmart": {
        const valorFaturadoK = clamp(
          Math.round(Number(rawAction.valorFaturadoK) || 45),
          10,
          140
        );
        action = {
          type: "lancar_oferta_hotmart",
          nomeProduto: String(
            rawAction.nomeProduto ||
              "Mentoria Esposa de Alto Valor + Guia Contra a Subversão"
          ).slice(0, 110),
          valorFaturadoK,
          parcela: String(rawAction.parcela || "12x de R$ 197,00").slice(0, 36),
          cupom: String(rawAction.cupom || "FAMILIA10").toUpperCase().slice(0, 28),
          modulosBonus: String(
            rawAction.modulosBonus ||
              "Bônus exclusivo: Módulo 'Pão de Fermentação Natural que a Babá Assa' + planilha de como mandar no marido parecendo submissa."
          ).slice(0, 220),
        };
        break;
      }
      case "bater_livro_mesa": {
        action = {
          type: "bater_livro_mesa",
          motivo: String(
            rawAction.motivo ||
              "Leia a página 42 do meu livro antes de repetir cartilha de DCE!"
          ).slice(0, 110),
        };
        break;
      }
      case "ligar_ring_light_silenciar": {
        action = {
          type: "ligar_ring_light_silenciar",
          segundos: clamp(Math.round(Number(rawAction.segundos) || 5), 3, 8),
          motivo: String(
            rawAction.motivo ||
              "Silêncio agora que o Enzo ligou o Ring Light pro meu corte de 60 segundos!"
          ).slice(0, 120),
        };
        break;
      }
      default:
        action = { type: "none" };
    }
  }

  const usedTropes = Array.isArray(obj.usedTropes)
    ? obj.usedTropes
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((s) => s.trim().toLowerCase().slice(0, 40))
        .slice(0, 5)
    : [];

  const newFacts = Array.isArray(obj.newFacts)
    ? obj.newFacts
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((s) => s.trim().slice(0, 120))
        .slice(0, 3)
    : [];

  const suggestedMoves: SuggestedMove[] = Array.isArray(obj.suggestedMoves)
    ? obj.suggestedMoves
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
        )
        .slice(0, 3)
        .map((item, idx) => {
          const toneRaw = String(item.tone || "acordo");
          const tone: SuggestedMove["tone"] =
            toneRaw === "pressao" || toneRaw === "blefe" ? toneRaw : "acordo";
          const label = String(item.label || "").trim().slice(0, 48);
          const prompt = String(item.prompt || label).trim().slice(0, 160);
          return {
            id: `move-${Date.now()}-${idx}`,
            label,
            prompt,
            tone,
          };
        })
        .filter((m) => m.label.length > 0 && m.prompt.length > 0)
    : [];

  const headlineTicker =
    typeof obj.headlineTicker === "string" && obj.headlineTicker.trim().length > 0
      ? obj.headlineTicker.trim().slice(0, 120)
      : undefined;

  return {
    mood,
    meterDelta,
    action,
    usedTropes,
    newFacts,
    suggestedMoves,
    headlineTicker,
  };
}

export function evaluateSessionOutcome(
  ledger: SessionLedger,
  nextMeters: CabinetMeters,
  nextTurn: number,
  documents: CabinetDocument[]
): {
  endedReason?: SessionEndReason;
  endedTitle?: string;
  endedSummary?: string;
  justEnded: boolean;
} {
  if (ledger.endedReason) {
    return {
      endedReason: ledger.endedReason,
      endedTitle: ledger.endedTitle,
      endedSummary: ledger.endedSummary,
      justEnded: false,
    };
  }

  if (nextMeters.compostura <= 0) {
    return {
      endedReason: "expulso",
      endedTitle: "Live Encerrada & Nome no Canal de Denúncias!",
      endedSummary:
        "A compostura tradicional da Deputada Clarice zerou. O Enzo desligou seu microfone, recortou o clipe pro Reels e protocolou seu nome no Canal Escola Sem Doutrinação.",
      justEnded: true,
    };
  }

  if (
    ledger.scenarioId === "paradoxo_tradwife" &&
    nextMeters.paradoxoTradwife >= 85
  ) {
    return {
      endedReason: "vitoria",
      endedTitle: "Paradoxo Tradwife Exposto em Rede Nacional!",
      endedSummary:
        "Você encurralou a Deputada entre as 3 babás em SC, o marido no WhatsApp e o salário de Brasília. O print já está nos Trending Topics!",
      justEnded: true,
    };
  }

  if (
    ledger.scenarioId === "professor_historia" &&
    nextMeters.cortesVirais >= 75
  ) {
    return {
      endedReason: "vitoria",
      endedTitle: "Aula Salva! Selo de Professor Isento Conquistado!",
      endedSummary:
        "Por milagre retórico, você convenceu a Deputada Clarice de que sua aula de Revolução Francesa defende os valores da família (e ganhou um cupom de 10% do livro dela).",
      justEnded: true,
    };
  }

  if (
    ledger.scenarioId === "mentoria_hotmart" &&
    (nextMeters.faturamentoHotmartK >= 180 ||
      (nextTurn >= 2 &&
        nextMeters.faturamentoHotmartK >= 140 &&
        documents.some((d) => d.action.type === "lancar_oferta_hotmart")))
  ) {
    return {
      endedReason: "vitoria",
      endedTitle: "Carrinho Hotmart Explodiu — Turma VIP Fechada!",
      endedSummary: `Você destravou R$ ${nextMeters.faturamentoHotmartK}k no funil da Mentoria Esposa de Alto Valor (com direito ao módulo secreto da babá!).`,
      justEnded: true,
    };
  }

  if (ledger.scenarioId === "guerra_corredor" && documents.length >= 2) {
    return {
      endedReason: "vitoria",
      endedTitle: "Pacto do Quarteto Caótico Selado no Anexo IV!",
      endedSummary:
        "Você arrancou 2 atos oficiais da Deputada Clarice, neutralizou o Prof. Bento e o megafone do Cabo Jeremias no corredor e voltou pro Gabinete 412 do Dr. Vavá com a pauta fechada!",
      justEnded: true,
    };
  }

  if (
    ledger.scenarioId !== "paradoxo_tradwife" &&
    nextMeters.paradoxoTradwife >= 100
  ) {
    return {
      endedReason: "paradoxo_explodiu",
      endedTitle: "Crise no Story: O Marido Apareceu no Fundo da Live!",
      endedSummary:
        "A contradição tradwife passou do limite: o Dr. Fabrício ligou ao vivo perguntando da papinha das crianças em SC e o Enzo teve que derrubar a transmissão.",
      justEnded: true,
    };
  }

  return { justEnded: false };
}

export function applyBackstageInterrupt(
  ledger: SessionLedger,
  interrupt: BackstageInterrupt
): {
  nextLedger: SessionLedger;
  justEnded: boolean;
} {
  const delta = interrupt.meterDelta ?? {};
  const nextMeters: CabinetMeters = {
    cortesVirais: clamp(
      ledger.meters.cortesVirais + (delta.cortesVirais ?? 0),
      0,
      100
    ),
    paradoxoTradwife: clamp(
      ledger.meters.paradoxoTradwife + (delta.paradoxoTradwife ?? 0),
      0,
      100
    ),
    faturamentoHotmartK: clamp(
      ledger.meters.faturamentoHotmartK + (delta.faturamentoHotmartK ?? 0),
      0,
      500
    ),
    compostura: clamp(
      ledger.meters.compostura + (delta.compostura ?? 0),
      0,
      100
    ),
  };

  const nextAct = computeDramaticAct(ledger.turnCount, nextMeters);
  const outcome = evaluateSessionOutcome(
    ledger,
    nextMeters,
    ledger.turnCount,
    ledger.documents
  );

  const triggeredInterruptIds = ledger.triggeredInterruptIds.includes(
    interrupt.id
  )
    ? ledger.triggeredInterruptIds
    : [...ledger.triggeredInterruptIds, interrupt.id];

  return {
    nextLedger: {
      ...ledger,
      act: nextAct,
      meters: nextMeters,
      triggeredInterruptIds,
      headlineTicker: interrupt.headline,
      endedReason: outcome.endedReason,
      endedTitle: outcome.endedTitle,
      endedSummary: outcome.endedSummary,
    },
    justEnded: outcome.justEnded,
  };
}

export function applyDirectorPatch(
  ledger: SessionLedger,
  patch: DirectorPatch,
  assistantReply: string,
  nowLabel: string
): {
  nextLedger: SessionLedger;
  firedAction: CabinetAction;
  newDocument: CabinetDocument | null;
  justEnded: boolean;
} {
  const nextTurn = ledger.turnCount + 1;

  let extraHotmart = 0;
  if (
    patch.action.type === "lancar_oferta_hotmart" &&
    (!patch.meterDelta.faturamentoHotmartK ||
      patch.meterDelta.faturamentoHotmartK <= 0)
  ) {
    extraHotmart = patch.action.valorFaturadoK;
  }

  const nextMeters: CabinetMeters = {
    cortesVirais: clamp(
      ledger.meters.cortesVirais + (patch.meterDelta.cortesVirais ?? 0),
      0,
      100
    ),
    paradoxoTradwife: clamp(
      ledger.meters.paradoxoTradwife + (patch.meterDelta.paradoxoTradwife ?? 0),
      0,
      100
    ),
    faturamentoHotmartK: clamp(
      ledger.meters.faturamentoHotmartK +
        (patch.meterDelta.faturamentoHotmartK ?? 0) +
        extraHotmart,
      0,
      500
    ),
    compostura: clamp(
      ledger.meters.compostura + (patch.meterDelta.compostura ?? 0),
      0,
      100
    ),
  };

  const nextAct = computeDramaticAct(nextTurn, nextMeters);

  // Merge facts deduplicated (keep latest 10)
  const factSet = new Set(ledger.facts.map((f) => f.toLowerCase()));
  const mergedFacts = [...ledger.facts];
  for (const fact of patch.newFacts) {
    if (!factSet.has(fact.toLowerCase())) {
      factSet.add(fact.toLowerCase());
      mergedFacts.push(fact);
    }
  }
  const facts = mergedFacts.slice(-10);

  // Sliding cooldown window of last 8 tropes
  const tropeMerged = [...ledger.recentTropes];
  for (const trope of patch.usedTropes) {
    const existingIdx = tropeMerged.indexOf(trope);
    if (existingIdx !== -1) tropeMerged.splice(existingIdx, 1);
    tropeMerged.push(trope);
  }
  const recentTropes = tropeMerged.slice(-8);

  // Documents
  let newDocument: CabinetDocument | null = null;
  const documents = [...ledger.documents];
  if (isDocumentAction(patch.action)) {
    newDocument = {
      id: `doc-${nextTurn}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: nowLabel,
      turn: nextTurn,
      action: patch.action,
    };
    documents.push(newDocument);
  }

  const cortesGravados =
    ledger.cortesGravados +
    (patch.action.type === "gravar_corte_reels" ? 1 : 0);
  const ringLightCutsCount =
    ledger.ringLightCutsCount +
    (patch.action.type === "ligar_ring_light_silenciar" ? 1 : 0);

  const trimmedReply = assistantReply.trim();
  const isStrongQuote =
    trimmedReply.length >= 45 &&
    trimmedReply.length <= 280 &&
    (patch.mood === "crise" ||
      patch.mood === "reels" ||
      patch.mood === "livro" ||
      !ledger.bestQuote);
  const bestQuote = isStrongQuote
    ? { text: trimmedReply, mood: patch.mood }
    : ledger.bestQuote;

  // Evaluate scenario outcomes
  const { endedReason, endedTitle, endedSummary, justEnded } =
    evaluateSessionOutcome(ledger, nextMeters, nextTurn, documents);

  const nextLedger: SessionLedger = {
    ...ledger,
    turnCount: nextTurn,
    act: nextAct,
    meters: nextMeters,
    facts,
    recentTropes,
    documents,
    suggestedMoves:
      patch.suggestedMoves.length > 0
        ? patch.suggestedMoves
        : ledger.suggestedMoves,
    headlineTicker: patch.headlineTicker || ledger.headlineTicker,
    cortesGravados,
    ringLightCutsCount,
    bestQuote,
    endedReason,
    endedTitle,
    endedSummary,
  };

  return {
    nextLedger,
    firedAction: patch.action,
    newDocument,
    justEnded,
  };
}

export function classifyVisitorArchetype(ledger: SessionLedger): VisitorArchetype {
  const hasHotmart = ledger.documents.some(
    (d) => d.action.type === "lancar_oferta_hotmart"
  );
  const hasReels = ledger.documents.some(
    (d) => d.action.type === "gravar_corte_reels"
  );
  const hasDenuncia = ledger.documents.some(
    (d) => d.action.type === "protocolar_denuncia_escola"
  );

  if (ledger.endedReason === "expulso") {
    return {
      id: "alvo_canal_denuncias",
      title: "Alvo do Canal de Denúncias",
      subtitle:
        "Teve o microfone cortado pelo Ring Light e acabou notificado por suspeita de Escola de Frankfurt.",
      stamp: "NOTIFICADO",
    };
  }
  if (ledger.meters.paradoxoTradwife >= 85) {
    return {
      id: "desmascarador_tradwife",
      title: "Desmascarador do Paradoxo Tradwife",
      subtitle:
        "Expôs as 3 babás em SC, o marido no WhatsApp e o salário de Brasília ao vivo no Gabinete 222.",
      stamp: "PARADOXO EXPOSTO",
    };
  }
  if (ledger.ringLightCutsCount >= 2 || hasDenuncia) {
    return {
      id: "alvo_canal_denuncias",
      title: "Alvo do Canal de Denúncias",
      subtitle:
        "Teve o microfone cortado pelo Ring Light e acabou notificado por suspeita de Escola de Frankfurt.",
      stamp: "NOTIFICADO",
    };
  }
  if (hasHotmart || ledger.meters.faturamentoHotmartK >= 180) {
    return {
      id: "aluno_vip_hotmart",
      title: "Aluno VIP da Mentoria Hotmart",
      subtitle: `Ajudou a girar R$ ${ledger.meters.faturamentoHotmartK}k no funil com cupom FAMILIA10 e saiu com certificado de feminilidade.`,
      stamp: "LINK NA BIO",
    };
  }
  if (hasReels || ledger.cortesGravados > 0) {
    return {
      id: "thumbnail_reels",
      title: "Thumbnail de Reels de 1 Milhão",
      subtitle:
        "Entrou para conversar e virou capa de vídeo em CAIXA ALTA no Instagram do Gabinete 222.",
      stamp: "VIROU CORTE",
    };
  }
  if (ledger.meters.cortesVirais >= 75) {
    return {
      id: "aliado_guerra_cultural",
      title: "Aliado da Guerra Cultural",
      subtitle:
        "Passou no teste da cartilha tradicional, tomou chá de camomila e ganhou o selo da Frente da Moral.",
      stamp: "SELO TRADICIONAL",
    };
  }
  return {
    id: "sobrevivente_chazinho",
    title: "Sobrevivente do Chazinho no Anexo IV",
    subtitle:
      "Visitou o Gabinete 222, desviou de três ofertas de curso online e saiu sem entrar no Canal de Denúncias.",
    stamp: "AUDIÊNCIA GRAVADA",
  };
}
