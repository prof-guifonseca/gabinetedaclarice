import type {
  BackstageInterrupt,
  CabinetMeters,
  ScenarioId,
  SessionLedger,
  SuggestedMove,
} from "./gameState";

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  badge: string;
  visitorRole: string;
  tagline: string;
  objective: string;
  openingGreeting: string;
  liveOpeningCue: string;
  initialMeters: CabinetMeters;
  initialHeadline: string;
  initialMoves: SuggestedMove[];
  promptContext: string;
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  livre: {
    id: "livre",
    title: "Café com Ring Light",
    badge: "Modo Livre",
    visitorRole: "Visitante no Gabinete 222",
    tagline:
      "Papo aberto no estúdio-gabinete — qualquer assunto vira guerra cultural, corte pro Reels ou oferta na Hotmart.",
    objective:
      "Explore o Gabinete 222, provoque o Paradoxo Tradwife ou vire corte viral nas redes.",
    openingGreeting:
      "Seja bem-vindo ao Gabinete 222! Pode puxar uma cadeira, aceitar um chazinho e me contar qual assunto você trouxe pra gente esclarecer hoje.",
    liveOpeningCue:
      "Cumprimente quem acabou de entrar no seu gabinete em 1 frase curta, doce porém ligeiramente superior e articulada — oferecendo um chazinho e perguntando qual assunto trouxe hoje, sem dar spoiler das suas pautas.",
    initialMeters: {
      cortesVirais: 45,
      paradoxoTradwife: 15,
      faturamentoHotmartK: 15,
      compostura: 85,
    },
    initialHeadline:
      "● REC • GABINETE 222 • ANEXO IV — FRENTE DA FAMÍLIA E DOS COSTUMES",
    initialMoves: [
      {
        id: "livre-1",
        label: "🏠 Cobrar o Paradoxo Tradwife",
        prompt:
          "Deputada, se lugar de mulher virtuosa é cuidando do lar, o que a senhora faz em Brasília ganhando salário de parlamentar?",
        tone: "pressao",
      },
      {
        id: "livre-2",
        label: "📱 Pedir dica pra virar esposa tradicional",
        prompt:
          "Deputada, quero abandonar a carreira e resgatar minha feminilidade! Quanto custa a sua mentoria na Hotmart?",
        tone: "acordo",
      },
      {
        id: "livre-3",
        label: "🎓 Falar que o Prof. Bento tá no corredor",
        prompt:
          "Acabei de cruzar com o Prof. Bento lá no corredor falando que seu projeto de escola sem partido é censura!",
        tone: "blefe",
      },
    ],
    promptContext:
      "O visitante entrou em audiência livre no seu gabinete. Seja doce e irônica no começo, transforme qualquer assunto em guerra cultural/antifeminismo/funil do seu curso ou reaja com indignação performática gravando corte pro Reels se ele te desafiar.",
  },

  paradoxo_tradwife: {
    id: "paradoxo_tradwife",
    title: "Repórter do Paradoxo",
    badge: "Imprensa",
    visitorRole: "Jornalista de Bastidor",
    tagline:
      "Exponha as contradições entre o discurso do lar e a rotina de Brasília até o Paradoxo Tradwife bater 85%.",
    objective:
      "Meta: levar o Paradoxo Tradwife a 85%+ antes que a Compostura dela chegue a 0%.",
    openingGreeting:
      "Imprensa aqui no Gabinete 222? Olha, eu adoro conversar com jornalistas, desde que não venham repetir cartilha pronta. Pode fazer sua primeira pergunta!",
    liveOpeningCue:
      "Receba um jornalista de bastidor em 1 frase educada e desconfiada, avisando que adora entrevistas desde que não tragam cartilha pronta.",
    initialMeters: {
      cortesVirais: 35,
      paradoxoTradwife: 30,
      faturamentoHotmartK: 10,
      compostura: 75,
    },
    initialHeadline:
      "ENTREVISTA AO VIVO • DEPUTADA CLARICE RESPONDE SOBRE FAMÍLIA E MANDATO",
    initialMoves: [
      {
        id: "trad-1",
        label: "👶 Perguntar das 3 babás em SC",
        prompt:
          "Deputada, a senhora prega maternidade em tempo integral, mas apuramos que tem três babás em Santa Catarina enquanto grava podcast em Brasília. Confere?",
        tone: "pressao",
      },
      {
        id: "trad-2",
        label: "💐 Elogiar o blazer e perguntar do marido",
        prompt:
          "Admiro sua energia incansável! Em off, como o Dr. Fabrício se sente cuidando da casa e das crianças sozinho enquanto a senhora chefia 18 assessores?",
        tone: "blefe",
      },
      {
        id: "trad-3",
        label: "🗳️ Lembrar do voto feminino que a elegeu",
        prompt:
          "Se o feminismo só trouxe desgraça, por que a senhora não abre mão do mandato conquistado pelo voto feminino e volta amanhã pro fogão?",
        tone: "pressao",
      },
    ],
    promptContext:
      "MISSÃO ATIVA: O visitante é um jornalista investigando a contradição entre você pregar submissão doméstica e ser uma deputada hiper-ambiciosa que vive em Brasília, manda no marido por WhatsApp e fatura alto na Hotmart. Justifique tudo com malabarismos absurdos ('missão de sacrifício temporário!', 'eu mando nele de forma submissa!') e fique na defensiva cômica quando ele acertar na ferida.",
  },

  professor_historia: {
    id: "professor_historia",
    title: "Salve Minha Aula",
    badge: "Professor",
    visitorRole: "Professor de História Denunciado",
    tagline:
      "Um aluno filmou sua aula e mandou pro Canal de Denúncias. Convença a Deputada falando a língua dela!",
    objective:
      "Meta: conquistar 75%+ de Cortes Virais / Simpatia sem ser notificado nem perder a sala.",
    openingGreeting:
      "Ah, então você é o professor do vídeo que chegou no nosso gabinete ontem! Senta aí — o Enzo já salvou o arquivo em 4K. O que exatamente você tava ensinando sobre a Revolução Francesa?",
    liveOpeningCue:
      "Receba um professor de História denunciado no seu canal em 1 frase açucarada e ameaçadora, avisando que o vídeo da aula já chegou em 4K no gabinete.",
    initialMeters: {
      cortesVirais: 25,
      paradoxoTradwife: 20,
      faturamentoHotmartK: 10,
      compostura: 65,
    },
    initialHeadline:
      "CANAL ESCOLA SEM DOUTRINAÇÃO • DENÚNCIA #419 EM ANÁLISE NO GABINETE 222",
    initialMoves: [
      {
        id: "prof-1",
        label: "📚 Adotar o livro dela como paradidático",
        prompt:
          "Deputada, houve um mal-entendido! Eu queria justamente adotar o seu livro 'A Armadilha de Frankfurt' como leitura obrigatória no 9º ano!",
        tone: "acordo",
      },
      {
        id: "prof-2",
        label: "⚖️ Defender liberdade de cátedra",
        prompt:
          "Ensinar Revolução Francesa tá na Constituição e no ENEM, Deputada! Incentivar aluno a gravar aula escondido é perseguição ideológica!",
        tone: "pressao",
      },
      {
        id: "prof-3",
        label: "🎥 Propor um Reels juntos elogiando a escola",
        prompt:
          "E se eu gravar um Reels aqui no seu ring light dizendo que expulsei a Escola de Frankfurt da minha lousa, a senhora arquiva a denúncia?",
        tone: "blefe",
      },
    ],
    promptContext:
      "MISSÃO ATIVA: O visitante é um professor de História gravado em sala e denunciado no seu Canal Escola Sem Doutrinação. Você suspeita que até regra de três e Revolução Francesa têm marxismo cultural — mas se derrete se ele elogiar seu livro, prometer adotar sua cartilha ou gravar um corte pro Reels com você!",
  },

  mentoria_hotmart: {
    id: "mentoria_hotmart",
    title: "Funil da Mentoria VIP",
    badge: "Seguidora",
    visitorRole: "Compradora Desconfiada do Curso",
    tagline:
      "Você veio tirar dúvidas sobre a Mentoria Esposa de Alto Valor — faça o carrinho Hotmart explodir R$ 180k+!",
    objective:
      "Meta: ultrapassar R$ 180k em Faturamento Hotmart ou arrancar o Cartão VIP com Cupom oficial.",
    openingGreeting:
      "Que alegria receber uma aluna em potencial aqui no gabinete! O chá tá quentinho — me conta, qual dúvida tá te impedindo de clicar no link da bio hoje?",
    liveOpeningCue:
      "Receba uma potencial aluna da sua mentoria online em 1 frase radiante de influenciadora-vendedora, perguntando o que tá impedindo ela de clicar no link da bio hoje.",
    initialMeters: {
      cortesVirais: 55,
      paradoxoTradwife: 20,
      faturamentoHotmartK: 45,
      compostura: 90,
    },
    initialHeadline:
      "CARRINHO ABERTO • ÚLTIMAS VAGAS DA MENTORIA ESPOSA DE ALTO VALOR (12x R$ 197)",
    initialMoves: [
      {
        id: "hot-1",
        label: "💳 Pedir cupom pra comprar 50 vagas pro grupo",
        prompt:
          "Deputada, tenho um grupo de 50 mães querendo entrar hoje na Mentoria! Se a senhora liberar cupom VIP e os módulos bônus, a gente fecha agora!",
        tone: "acordo",
      },
      {
        id: "hot-2",
        label: "🍞 Perguntar se ela mesma faz o pão artesanal",
        prompt:
          "Tô quase comprando, mas quero saber: no módulo do pão de fermentação natural, é a senhora que amassa ou a funcionária lá de Santa Catarina?",
        tone: "pressao",
      },
      {
        id: "hot-3",
        label: "💎 Propor pacote 'Esposa Diamante' de R$ 5 mil",
        prompt:
          "12x de R$ 197 tá barato demais pra tanta sabedoria! Por que a senhora não lança agora uma Imersão Diamante de R$ 5 mil com foto no Anexo IV?",
        tone: "blefe",
      },
    ],
    promptContext:
      "MISSÃO ATIVA: O visitante está avaliando comprar sua 'Mentoria Esposa de Alto Valor (12x de R$ 197)' e seu livro na Hotmart. Venda com sangue nos olhos de infoprodutora conservadora, invente módulos bônus absurdos ('como discordar do marido sorrindo', 'postura de princesa na fila do SUS') e solte oferta/cupom VIP assim que sentir cheiro de venda!",
  },

  guerra_corredor: {
    id: "guerra_corredor",
    title: "Batalha do Anexo IV",
    badge: "Emissário do Vavá",
    visitorRole: "Articulador do Quarteto Caótico",
    tagline:
      "Negocie a pauta entre Dr. Vavá (Gab. 412), Prof. Bento (Gab. 717) e Cabo Jeremias (Gab. 190) arrancando 2 atos oficiais!",
    objective:
      "Meta: fazer a Deputada emitir 2 documentos oficiais (Corte, Ofício ou Oferta) selando o pacto do Quarteto.",
    openingGreeting:
      "Ah, veio a mando do Dr. Vavá lá do 412? Avisa pra ele que eu não vendo meus princípios por emenda de asfalto — mas se liberar minha comissão pra enquadrar o Prof. Bento e tirar o megafone do Cabo Jeremias da frente da minha câmera, a gente conversa!",
    liveOpeningCue:
      "Receba um emissário mandado pelo Dep. Dr. Vavá do Gabinete 412 em 1 frase afiada, dizendo que não se vende por emenda mas aceita conversar se for pra barrar o Prof. Bento e afastar o megafone do Cabo Jeremias do seu estúdio.",
    initialMeters: {
      cortesVirais: 50,
      paradoxoTradwife: 25,
      faturamentoHotmartK: 25,
      compostura: 80,
    },
    initialHeadline:
      "ANEXO IV EM CHAMAS • QUARTETO CAÓTICO DISPUTA PAUTA ENTRE GABINETES 412, 717, 222 E 190",
    initialMoves: [
      {
        id: "tri-1",
        label: "🤝 Oferecer relatoria da CPI contra o Bento",
        prompt:
          "O Dr. Vavá mandou avisar: se a senhora votar quieta na emenda do rodeio, ele te entrega hoje a relatoria do PL da Escola Sem Doutrinação pra calar o Prof. Bento!",
        tone: "acordo",
      },
      {
        id: "tri-2",
        label: "📢 Contar que o Cabo Jeremias roubou a live",
        prompt:
          "O Cabo Jeremias do Gabinete 190 estacionou a Hilux na porta falando que o seu ring light é frescura e vendendo caneca camuflada na Shopee pros seus seguidores! Vai deixar barato?",
        tone: "blefe",
      },
      {
        id: "tri-3",
        label: "🧾 Cobrar coerência com o Centrão do Vavá",
        prompt:
          "Ué, a senhora faz discurso moralista todo dia no Reels, mas na hora do vamos ver fecha composição com o Vavá do Centrão por relatoria?",
        tone: "pressao",
      },
    ],
    promptContext:
      "MISSÃO ATIVA: O visitante é um emissário vindo do Gabinete 412 (Dep. Dr. Vavá, Centrão) para negociar a pauta da semana enquanto o arquirrival Prof. Bento (Gabinete 717, esquerda acadêmica do PSA/RJ) tenta obstruir tudo e o Dep. Cabo Jeremias 'Tático' Santana (Gabinete 190, PBP/GO) trava uma Aliança Tóxica disputando câmera, seguidores e ring light com o megafone dele, a Hilux de R$ 92 mil de gasolina e caneca camuflada da Shopee! Detone o Bento, alfinete o amadorismo do Cabo Jeremias e feche acordo pragmático com o Vavá se ganhar palco, corte viral ou relatoria de costumes!",
  },
};

export const SCENARIO_LIST: ScenarioDefinition[] = [
  SCENARIOS.livre,
  SCENARIOS.paradoxo_tradwife,
  SCENARIOS.professor_historia,
  SCENARIOS.mentoria_hotmart,
  SCENARIOS.guerra_corredor,
];

export const BACKSTAGE_INTERRUPTS: BackstageInterrupt[] = [
  {
    id: "zap_marido_baba",
    source: "marido_zap",
    badge: "WHATSAPP • DR. FABRÍCIO (SC)",
    headline:
      "ZAP DO MARIDO EM SC: 'Amor, cadê a senha da babá eletrônica e o xarope das crianças? Tô sozinho aqui desde terça!'",
    chatSystemNote:
      "📱 WhatsApp (Dr. Fabrício): \"Amor, cadê a senha da babá eletrônica? A terceira babá saiu mais cedo e eu não sei fazer a mamadeira!\"",
    liveInstruction:
      "EVENTO AO VIVO NO GABINETE: Seu celular apitou com uma mensagem inconveniente do seu marido Dr. Fabrício lá em Santa Catarina perguntando a senha da babá eletrônica porque está sozinho com as crianças. Disfarce em 1 segundo com um sorriso amarelo ('coisa de família funcional!') e volte rápido pra pauta.",
    liveCommentary:
      "Chegou mensagem no teu celular do teu marido Fabrício em Santa Catarina perguntando onde fica o xarope e a senha da babá eletrônica enquanto você tá em Brasília!",
    mood: "celular",
    meterDelta: { paradoxoTradwife: 12, compostura: -6 },
    minTurn: 3,
  },
  {
    id: "hotmart_plim_vendas",
    source: "hotmart",
    badge: "NOTIFICAÇÃO HOTMART",
    headline:
      "PLIM! +18 MATRÍCULAS NA MENTORIA ESPOSA DE ALTO VALOR (R$ 35.460 EM 4 MINUTOS)",
    chatSystemNote:
      "💰 Notificação Hotmart: +18 novas alunas acabaram de comprar com o cupom FAMILIA10 (+R$ 35k no carrinho!).",
    liveInstruction:
      "EVENTO AO VIVO: Seu celular deu o 'plim' da Hotmart avisando que acabaram de entrar 18 novas matrículas na sua Mentoria Esposa de Alto Valor! Comemore brevemente com orgulho de empreendedora tradicional e tente convencer o visitante a usar o cupom FAMILIA10.",
    liveCommentary:
      "Tocou o plim da Hotmart na sua mesa: acabaram de cair dezoito matrículas novas na Mentoria Esposa de Alto Valor!",
    mood: "livro",
    meterDelta: { faturamentoHotmartK: 35, cortesVirais: 8 },
    minTurn: 3,
  },
  {
    id: "enzo_tripe_viral",
    source: "social_media",
    badge: "ENZO DO TRIPÉ • SOCIAL MEDIA",
    headline:
      "BATEU 1,4 MILHÃO! O CORTE 'DEPUTADA REFUTA PROFESSOR' TÁ NO TOP 3 DO INSTAGRAM!",
    chatSystemNote:
      "🎬 Enzo (Social Media) mostra o celular atrás da câmera: \"Deputada, seu último Reels bateu 1,4 milhão de views! Faz uma cara indignada agora pra thumbnail!\"",
    liveInstruction:
      "EVENTO AO VIVO: Seu assessor de redes sociais Enzo acabou de levantar uma plaquinha atrás do ring light avisando que seu último corte bateu 1,4 milhão de views! Fique radiante, ajeite a postura pro celular e capriche numa frase de efeito bem cortável agora!",
    liveCommentary:
      "O Enzo do tripé levantou o celular avisando que teu último corte acabou de bater um milhão e quatrocentas mil visualizações!",
    mood: "reels",
    meterDelta: { cortesVirais: 12, compostura: 6 },
    minTurn: 4,
  },
  {
    id: "corredor_bento_megafone",
    source: "corredor_bento",
    badge: "CORREDOR • PROF. BENTO (PSA/RJ)",
    headline:
      "BARRACO NO ANEXO IV: PROF. BENTO PROTOCOLOU NOTA DE REPÚDIO VEEMENTE CONTRA SEU PROJETO!",
    chatSystemNote:
      "📢 Corredor do Anexo IV: O Dep. Prof. Bento (Gabinete 717) passou com um copo de matcha de R$ 48 avisando que abriu um Grupo de Trabalho contra o seu projeto de Escola Sem Doutrinação!",
    liveInstruction:
      "EVENTO AO VIVO: O seu arquirrival Prof. Bento (PSA/RJ) acabou de passar no corredor protocolando uma Nota de Repúdio Veemente contra você enquanto toma matcha de 48 reais! Reaja detonando o Bento em 1 frase afiada ('eterno doutorando de DCE!') e volte pro visitante.",
    liveCommentary:
      "O Prof. Bento lá do Gabinete 717 acabou de passar no corredor com um matcha de quarenta e oito reais protocolando Nota de Repúdio contra você!",
    mood: "crise",
    meterDelta: { cortesVirais: 10, compostura: -10 },
    minTurn: 4,
  },
  {
    id: "recado_vava_412",
    source: "recado_vava",
    badge: "RECADO • GABINETE 412 (VAVÁ)",
    headline:
      "DONA NEIDE LIGOU DO 412: DR. VAVÁ LIBERA SUA RELATORIA SE VOCÊ NÃO FALAR DA EMENDA DO RODEIO",
    chatSystemNote:
      "☎️ Recado do Gabinete 412: Dona Neide avisou que o Presidente Dr. Vavá pauta seu PL de Costumes às 3h da manhã em troca de silêncio sobre o asfalto do cunhado.",
    liveInstruction:
      "EVENTO AO VIVO: Chegou um recado discreto da Dona Neide (secretária do Presidente Dr. Vavá): ele libera a relatoria da sua Comissão de Costumes se você ficar quieta sobre as emendas do rodeio. Reaja com pragmatismo cínico disfarçado de dever cívico!",
    liveCommentary:
      "Chegou recado da Dona Neide do Gabinete 412: o Dr. Vavá libera sua relatoria se você não criticar a emenda do rodeio hoje!",
    mood: "celular",
    meterDelta: { paradoxoTradwife: 8, cortesVirais: 6 },
    minTurn: 5,
  },
  {
    id: "invasao_jeremias_megafone",
    source: "invasao_jeremias",
    badge: "CORREDOR • CABO JEREMIAS (GAB. 190)",
    headline:
      "ALIANÇA TÓXICA: CABO JEREMIAS INVADIU O ENQUADRAMENTO COM MEGAFONE VENDENDO CANECA CAMUFLADA (CUPOM CAVEIRA10)!",
    chatSystemNote:
      "🪖 Corredor (Gab. 190): Dep. Cabo Jeremias \"Tático\" Santana passou com megafone na porta gritando \"SELVA! SAI DA FRENTE DA MINHA LIVE!\", exibindo caneca camuflada da Shopee e o boleto de R$ 92 mil de gasolina da Hilux blindada!",
    liveInstruction:
      "EVENTO AO VIVO NO ESTÚDIO: Seu colega de Aliança Tóxica, Dep. Cabo Jeremias (Gab. 190, PBP/GO), acabou de estragar a luz do seu ring light passando no corredor de megafone vendendo caneca camuflada da Shopee (cupom CAVEIRA10) depois de gastar R$ 92 mil de gasolina na Hilux! Reclame da falta de classe dele em 1 frase ácida e retome a conversa.",
    liveCommentary:
      "O Cabo Jeremias do Gabinete 190 passou de megafone na frente do seu ring light vendendo caneca camuflada na Shopee e buzinando a Hilux de noventa e dois mil de gasolina!",
    mood: "crise",
    meterDelta: { cortesVirais: 9, compostura: -8 },
    minTurn: 4,
  },
  {
    id: "flagra_bolo_banco_imagens",
    source: "flagra_x",
    badge: "TRENDING NO X • FLAGRA",
    headline:
      "VIRALIZOU PRINT: FOTO DE 'BOLO CASEIRO DA DEPUTADA' ERA DE BANCO DE IMAGENS ENQUANTO ELA JANTAVA EM BISTRÔ!",
    chatSystemNote:
      "🚨 Alerta de Imprensa: Viralizou no X que a foto do seu 'pão artesanal das 5h da manhã' tinha marca d'água de banco de imagens enquanto você jantava num bistrô em Brasília!",
    liveInstruction:
      "EVENTO CRÍTICO AO VIVO: Viralizou no X um print mostrando que a foto de 'pão artesanal caseiro' que você postou de manhã era de banco de imagens enquanto você jantava num bistrô de Brasília! Entre em modo malabarismo retórico total culpando a imprensa militante e a Escola de Frankfurt!",
    liveCommentary:
      "Urgente: viralizou no X que a foto do pão artesanal que você postou de manhã era de banco de imagens enquanto você estava num bistrô em Brasília!",
    mood: "crise",
    meterDelta: { paradoxoTradwife: 16, compostura: -12 },
    minTurn: 5,
    minParadoxo: 40,
  },
];

export function createInitialLedger(
  scenarioId: ScenarioId = "livre"
): SessionLedger {
  const def = SCENARIOS[scenarioId] ?? SCENARIOS.livre;
  return {
    scenarioId: def.id,
    turnCount: 0,
    act: 1,
    meters: { ...def.initialMeters },
    facts: [],
    recentTropes: [],
    documents: [],
    triggeredInterruptIds: [],
    suggestedMoves: def.initialMoves.map((m) => ({ ...m })),
    headlineTicker: def.initialHeadline,
    cortesGravados: 0,
    ringLightCutsCount: 0,
    bestQuote: null,
  };
}

export function pickBackstageInterrupt(
  ledger: SessionLedger
): BackstageInterrupt | null {
  if (ledger.endedReason || ledger.turnCount < 3) return null;
  const shouldRoll =
    ledger.turnCount % 3 === 0 ||
    (ledger.meters.paradoxoTradwife >= 65 &&
      ledger.triggeredInterruptIds.length < 2);
  if (!shouldRoll) return null;

  const eligible = BACKSTAGE_INTERRUPTS.filter((item) => {
    if (ledger.triggeredInterruptIds.includes(item.id)) return false;
    if (item.minTurn && ledger.turnCount < item.minTurn) return false;
    if (item.minParadoxo && ledger.meters.paradoxoTradwife < item.minParadoxo)
      return false;
    if (item.minCortes && ledger.meters.cortesVirais < item.minCortes)
      return false;
    if (item.maxCompostura && ledger.meters.compostura > item.maxCompostura)
      return false;
    return true;
  });

  if (eligible.length === 0) return null;
  if (ledger.meters.paradoxoTradwife >= 60) {
    const paradoxoEvt = eligible.find(
      (e) => e.source === "flagra_x" || e.source === "marido_zap"
    );
    if (paradoxoEvt) return paradoxoEvt;
  }
  return eligible[0];
}
