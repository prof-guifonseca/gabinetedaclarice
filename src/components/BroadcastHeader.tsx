import {
  Briefcase,
  FileCheck2,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { LiveConnectionState } from "../hooks/useGptLiveSession";
import type { ScenarioId } from "../shared/gameState";
import { SCENARIOS } from "../shared/scenarios";

interface BroadcastHeaderProps {
  status: LiveConnectionState;
  isSpeaking: boolean;
  isStandby: boolean;
  scenarioId: ScenarioId;
  sfxMuted: boolean;
  canOpenSummary: boolean;
  onOpenScenarios: () => void;
  onOpenSummary: () => void;
  onToggleSfx: () => void;
  onResetChat: () => void;
}

export function BroadcastHeader({
  status,
  isSpeaking,
  isStandby,
  scenarioId,
  sfxMuted,
  canOpenSummary,
  onOpenScenarios,
  onOpenSummary,
  onToggleSfx,
  onResetChat,
}: BroadcastHeaderProps) {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS.livre;

  const statusLabel =
    status === "live"
      ? isSpeaking
        ? "Gravando ao vivo"
        : isStandby
        ? "Em espera"
        : "Ring Light ON"
      : status === "connecting"
      ? "Conectando..."
      : "No gabinete";

  return (
    <header className="cabinet-header">
      <div className="brand-group">
        <div className="brand-emblem" aria-hidden="true">
          <Sparkles size={17} />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">Gabinete da Clarice</h1>
          <p className="brand-sub">
            Gabinete 222 · Anexo IV · Dep. Prof.ª Clarice &ldquo;Clá&rdquo; Alencar (PFM/SC)
          </p>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="header-btn is-accent"
          onClick={onOpenScenarios}
          title="Escolher Crachá / Missão"
        >
          <Briefcase size={14} />
          <span>{scenario.badge}</span>
        </button>

        {canOpenSummary && (
          <button
            type="button"
            className="header-btn"
            onClick={onOpenSummary}
            title="Ver Boletim da Audiência e gerar card para WhatsApp"
          >
            <FileCheck2 size={14} />
            <span className="hide-mobile">Boletim</span>
          </button>
        )}

        <span
          className={`status-pill ${
            status === "live"
              ? "is-live"
              : status === "connecting"
              ? "is-connecting"
              : ""
          }`}
        >
          <span className="status-dot" />
          {statusLabel}
        </span>

        <button
          type="button"
          className="header-btn icon-only"
          onClick={onToggleSfx}
          title={
            sfxMuted
              ? "Ativar efeitos sonoros do estúdio"
              : "Silenciar efeitos sonoros"
          }
          aria-label={
            sfxMuted ? "Ativar efeitos sonoros" : "Silenciar efeitos sonoros"
          }
        >
          {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>

        <button
          type="button"
          className="header-btn icon-only"
          onClick={onResetChat}
          title="Recomeçar audiência"
          aria-label="Recomeçar audiência"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </header>
  );
}
