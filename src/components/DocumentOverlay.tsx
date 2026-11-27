import { useState } from "react";
import { Copy, Download, MessageSquareWarning, X } from "lucide-react";
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
            ? "Imagem copiada! Cole no WhatsApp."
            : "PNG salvo!"
        );
      }
      window.setTimeout(() => setShareFeedback(null), 2600);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Documento do Estúdio-Gabinete 222"
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
          <strong>
            {doc.action.type === "gravar_corte_reels"
              ? "CORTE VIRAL — REELS & SHORTS"
              : doc.action.type === "protocolar_denuncia_escola"
              ? "CANAL ESCOLA SEM DOUTRINAÇÃO"
              : "OFERTA RELÂMPAGO — HOTMART VIP"}
          </strong>
          <small>
            Registro {doc.createdAt} · Turno {doc.turn} · Sátira 100% ficcional
          </small>
        </div>

        <div className="paper-body">
          {doc.action.type === "gravar_corte_reels" && (() => {
            const reels = doc.action;
            return (
              <>
                <div className="paper-stamp is-rose">CORTE NO AR</div>
                <p className="paper-mono">
                  ● VIRALIZOU · {reels.viewsEstimadas} VIEWS · {reels.hashtag}
                </p>
                <h4 className="paper-dossier-title">{reels.tituloViral}</h4>
                <div className="jabuti-box">
                  <span className="jabuti-label">
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
              </>
            );
          })()}

          {doc.action.type === "protocolar_denuncia_escola" && (() => {
            const den = doc.action;
            return (
              <>
                <div className="paper-stamp is-rose">NOTIFICADO</div>
                <p className="paper-mono">PROTOCOLO: {den.protocolo}</p>
                <p className="paper-paragraph">
                  <strong>Instituição / Alvo:</strong> {den.instituicao}
                </p>
                <p className="paper-paragraph">
                  <strong>Ocorrência registrada:</strong> {den.acusacaoAbsurda}
                </p>
                <div className="jabuti-box">
                  <span className="jabuti-label">
                    MEDIDA CORRETIVA PROPOSTA:
                  </span>
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
              </>
            );
          })()}

          {doc.action.type === "lancar_oferta_hotmart" && (() => {
            const offer = doc.action;
            return (
              <>
                <div className="paper-stamp is-green">CARRINHO ABERTO</div>
                <p className="paper-mono">
                  CUPOM: {offer.cupom} · FATURAMENTO +R$ {offer.valorFaturadoK}k
                </p>
                <div className="paper-amount">{offer.parcela}</div>
                <p className="paper-paragraph">
                  <strong>Produto:</strong> {offer.nomeProduto}
                </p>
                <div className="jabuti-box">
                  <span className="jabuti-label">
                    MÓDULOS BÔNUS EXCLUSIVOS (LINK NA BIO):
                  </span>
                  <p>{offer.modulosBonus}</p>
                  {onConfrontDocument && (
                    <button
                      type="button"
                      className="btn-confront-jabuti"
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
              </>
            );
          })()}
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
            {shareFeedback || "Copiar p/ WhatsApp"}
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
