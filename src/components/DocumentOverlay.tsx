import { useState } from "react";
import {
  BadgeCheck,
  Clapperboard,
  Copy,
  Download,
  Eye,
  MessageSquareWarning,
  ShoppingBag,
  Tag,
  X,
} from "lucide-react";
import type { CabinetDocument } from "../shared/gameState";
import {
  downloadBlob,
  generateDocumentCard,
  shareImageNativeOrCopy,
} from "../utils/shareCardGenerator";

interface DocumentOverlayProps {
  document: CabinetDocument | null;
  onClose: () => void;
  onConfrontDocument?: (prompt: string) => void;
}

export function DocumentOverlay({
  document: doc,
  onClose,
  onConfrontDocument,
}: DocumentOverlayProps) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!doc) return null;

  const handleExport = async (mode: "copy" | "download") => {
    setBusy(true);
    try {
      const blob = await generateDocumentCard(doc);
      const filename = `gabinete-clarice-${doc.action.type}-${doc.turn}.png`;
      if (mode === "download") {
        downloadBlob(blob, filename);
        setShareFeedback("PNG salvo!");
      } else {
        const result = await shareImageNativeOrCopy(
          blob,
          filename,
          "Documento do Gabinete da Clarice",
          "Olha o que a Dep. Clarice disparou no Gabinete 222: https://gabinetedaclarice.pages.dev"
        );
        setShareFeedback(
          result === "shared"
            ? "Compartilhado!"
            : result === "copied"
            ? "Copiado!"
            : "PNG salvo!"
        );
      }
      window.setTimeout(() => setShareFeedback(null), 2600);
    } finally {
      setBusy(false);
    }
  };

  // Visual 1: Native Dark Reels / Viral Clip Card
  if (doc.action.type === "gravar_corte_reels") {
    const reels = doc.action;
    return (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Corte Viral — Reels & Shorts"
        onClick={onClose}
      >
        <div
          className="reels-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="reels-modal-header">
            <span className="reels-rec-badge">
              <Clapperboard size={13} /> ● CORTE NO AR · REELS
            </span>
            <button
              type="button"
              className="icon-close-btn"
              onClick={onClose}
              aria-label="Fechar corte"
            >
              <X size={18} />
            </button>
          </div>

          <div className="reels-author-row">
            <img
              src="/avatars/clarice-reels.jpg"
              alt="Dep. Clarice Alencar"
              className="reels-avatar-thumb"
            />
            <div className="reels-author-info">
              <strong>
                @dep.clarice.oficial <BadgeCheck size={14} className="verified-icon" />
              </strong>
              <span>
                Estúdio-Gabinete 222 · Turno {doc.turn} · {doc.createdAt}
              </span>
            </div>
            <span className="reels-views-pill">
              <Eye size={12} /> {reels.viewsEstimadas}
            </span>
          </div>

          <div className="reels-thumb-box">
            <span className="reels-thumb-kicker">{reels.hashtag}</span>
            <h4 className="reels-thumb-title">{reels.tituloViral}</h4>
          </div>

          <div className="reels-caption-box">
            <span className="reels-caption-label">
              LEGENDA FIXADA PELO ENZO DO TRIPÉ:
            </span>
            <p>{reels.legendaCorte}</p>
            {onConfrontDocument && (
              <button
                type="button"
                className="btn-confront-jabuti"
                onClick={() => {
                  onConfrontDocument(
                    `Ei, Deputada! Que título sensacionalista é esse no Reels: "${reels.tituloViral}"?! Vocês cortaram minha fala fora de contexto!`
                  );
                  onClose();
                }}
              >
                <MessageSquareWarning size={14} />
                Rebater esse Corte ao vivo!
              </button>
            )}
          </div>

          <div className="reels-modal-actions">
            <button
              type="button"
              className="btn-voice"
              disabled={busy}
              onClick={() => void handleExport("copy")}
            >
              <Copy size={15} />
              {shareFeedback || "Copiar PNG"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void handleExport("download")}
            >
              <Download size={15} />
              Baixar PNG
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Visual 2: Hotmart Flash-Sale Checkout Card
  if (doc.action.type === "lancar_oferta_hotmart") {
    const offer = doc.action;
    return (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Oferta Relâmpago Hotmart VIP"
        onClick={onClose}
      >
        <div
          className="hotmart-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="hotmart-modal-header">
            <span className="hotmart-live-badge">
              <ShoppingBag size={13} /> CARRINHO ABERTO · HOTMART VIP
            </span>
            <button
              type="button"
              className="icon-close-btn"
              onClick={onClose}
              aria-label="Fechar oferta"
            >
              <X size={18} />
            </button>
          </div>

          <div className="hotmart-coupon-row">
            <span className="hotmart-coupon-pill">
              <Tag size={12} /> CUPOM: {offer.cupom}
            </span>
            <span className="hotmart-revenue-pill">
              +R$&nbsp;{offer.valorFaturadoK}k no funil
            </span>
          </div>

          <div className="hotmart-offer-hero">
            <span className="hotmart-kicker">
              DEP. PROF.ª CLARICE ALENCAR · LINK NA BIO
            </span>
            <h4>{offer.nomeProduto}</h4>
            <div className="hotmart-price-display">{offer.parcela}</div>
            <small>
              Registro {doc.createdAt} · Turno {doc.turn} · Sátira 100% ficcional
            </small>
          </div>

          <div className="hotmart-bonus-box">
            <span className="hotmart-bonus-label">
              MÓDULOS BÔNUS EXCLUSIVOS DA TURMA VIP:
            </span>
            <p>{offer.modulosBonus}</p>
            {onConfrontDocument && (
              <button
                type="button"
                className="btn-confront-hotmart"
                onClick={() => {
                  onConfrontDocument(
                    `Espera aí, Deputada! Você tá cobrando ${offer.parcela} pra ensinar "${offer.modulosBonus}" enquanto usa o gabinete de estúdio?!`
                  );
                  onClose();
                }}
              >
                <MessageSquareWarning size={14} />
                Confrontar esse Módulo Bônus!
              </button>
            )}
          </div>

          <div className="reels-modal-actions">
            <button
              type="button"
              className="btn-hotmart-primary"
              disabled={busy}
              onClick={() => void handleExport("copy")}
            >
              <Copy size={15} />
              {shareFeedback || "Copiar PNG"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => void handleExport("download")}
            >
              <Download size={15} />
              Baixar PNG
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Visual 3: Official Paper Notice — Canal Escola Sem Doutrinação
  const den = doc.action;
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Ofício do Canal Escola Sem Doutrinação"
      onClick={onClose}
    >
      <div className="paper-document" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="paper-close-btn"
          onClick={onClose}
          aria-label="Fechar documento"
        >
          <X size={18} />
        </button>

        <div className="paper-masthead">
          <span>ESTÚDIO-GABINETE 222 · ANEXO IV · BRASÍLIA</span>
          <strong>CANAL ESCOLA SEM DOUTRINAÇÃO</strong>
          <small>
            Registro {doc.createdAt} · Turno {doc.turn} · Sátira 100% ficcional
          </small>
        </div>

        <div className="paper-body">
          <div className="paper-stamp is-rose">NOTIFICADO</div>
          <p className="paper-mono">PROTOCOLO: {den.protocolo}</p>
          <p className="paper-paragraph">
            <strong>Instituição / Alvo:</strong> {den.instituicao}
          </p>
          <p className="paper-paragraph">
            <strong>Ocorrência registrada:</strong> {den.acusacaoAbsurda}
          </p>
          <div className="jabuti-box">
            <span className="jabuti-label">MEDIDA CORRETIVA PROPOSTA:</span>
            <p>{den.penalidadeProposta}</p>
            {onConfrontDocument && (
              <button
                type="button"
                className="btn-confront-jabuti"
                onClick={() => {
                  onConfrontDocument(
                    `Deputada, esse ofício ${den.protocolo} é um absurdo! Como assim "${den.acusacaoAbsurda}"?! Isso é censura pura!`
                  );
                  onClose();
                }}
              >
                <MessageSquareWarning size={14} />
                Contestar essa Notificação!
              </button>
            )}
          </div>
        </div>

        <div className="paper-signature">
          <span>Dep. Prof.ª Clarice &ldquo;Clá&rdquo; Alencar (PFM/SC)</span>
          <small>Gabinete 222 · Frente da Família &amp; Costumes</small>
        </div>

        <div className="paper-actions">
          <button
            type="button"
            className="btn-paper-primary"
            disabled={busy}
            onClick={() => void handleExport("copy")}
          >
            <Copy size={15} />
            {shareFeedback || "Copiar PNG"}
          </button>
          <button
            type="button"
            className="btn-paper-secondary"
            disabled={busy}
            onClick={() => void handleExport("download")}
          >
            <Download size={15} />
            Baixar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
