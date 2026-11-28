import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyBackstageInterrupt,
  applyDirectorPatch,
  classifyVisitorArchetype,
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

function formatAchievementDate(): string {
  return new Date().toLocaleDateString("pt-BR");
}

function isSavedAchievement(item: unknown): item is SavedAchievement {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    obj.id.trim().length > 0 &&
    typeof obj.title === "string" &&
    obj.title.trim().length > 0 &&
    typeof obj.stamp === "string" &&
    obj.stamp.trim().length > 0 &&
    typeof obj.scenarioId === "string" &&
    obj.scenarioId in SCENARIOS &&
    typeof obj.achievedAt === "string" &&
    obj.achievedAt.trim().length > 0
  );
}

function loadAchievements(): SavedAchievement[] {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedAchievement).slice(0, 20);
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

  const sfxMutedRef = useRef(sfxMuted);
  sfxMutedRef.current = sfxMuted;

  const sessionEpochRef = useRef(0);
  const directorAbortRef = useRef<AbortController | null>(null);

  const moodDecayRef = useRef<number | null>(null);
  const deltaClearRef = useRef<number | null>(null);
  const interruptClearRef = useRef<number | null>(null);
  const micCutIntervalRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const interruptDelayRef = useRef<number | null>(null);
  const summaryDelayRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    if (moodDecayRef.current !== null) {
      window.clearTimeout(moodDecayRef.current);
      moodDecayRef.current = null;
    }
    if (deltaClearRef.current !== null) {
      window.clearTimeout(deltaClearRef.current);
      deltaClearRef.current = null;
    }
    if (interruptClearRef.current !== null) {
      window.clearTimeout(interruptClearRef.current);
      interruptClearRef.current = null;
    }
    if (micCutIntervalRef.current !== null) {
      window.clearInterval(micCutIntervalRef.current);
      micCutIntervalRef.current = null;
    }
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    if (interruptDelayRef.current !== null) {
      window.clearTimeout(interruptDelayRef.current);
      interruptDelayRef.current = null;
    }
    if (summaryDelayRef.current !== null) {
      window.clearTimeout(summaryDelayRef.current);
      summaryDelayRef.current = null;
    }
  }, []);

  const scheduleMoodDecay = useCallback((nextMood: AvatarMood) => {
    if (moodDecayRef.current !== null) {
      window.clearTimeout(moodDecayRef.current);
      moodDecayRef.current = null;
    }
    if (nextMood === "neutro") return;
    const epoch = sessionEpochRef.current;
    moodDecayRef.current = window.setTimeout(() => {
      moodDecayRef.current = null;
      if (epoch !== sessionEpochRef.current) return;
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

  const showTransientDeltas = useCallback((delta: Partial<CabinetMeters>) => {
    if (!Object.values(delta).some((v) => typeof v === "number" && v !== 0)) {
      return;
    }
    setLastDeltas(delta);
    if (deltaClearRef.current !== null) {
      window.clearTimeout(deltaClearRef.current);
    }
    const epoch = sessionEpochRef.current;
    deltaClearRef.current = window.setTimeout(() => {
      deltaClearRef.current = null;
      if (epoch !== sessionEpochRef.current) return;
      setLastDeltas(null);
    }, 3400);
  }, []);

  const triggerBookSlamShake = useCallback(() => {
    setIsDeskShaking(true);
    cabinetSfx.playBookSlam();
    if (shakeTimerRef.current !== null) {
      window.clearTimeout(shakeTimerRef.current);
    }
    const epoch = sessionEpochRef.current;
    shakeTimerRef.current = window.setTimeout(() => {
      shakeTimerRef.current = null;
      if (epoch !== sessionEpochRef.current) return;
      setIsDeskShaking(false);
    }, 680);
  }, []);

  const triggerRingLightFlash = useCallback(() => {
    setRingLightFlash(true);
    cabinetSfx.playCameraShutter();
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    const epoch = sessionEpochRef.current;
    flashTimerRef.current = window.setTimeout(() => {
      flashTimerRef.current = null;
      if (epoch !== sessionEpochRef.current) return;
      setRingLightFlash(false);
    }, 850);
  }, []);

  const triggerMicCut = useCallback((seconds: number) => {
    cabinetSfx.playMicCut();
    let remaining = Math.max(1, Math.round(seconds));
    setMicCutSecondsLeft(remaining);
    if (micCutIntervalRef.current !== null) {
      window.clearInterval(micCutIntervalRef.current);
      micCutIntervalRef.current = null;
    }
    const epoch = sessionEpochRef.current;
    micCutIntervalRef.current = window.setInterval(() => {
      if (epoch !== sessionEpochRef.current) {
        if (micCutIntervalRef.current !== null) {
          window.clearInterval(micCutIntervalRef.current);
          micCutIntervalRef.current = null;
        }
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        if (micCutIntervalRef.current !== null) {
          window.clearInterval(micCutIntervalRef.current);
          micCutIntervalRef.current = null;
        }
        setMicCutSecondsLeft(0);
      } else {
        setMicCutSecondsLeft(remaining);
      }
    }, 1000);
  }, []);

  const finalizeEndedSession = useCallback(
    (endedLedger: SessionLedger, epoch: number) => {
      const arch = classifyVisitorArchetype(endedLedger);
      setAchievements(
        saveAchievement({
          id: arch.id,
          title: arch.title,
          stamp: arch.stamp,
          scenarioId: endedLedger.scenarioId,
          achievedAt: formatAchievementDate(),
        })
      );
      if (endedLedger.endedReason === "expulso") {
        triggerBookSlamShake();
      } else {
        cabinetSfx.playTickerAlert();
      }
      if (summaryDelayRef.current !== null) {
        window.clearTimeout(summaryDelayRef.current);
      }
      summaryDelayRef.current = window.setTimeout(() => {
        summaryDelayRef.current = null;
        if (epoch !== sessionEpochRef.current) return;
        setShowSummary(true);
      }, 1200);
    },
    [triggerBookSlamShake]
  );

  const toggleSfxMute = useCallback(() => {
    const next = !sfxMutedRef.current;
    sfxMutedRef.current = next;
    cabinetSfx.setMuted(next);
    setSfxMuted(next);
  }, []);

  const resetForScenario = useCallback(
    (scenarioId: ScenarioId) => {
      sessionEpochRef.current += 1;
      if (directorAbortRef.current) {
        directorAbortRef.current.abort();
        directorAbortRef.current = null;
      }
      clearAllTimers();

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
    },
    [clearAllTimers]
  );

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
      const epoch = sessionEpochRef.current;
      const currentLedger = ledgerRef.current;
      const abortController = new AbortController();
      directorAbortRef.current = abortController;

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
          signal: abortController.signal,
        });

        if (epoch !== sessionEpochRef.current) return null;
        if (!res.ok) return null;

        const data = (await res.json().catch(() => ({}))) as {
          patch?: unknown;
        };
        if (epoch !== sessionEpochRef.current) return null;
        if (!data.patch) return null;

        const patch = sanitizeDirectorPatch(data.patch);
        const { nextLedger, firedAction, newDocument, justEnded } =
          applyDirectorPatch(
            ledgerRef.current,
            patch,
            params.assistantReply,
            params.nowLabel
          );

        ledgerRef.current = nextLedger;
        setLedger(nextLedger);
        setTransientMood(patch.mood);
        showTransientDeltas(patch.meterDelta);

        // Tactile Studio & Cabinet Actions
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

        if (justEnded) {
          finalizeEndedSession(nextLedger, epoch);
        } else {
          // Backstage Interrupts — synchronize meter update, act & outcome evaluation inside the 900ms epoch-guarded callback
          const interrupt = pickBackstageInterrupt(nextLedger);
          if (interrupt) {
            if (interruptDelayRef.current !== null) {
              window.clearTimeout(interruptDelayRef.current);
            }
            interruptDelayRef.current = window.setTimeout(() => {
              interruptDelayRef.current = null;
              if (epoch !== sessionEpochRef.current) return;
              const liveLedger = ledgerRef.current;
              if (
                liveLedger.endedReason ||
                liveLedger.triggeredInterruptIds.includes(interrupt.id)
              ) {
                return;
              }

              const { nextLedger: afterInterrupt, justEnded: endedByInterrupt } =
                applyBackstageInterrupt(liveLedger, interrupt);

              ledgerRef.current = afterInterrupt;
              setLedger(afterInterrupt);
              if (interrupt.meterDelta) {
                showTransientDeltas(interrupt.meterDelta);
              }

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
                interruptClearRef.current = null;
                if (epoch !== sessionEpochRef.current) return;
                setActiveInterrupt(null);
              }, 9000);

              if (endedByInterrupt) {
                finalizeEndedSession(afterInterrupt, epoch);
              }
            }, 900);
          }
        }

        return { patch, ledger: nextLedger, newDocument };
      } catch {
        return null;
      } finally {
        if (directorAbortRef.current === abortController) {
          directorAbortRef.current = null;
        }
      }
    },
    [
      finalizeEndedSession,
      setTransientMood,
      showTransientDeltas,
      triggerBookSlamShake,
      triggerMicCut,
      triggerRingLightFlash,
    ]
  );

  const openManualSummary = useCallback(() => {
    const current = ledgerRef.current;
    if (current.endedReason || current.turnCount >= 3) {
      const arch = classifyVisitorArchetype(current);
      setAchievements(
        saveAchievement({
          id: arch.id,
          title: arch.title,
          stamp: arch.stamp,
          scenarioId: current.scenarioId,
          achievedAt: formatAchievementDate(),
        })
      );
    }
    setShowSummary(true);
  }, []);

  useEffect(() => {
    return () => {
      sessionEpochRef.current += 1;
      if (directorAbortRef.current) {
        directorAbortRef.current.abort();
        directorAbortRef.current = null;
      }
      clearAllTimers();
    };
  }, [clearAllTimers]);

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
