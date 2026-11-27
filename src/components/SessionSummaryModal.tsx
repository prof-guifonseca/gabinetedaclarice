import { useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  RotateCcw,
  X,
} from "lucide-react";
import {
  classifyVisitorArchetype,
  type CabinetDocument,
  type SessionLedger,
} from "../shared/gameState";
import { SCENARIOS } from "../shared/scenarios";
import {
  downloadBlob,
  generateDossierCard,
  shareImageNativeOrCopy,
} from "../utils/shareCardGenerator";

interface SessionSummaryModalProps {
  open: boolean;
  ledger: SessionLedger;
  onClose: () => void;
  onRestart: () => void;
  onInspectDocument: (doc: CabinetDocument) => void;
}

export function SessionSummaryModal({
  open,
  ledger,
  onClose,
  onRestart,
  onInspectDocument,
}: SessionSummaryModalProps) {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const arch = classifyVisitorArchetype(ledger);
  const scenario = SCENARIOS[ledger.scenarioId] ?? SCENARIOS.livre;

  const handleShare = async (mode: "copy" | "download") => {
    setBusy(true);
    try {
      const blob = await generateDossierCard(ledger);
      const filename = `boletim-gabinete-clarice-${ledger.scenarioId}.png`;
      if (mode === "download") {
        downloadBlob(blob, filename);
        setStatusMsg("Boletim PNG salvo!");
      } else {
        const res = await shareImageNativeOrCopy(
          blob,
          filename,
          `Boletim do Gabinete da Clarice — ${arch.title}`,
          `Saí do Gabinete 222 como "${arch.title}"! Testa lá: https://gabinetedaclarice.pages.dev`
        );
        setStatusMsg(
          res === "shared"
            ? "Boletim compartilhado!"
            : res === "copied"
            ? "Card copiado! Cole no WhatsApp."
            : "Boletim PNG salvo!"
        );
      }
      window.setTimeout(() => setStatusMsg(null), 2600);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Boletim Final da Audiência"
      onClick={onClose}
    >
      <div
        className="modal-card modal-wide summary-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-row">
          <div>
            <p className="modal-kicker">
              BOLETIM DA GUERRA CULTURAL · {scenario.title.toUpperCase()}
            </p>
            <h3>{ledger.endedTitle || arch.title}</h3>
          </div>
          <button
            type="button"
            className="icon-close-btn"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="archetype-banner">
          <div>
            <span className="archetype-stamp">{arch.stamp}</span>
            <h4>{arch.title}</h4>
            <p>{ledger.endedSummary || arch.subtitle}</p>
          </div>
        </div>

        <div className="summary-stats-grid">
          <div className="summary-stat">
            <span>Cortes Virais</span>
            <strong>{ledger.meters.cortesVirais}%</strong>
          </div>
          <div className="summary-stat">
            <span>Paradoxo Tradwife</span>
            <strong>{ledger.meters.paradoxoTradwife}%</strong>
          </div>
          <div className="summary-stat">
            <span>Funil Hotmart</span>
            <strong>R$ {ledger.meters.faturamentoHotmartK}k</strong>
          </div>
          <div className="summary-stat">
            <span>Compostura</span>
            <strong>{ledger.meters.compostura}%</strong>
          </div>
        </div>

        {ledger.bestQuote && (
          <blockquote className="summary-quote">
            <span>Corte de Destaque do Estúdio</span>
            <p>&ldquo;{ledger.bestQuote.text}&rdquo;</p>
          </blockquote>
        )}

        {ledger.documents.length > 0 && (
          <div className="summary-docs">
            <span className="summary-docs-label">
              Atos &amp; cortes gerados nesta sessão ({ledger.documents.length}):
            </span>
            <div className="summary-docs-row">
              {ledger.documents.map((doc) => (
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

        <div className="summary-actions">
          <button
            type="button"
            className="btn-voice"
            disabled={busy}
            onClick={() => void handleShare("copy")}
          >
            <Copy size={16} />
            {statusMsg || "Copiar Boletim p/ WhatsApp"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void handleShare("download")}
          >
            <Download size={16} />
            Baixar PNG
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onClose();
              onRestart();
            }}
          >
            <RotateCcw size={16} />
            Nova Audiência
          </button>
        </div>

        <div className="trinca-bar">
          <span className="trinca-label">VISITE OS VIZINHOS DA TRINCA CAÓTICA</span>
          <div className="trinca-links">
            <a
              href="https://gabinetedovava.pages.dev"
              target="_blank"
              rel="noreferrer"
              className="trinca-pill"
            >
              Gab. 412 · Dr. Vavá <ExternalLink size={11} />
            </a>
            <a
              href="https://gabinetedobento.pages.dev"
              target="_blank"
              rel="noreferrer"
              className="trinca-pill"
            >
              Gab. 717 · Prof. Bento <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
