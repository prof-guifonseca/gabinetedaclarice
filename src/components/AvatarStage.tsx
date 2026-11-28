import type { CSSProperties } from "react";
import { Camera, FileText, Mic, MicOff, PhoneOff } from "lucide-react";
import type { AvatarMood, CabinetDocument } from "../shared/gameState";
import type { LiveConnectionState } from "../hooks/useGptLiveSession";

interface AvatarStageProps {
  mood: AvatarMood;
  status: LiveConnectionState;
  isSpeaking: boolean;
  isStandby: boolean;
  isMuted: boolean;
  isForceMuted: boolean;
  isDeskShaking: boolean;
  ringLightFlash: boolean;
  micCutSecondsLeft: number;
  voiceLevel: number;
  inputLevel: number;
  remainingSeconds: number;
  error: string | null;
  documents: CabinetDocument[];
  onInspectDocument: (doc: CabinetDocument) => void;
  onStartLive: () => void;
  onStopLive: () => void;
  onToggleMute: () => void;
  onExtendSession: () => void;
}

const AVATAR_SOURCES: Record<AvatarMood, string> = {
  neutro: "/avatars/clarice-neutro.jpg",
  falando: "/avatars/clarice-falando.jpg",
  reels: "/avatars/clarice-reels.jpg",
  crise: "/avatars/clarice-crise.jpg",
  livro: "/avatars/clarice-livro.jpg",
  celular: "/avatars/clarice-celular.jpg",
};

const MOOD_LABELS: Record<AvatarMood, string> = {
  neutro: "No gabinete",
  falando: "Explicando fatos",
  reels: "● Gravando Reels",
  crise: "Doutrinação!",
  livro: "Link na bio!",
  celular: "Zap · Bastidor",
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AvatarStage({
  mood,
  status,
  isSpeaking,
  isStandby,
  isMuted,
  isForceMuted,
  isDeskShaking,
  ringLightFlash,
  micCutSecondsLeft,
  voiceLevel,
  inputLevel,
  remainingSeconds,
  error,
  documents,
  onInspectDocument,
  onStartLive,
  onStopLive,
  onToggleMute,
  onExtendSession,
}: AvatarStageProps) {
  const activeMood: AvatarMood =
    isSpeaking && mood === "neutro" ? "falando" : mood;

  const eqHeights = [0.45, 0.85, 1, 0.72, 0.92, 0.55].map((weight, i) => {
    const base = isSpeaking ? 5 : 3;
    const dynamic = isSpeaking
      ? Math.round(voiceLevel * 24 * weight + (i % 2) * 3)
      : 0;
    return Math.min(26, base + dynamic);
  });

  const viewportStyle = {
    "--voice-level": isSpeaking ? voiceLevel.toFixed(3) : "0",
  } as CSSProperties;

  return (
    <aside
      className={`panel-card avatar-stage ${isDeskShaking ? "is-desk-shaking" : ""}`}
      aria-label='Dep. Prof.ª Clarice "Clá" Alencar'
    >
      <div className="stage-shell">
        <div
          className={`avatar-viewport ${isSpeaking ? "is-speaking" : ""} ${
            ringLightFlash ? "is-ring-flash" : ""
          }`}
          data-mood={activeMood}
          style={viewportStyle}
        >
          {(Object.keys(AVATAR_SOURCES) as AvatarMood[]).map((key) => {
            const isActive = activeMood === key;
            return (
              <img
                key={key}
                src={AVATAR_SOURCES[key]}
                alt={isActive ? 'Dep. Prof.ª Clarice "Clá" Alencar' : ""}
                aria-hidden={!isActive}
                fetchPriority={key === "neutro" ? "high" : "low"}
                decoding={key === "neutro" ? "sync" : "async"}
                className={`avatar-img ${isActive ? "is-active" : ""}`}
              />
            );
          })}

          <div className="avatar-vignette" />
          <div className="avatar-halo" />

          <div className="studio-bug">
            <span
              className={`tv-dot ${
                status === "live" || activeMood === "reels" ? "is-live" : ""
              }`}
            />
            <span>
              {status === "live"
                ? isStandby
                  ? "EM ESPERA · GAB. 222"
                  : "AO VIVO · RING LIGHT"
                : "GABINETE 222 · ANEXO IV"}
            </span>
            <span className="tv-mood-pill">{MOOD_LABELS[activeMood]}</span>
          </div>

          {micCutSecondsLeft > 0 && (
            <div className="mic-cut-overlay" role="alert">
              <Camera size={22} />
              <strong>GRAVANDO CORTE PRO REELS — MIC SILENCIADO</strong>
              <span className="mic-cut-detail">
                Ring Light liberando em {micCutSecondsLeft}s...
              </span>
              <span className="mic-cut-countdown" aria-hidden="true">
                {micCutSecondsLeft}s
              </span>
            </div>
          )}

          <div className="avatar-caption">
            <div>
              <p className="avatar-name">
                Prof.ª Clarice &ldquo;Clá&rdquo; Alencar
              </p>
              <p className="avatar-role">
                Frente da Família &amp; Costumes · PFM/SC
              </p>
            </div>
            <div className="eq-bars" aria-hidden="true">
              {eqHeights.map((h, idx) => (
                <span
                  key={idx}
                  className="eq-bar"
                  style={{
                    height: `${h}px`,
                    background:
                      activeMood === "crise" || activeMood === "reels"
                        ? "var(--rose)"
                        : activeMood === "livro"
                        ? "var(--emerald)"
                        : activeMood === "celular"
                        ? "var(--amber)"
                        : "var(--gold)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="stage-controls">
          <div className="mobile-stage-meta">
            <div className="mobile-stage-id">
              <strong>Dep. Clarice Alencar</strong>
              <span>{MOOD_LABELS[activeMood]}</span>
            </div>
          </div>

          <div className="primary-cta-row">
            {status !== "live" ? (
              <button
                type="button"
                className="btn-voice"
                disabled={status === "connecting" || micCutSecondsLeft > 0}
                onClick={onStartLive}
              >
                <Mic size={16} />
                <span className="cta-desktop-label">
                  {status === "connecting"
                    ? "Ligando o ring light..."
                    : "Falar ao vivo com a Clarice"}
                </span>
                <span className="cta-mobile-label">
                  {status === "connecting" ? "Conectando..." : "Voz ao vivo"}
                </span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={`btn-secondary ${isMuted ? "is-muted" : ""}`}
                  disabled={isForceMuted}
                  onClick={onToggleMute}
                  aria-pressed={isMuted}
                  aria-label={
                    isMuted ? "Ativar microfone" : "Silenciar microfone"
                  }
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  {isForceMuted ? "No Corte" : isMuted ? "Mutado" : "Mic"}
                </button>
                <button
                  type="button"
                  className="btn-voice is-danger"
                  onClick={onStopLive}
                >
                  <PhoneOff size={16} />
                  Encerrar
                </button>
              </>
            )}
          </div>

          {status === "live" && (
            <div className="live-footer-meta">
              <div className="mic-meter-row">
                <span>{isForceMuted ? "REC" : isMuted ? "MUDO" : "MIC"}</span>
                <div className="mic-meter-track">
                  <div
                    className="mic-meter-fill"
                    style={{
                      width: `${
                        isMuted ? 0 : Math.min(100, Math.round(inputLevel * 100))
                      }%`,
                    }}
                  />
                </div>
                <span className="timer-inline">
                  {formatTimer(remainingSeconds)}
                </span>
                <button
                  type="button"
                  className="timer-extend"
                  onClick={onExtendSession}
                >
                  +3m
                </button>
              </div>
            </div>
          )}

          {documents.length > 0 && (
            <div className="desk-folder">
              <span className="desk-folder-label">
                Pasta do Estúdio ({documents.length})
              </span>
              <div className="desk-folder-list">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    className="doc-pill-btn"
                    onClick={() => onInspectDocument(doc)}
                  >
                    <FileText size={13} />
                    {doc.action.type === "gravar_corte_reels"
                      ? `Reels · ${doc.action.viewsEstimadas}`
                      : doc.action.type === "protocolar_denuncia_escola"
                      ? `Ofício · ${doc.action.protocolo}`
                      : `Hotmart · ${doc.action.cupom}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}
        </div>
      </div>
    </aside>
  );
}
