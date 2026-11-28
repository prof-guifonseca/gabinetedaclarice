import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  Clapperboard,
  FileText,
  Mic,
  MicOff,
  Send,
  Share2,
  ShoppingBag,
} from "lucide-react";
import type { ChatEntry } from "../hooks/useGptLiveSession";
import type {
  AvatarMood,
  CabinetDocument,
  SuggestedMove,
} from "../shared/gameState";
import { ActionDeck } from "./ActionDeck";
import {
  generateQuoteCard,
  shareImageNativeOrCopy,
} from "../utils/shareCardGenerator";

interface TaquigrafiaPanelProps {
  entries: ChatEntry[];
  headlineTicker: string;
  scenarioBadge: string;
  suggestedMoves: SuggestedMove[];
  isLive: boolean;
  isSendingText: boolean;
  micCutSecondsLeft: number;
  onSendText: (message: string) => void;
  onToggleVoiceCall: () => void;
  onInspectDocument: (doc: CabinetDocument) => void;
}

function getDocumentCardMeta(doc: CabinetDocument): {
  variant: "is-reels" | "is-hotmart" | "is-denuncia";
  tag: string;
  cta: string;
  title: string;
  subtitle: string;
} {
  if (doc.action.type === "gravar_corte_reels") {
    return {
      variant: "is-reels",
      tag: `● CORTE VIRAL · ${doc.action.viewsEstimadas} VIEWS`,
      cta: "Ver Reels & PNG →",
      title: doc.action.tituloViral,
      subtitle: `${doc.action.hashtag} · ${doc.action.legendaCorte.slice(0, 88)}`,
    };
  }
  if (doc.action.type === "lancar_oferta_hotmart") {
    return {
      variant: "is-hotmart",
      tag: `HOTMART VIP · ${doc.action.cupom} · +R$ ${doc.action.valorFaturadoK}k`,
      cta: "Ver Oferta & PNG →",
      title: `${doc.action.nomeProduto} (${doc.action.parcela})`,
      subtitle: doc.action.modulosBonus.slice(0, 96),
    };
  }
  return {
    variant: "is-denuncia",
    tag: `ESCOLA SEM DOUTRINAÇÃO · ${doc.action.protocolo}`,
    cta: "Abrir Ofício & PNG →",
    title: doc.action.instituicao,
    subtitle: doc.action.acusacaoAbsurda.slice(0, 96),
  };
}

export function TaquigrafiaPanel({
  entries,
  headlineTicker,
  scenarioBadge,
  suggestedMoves,
  isLive,
  isSendingText,
  micCutSecondsLeft,
  onSendText,
  onToggleVoiceCall,
  onInspectDocument,
}: TaquigrafiaPanelProps) {
  const [draft, setDraft] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [copiedMeta, setCopiedMeta] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const isInputBlocked = isSendingText || micCutSecondsLeft > 0;

  // Bulletproof scroll-to-bottom on every entry delta, inline act card, typing indicator, or viewport/keyboard resize
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const scrollToBottom = () => {
      feed.scrollTop = feed.scrollHeight;
    };
    const raf1 = requestAnimationFrame(() => {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    });
    const timer = window.setTimeout(scrollToBottom, 80);
    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(timer);
    };
  }, [entries, isSendingText]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const distanceFromBottom =
        feed.scrollHeight - feed.scrollTop - feed.clientHeight;
      if (distanceFromBottom < 140) {
        feed.scrollTop = feed.scrollHeight;
      }
    });
    ro.observe(feed);
    return () => ro.disconnect();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isInputBlocked) return;
    setDraft("");
    onSendText(trimmed);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 2600);
  };

  const handleShareQuote = async (entry: ChatEntry) => {
    if (sharingId) return;
    setSharingId(entry.id);
    try {
      const blob = await generateQuoteCard({
        quote: entry.text,
        mood: (entry.mood as AvatarMood) || "reels",
        badge: scenarioBadge,
      });
      const result = await shareImageNativeOrCopy(
        blob,
        `corte-clarice-${entry.id}.png`,
        "Corte do Gabinete 222 — Gabinete da Clarice",
        `"${entry.text}" — Dep. Prof.ª Clarice Alencar (https://gabinetedaclarice.pages.dev)`
      );
      const label =
        result === "shared"
          ? "Enviado!"
          : result === "copied"
          ? "Copiado!"
          : "PNG salvo!";
      setCopiedMeta({ id: entry.id, label });
      showToast(
        result === "shared"
          ? "Card compartilhado!"
          : result === "copied"
          ? "Card PNG copiado! Cole no WhatsApp."
          : "Card PNG salvo no seu dispositivo!"
      );
      window.setTimeout(() => {
        setCopiedMeta((curr) => (curr?.id === entry.id ? null : curr));
      }, 2600);
    } catch {
      showToast("Não foi possível gerar o card agora.");
    } finally {
      setSharingId(null);
    }
  };

  return (
    <section
      className="panel-card chat-card"
      aria-label="Transcrição do Estúdio-Gabinete 222"
    >
      <div className="tv-ticker-bar" aria-live="polite" title={headlineTicker}>
        <span className="tv-ticker-tag">● REELS LIVE</span>
        <span className="tv-ticker-text">{headlineTicker}</span>
      </div>

      {toastMsg && (
        <div className="chat-toast" role="status">
          {toastMsg}
        </div>
      )}

      <div className="chat-feed" ref={feedRef}>
        {entries.map((entry) => {
          if (entry.document) {
            const doc = entry.document;
            const meta = getDocumentCardMeta(doc);
            return (
              <button
                key={entry.id}
                type="button"
                className={`inline-doc-card ${meta.variant}`}
                onClick={() => onInspectDocument(doc)}
              >
                <div className="inline-doc-top">
                  <span className="inline-doc-tag">
                    {doc.action.type === "gravar_corte_reels" ? (
                      <Clapperboard size={12} />
                    ) : doc.action.type === "lancar_oferta_hotmart" ? (
                      <ShoppingBag size={12} />
                    ) : (
                      <FileText size={12} />
                    )}
                    {meta.tag}
                  </span>
                  <span className="inline-doc-cta">{meta.cta}</span>
                </div>
                <strong className="inline-doc-title">{meta.title}</strong>
                <span className="inline-doc-sub">{meta.subtitle}</span>
              </button>
            );
          }

          if (entry.role === "system") {
            return (
              <div key={entry.id} className="msg-bubble is-system">
                {entry.text}
              </div>
            );
          }

          const isAssistant = entry.role === "assistant";
          const canShare = isAssistant && entry.text.trim().length >= 24;
          const isBusy = sharingId === entry.id;
          const isDone = copiedMeta?.id === entry.id;

          return (
            <article
              key={entry.id}
              className={`msg-bubble ${
                isAssistant ? "is-assistant" : "is-user"
              }`}
            >
              <div className="msg-meta">
                <span>{isAssistant ? "Dep. Clarice" : "Você"}</span>
                <div className="msg-meta-right">
                  {canShare && (
                    <button
                      type="button"
                      className={`quote-share-btn ${isDone ? "is-done" : ""}`}
                      disabled={isBusy}
                      onClick={() => void handleShareQuote(entry)}
                      title="Gerar card PNG 'Corte do Gabinete 222' para WhatsApp"
                    >
                      {isBusy ? (
                        "Gerando..."
                      ) : isDone ? (
                        <>
                          <Check size={11} /> {copiedMeta.label}
                        </>
                      ) : (
                        <>
                          <Share2 size={11} /> Corte
                        </>
                      )}
                    </button>
                  )}
                  <span className="msg-time">{entry.timestamp}</span>
                </div>
              </div>
              <div className="msg-text">{entry.text}</div>
            </article>
          );
        })}

        {isSendingText && (
          <div className="msg-bubble is-system is-typing">
            Dep. Clarice está ajustando o ring light pra responder...
          </div>
        )}
      </div>

      <ActionDeck
        moves={suggestedMoves}
        disabled={isInputBlocked}
        onPickMove={(prompt) => {
          if (!isInputBlocked) onSendText(prompt);
        }}
      />

      <form className="chat-composer" onSubmit={handleSubmit}>
        <button
          type="button"
          className={`composer-mic-btn ${isLive ? "is-live" : ""}`}
          onClick={onToggleVoiceCall}
          title={isLive ? "Encerrar voz ao vivo" : "Falar por voz ao vivo"}
          aria-label={isLive ? "Encerrar voz ao vivo" : "Falar por voz ao vivo"}
        >
          {isLive ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <input
          type="text"
          className="chat-input"
          value={draft}
          disabled={micCutSecondsLeft > 0}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            micCutSecondsLeft > 0
              ? `Gravando corte pro Reels (${micCutSecondsLeft}s)...`
              : isLive
              ? "Fale ou digite aqui..."
              : "Fale com a Dep. Clarice..."
          }
          maxLength={1200}
        />

        <button
          type="submit"
          className="btn-send"
          disabled={!draft.trim() || isInputBlocked}
          aria-label="Enviar mensagem"
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
