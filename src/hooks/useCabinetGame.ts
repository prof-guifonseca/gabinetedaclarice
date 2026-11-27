import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyDirectorPatch,
  classifyVisitorArchetype,
  clamp,
  sanitizeDirectorPatch,
  type AvatarMood,
  type BackstageInterrupt,
  type CabinetDocument,
  type CabinetMeters,
  type ScenarioId,
  type SessionLedger,
} from "../shared/gameState";
import {
  SCENARIOS,
  createInitialLedger,
  pickBackstageInterrupt,
} from "../shared/scenarios";
import { cabinetSfx } from "../audio/cabinetSfx";

export interface SavedAchievement {
  id: string;
  title: string;
  stamp: string;
  scenarioId: ScenarioId;
  achievedAt: string;
}

const ACHIEVEMENTS_KEY = "gabinete_clarice_achievements_v2";

function loadAchievements(): SavedAchievement[] {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function saveAchievement(entry: SavedAchievement): SavedAchievement[] {
  const current = loadAchievements();
  const filtered = current.filter((a) => a.id !== entry.id);
  const next = [entry, ...filtered].slice(0, 20);
  try {
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}

export function useCabinetGame() {
  const [ledger, setLedger] = useState<SessionLedger>(() =>
    createInitialLedger("livre")
  );
  const [mood, setMood] = useState<AvatarMood>("neutro");
  const [lastDeltas, setLastDeltas] = useState<Partial<CabinetMeters> | null>(
    null
  );
  const [activeDocument, setActiveDocument] = useState<CabinetDocument | null>(
    null
  );
  const [isDeskShaking, setIsDeskShaking] = useState(false);
  const [ringLightFlash, setRingLightFlash] = useState(false);
  const [micCutSecondsLeft, setMicCutSecondsLeft] = useState(0);
  const [activeInterrupt, setActiveInterrupt] =
    useState<BackstageInterrupt | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [sfxMuted, setSfxMuted] = useState<boolean>(() => cabinetSfx.isMuted());
  const [achievements, setAchievements] =
    useState<SavedAchievement[]>(loadAchievements);

  const ledgerRef = useRef(ledger);
  ledgerRef.current = ledger;

  const moodDecayRef = useRef<number | null>(null);
  const deltaClearRef = useRef<number | null>(null);
  const interruptClearRef = useRef<number | null>(null);
  const micCutIntervalRef = useRef<number | null>(null);

  const scheduleMoodDecay = useCallback((nextMood: AvatarMood) => {
    if (moodDecayRef.current !== null) {
      window.clearTimeout(moodDecayRef.current);
      moodDecayRef.current = null;
    }
    if (nextMood === "neutro") return;
    moodDecayRef.current = window.setTimeout(() => {
      setMood((curr) => (curr === nextMood ? "neutro" : curr));
    }, 9500);
  }, []);

  const setTransientMood = useCallback(
    (nextMood: AvatarMood) => {
      setMood(nextMood);
      scheduleMoodDecay(nextMood);
    },
    [scheduleMoodDecay]
  );

  const triggerBookSlamShake = useCallback(() => {
    setIsDeskShaking(true);
    cabinetSfx.playBookSlam();
    window.setTimeout(() => setIsDeskShaking(false), 680);
  }, []);

  const triggerRingLightFlash = useCallback(() => {
    setRingLightFlash(true);
    cabinetSfx.playCameraShutter();
    window.setTimeout(() => setRingLightFlash(false), 850);
  }, []);

  const triggerMicCut = useCallback((seconds: number) => {
    cabinetSfx.playMicCut();
    setMicCutSecondsLeft(seconds);
    if (micCutIntervalRef.current !== null) {
      window.clearInterval(micCutIntervalRef.current);
    }
    micCutIntervalRef.current = window.setInterval(() => {
      setMicCutSecondsLeft((prev) => {
        if (prev <= 1) {
          if (micCutIntervalRef.current !== null) {
            window.clearInterval(micCutIntervalRef.current);
            micCutIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const toggleSfxMute = useCallback(() => {
    setSfxMuted((prev) => {
      const next = !prev;
      cabinetSfx.setMuted(next);
      return next;
    });
  }, []);

  const resetForScenario = useCallback((scenarioId: ScenarioId) => {
    if (moodDecayRef.current !== null) window.clearTimeout(moodDecayRef.current);
    if (deltaClearRef.current !== null) window.clearTimeout(deltaClearRef.current);
    if (interruptClearRef.current !== null)
      window.clearTimeout(interruptClearRef.current);
    if (micCutIntervalRef.current !== null)
      window.clearInterval(micCutIntervalRef.current);

    const fresh = createInitialLedger(scenarioId);
    ledgerRef.current = fresh;
    setLedger(fresh);
    setMood("neutro");
    setLastDeltas(null);
    setActiveDocument(null);
    setIsDeskShaking(false);
    setRingLightFlash(false);
    setMicCutSecondsLeft(0);
    setActiveInterrupt(null);
    setShowSummary(false);
    return SCENARIOS[scenarioId];
  }, []);

  const evaluateTurnWithDirector = useCallback(
    async (params: {
      userMessage: string;
      assistantReply: string;
      accessCode: string;
      nowLabel: string;
      isLive: boolean;
      onSystemEvent: (text: string) => void;
      onLiveInject?: (instruction: string, commentary?: string) => void;
      onForceMicCut?: (seconds: number) => void;
    }) => {
      const currentLedger = ledgerRef.current;

      try {
        const res = await fetch("/api/director", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: params.userMessage,
            assistantReply: params.assistantReply,
            ledger: currentLedger,
            accessCode: params.accessCode,
          }),
        });

        if (!res.ok) return null;
        const data = (await res.json().catch(() => ({}))) as {
          patch?: unknown;
        };
        if (!data.patch) return null;

        const patch = sanitizeDirectorPatch(data.patch);
        const { nextLedger, firedAction, newDocument, justEnded } =
          applyDirectorPatch(
            ledgerRef.current,
            patch,
            params.assistantReply,
            params.nowLabel
          );

        setTransientMood(patch.mood);
        if (
          Object.values(patch.meterDelta).some(
            (v) => typeof v === "number" && v !== 0
          )
        ) {
          setLastDeltas(patch.meterDelta);
          if (deltaClearRef.current !== null) {
            window.clearTimeout(deltaClearRef.current);
          }
          deltaClearRef.current = window.setTimeout(() => {
            setLastDeltas(null);
          }, 3400);
        }

        // Tactile Studio & Cabinet Actions (Documents appear as inline clickable cards — never hijacking the screen!)
        if (firedAction.type === "bater_livro_mesa") {
          triggerBookSlamShake();
          params.onSystemEvent(`📕 Best-Seller na mesa: ${firedAction.motivo}`);
        } else if (firedAction.type === "ligar_ring_light_silenciar") {
          triggerRingLightFlash();
          triggerMicCut(firedAction.segundos);
          params.onForceMicCut?.(firedAction.segundos);
          params.onSystemEvent(
            `🔴 Enzo ligou o Ring Light e silenciou seu microfone por ${firedAction.segundos}s: "${firedAction.motivo}"`
          );
        } else if (firedAction.type === "gravar_corte_reels" && newDocument) {
          triggerRingLightFlash();
        } else if (
          firedAction.type === "protocolar_denuncia_escola" &&
          newDocument
        ) {
          cabinetSfx.playStampThud();
        } else if (
          firedAction.type === "lancar_oferta_hotmart" &&
          newDocument
        ) {
          cabinetSfx.playHotmartChaChing();
        }

        // Backstage Interrupts
        let finalLedger = nextLedger;
        if (!justEnded) {
          const interrupt = pickBackstageInterrupt(nextLedger);
          if (interrupt) {
            const delta = interrupt.meterDelta ?? {};
            finalLedger = {
              ...nextLedger,
              triggeredInterruptIds: [
                ...nextLedger.triggeredInterruptIds,
                interrupt.id,
              ],
              headlineTicker: interrupt.headline,
              meters: {
                cortesVirais: clamp(
                  nextLedger.meters.cortesVirais + (delta.cortesVirais ?? 0),
                  0,
                  100
                ),
                paradoxoTradwife: clamp(
                  nextLedger.meters.paradoxoTradwife +
                    (delta.paradoxoTradwife ?? 0),
                  0,
                  100
                ),
                faturamentoHotmartK: clamp(
                  nextLedger.meters.faturamentoHotmartK +
                    (delta.faturamentoHotmartK ?? 0),
                  0,
                  500
                ),
                compostura: clamp(
                  nextLedger.meters.compostura + (delta.compostura ?? 0),
                  0,
                  100
                ),
              },
            };

            window.setTimeout(() => {
              if (interrupt.source === "hotmart") {
                cabinetSfx.playHotmartChaChing();
              } else if (
                interrupt.source === "marido_zap" ||
                interrupt.source === "recado_vava"
              ) {
                cabinetSfx.playWhatsappPing();
              } else if (interrupt.source === "social_media") {
                cabinetSfx.playCameraShutter();
              } else {
                cabinetSfx.playTickerAlert();
              }
              setTransientMood(interrupt.mood);
              setActiveInterrupt(interrupt);
              params.onSystemEvent(interrupt.chatSystemNote);
              if (params.isLive && params.onLiveInject) {
                params.onLiveInject(
                  interrupt.liveInstruction,
                  interrupt.liveCommentary
                );
              }
              if (interruptClearRef.current !== null) {
                window.clearTimeout(interruptClearRef.current);
              }
              interruptClearRef.current = window.setTimeout(() => {
                setActiveInterrupt(null);
              }, 9000);
            }, 900);
          }
        }

        ledgerRef.current = finalLedger;
        setLedger(finalLedger);

        if (justEnded) {
          const arch = classifyVisitorArchetype(finalLedger);
          setAchievements(
            saveAchievement({
              id: arch.id,
              title: arch.title,
              stamp: arch.stamp,
              scenarioId: finalLedger.scenarioId,
              achievedAt: params.nowLabel,
            })
          );
          if (finalLedger.endedReason === "expulso") {
            triggerBookSlamShake();
          } else {
            cabinetSfx.playTickerAlert();
          }
          window.setTimeout(() => setShowSummary(true), 1200);
        }

        return { patch, ledger: finalLedger, newDocument };
      } catch {
        return null;
      }
    },
    [
      setTransientMood,
      triggerBookSlamShake,
      triggerMicCut,
      triggerRingLightFlash,
    ]
  );

  const openManualSummary = useCallback(() => {
    const current = ledgerRef.current;
    const arch = classifyVisitorArchetype(current);
    setAchievements(
      saveAchievement({
        id: arch.id,
        title: arch.title,
        stamp: arch.stamp,
        scenarioId: current.scenarioId,
        achievedAt: new Date().toLocaleDateString("pt-BR"),
      })
    );
    setShowSummary(true);
  }, []);

  useEffect(() => {
    return () => {
      if (moodDecayRef.current !== null) window.clearTimeout(moodDecayRef.current);
      if (deltaClearRef.current !== null) window.clearTimeout(deltaClearRef.current);
      if (interruptClearRef.current !== null)
        window.clearTimeout(interruptClearRef.current);
      if (micCutIntervalRef.current !== null)
        window.clearInterval(micCutIntervalRef.current);
    };
  }, []);

  return {
    ledger,
    mood,
    lastDeltas,
    activeDocument,
    setActiveDocument,
    isDeskShaking,
    ringLightFlash,
    micCutSecondsLeft,
    activeInterrupt,
    showSummary,
    setShowSummary,
    sfxMuted,
    achievements,
    setTransientMood,
    toggleSfxMute,
    resetForScenario,
    evaluateTurnWithDirector,
    openManualSummary,
  };
}
