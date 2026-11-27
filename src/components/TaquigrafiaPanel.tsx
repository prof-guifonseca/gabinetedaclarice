import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Mic, MicOff, Send, Share2 } from "lucide-react";
import type { ChatEntry } from "../hooks/useGptLiveSession";
import type { AvatarMood, SuggestedMove } from "../shared/gameState";
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
}: TaquigrafiaPanelProps) {
  const [draft, setDraft] = useState("");
  const [copiedMeta, setCopiedMeta] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const isInputBlocked = isSendingText || micCutSecondsLeft > 0;

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries, isSendingText]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isInputBlocked) return;
    setDraft("");
    onSendText(trimmed);
  };

  const handleShareQuote = async (entry: ChatEntry) => {
    try {
      const blob = await generateQuoteCard({
        quote: entry.text,
        mood: (entry.mood as AvatarMood) || "falando",
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
      window.setTimeout(() => {
        setCopiedMeta((curr) => (curr?.id === entry.id ? null : curr));
      }, 2400);
    } catch {
      // ignore canvas errors
    }
  };

  return (
    <section
      className="panel-card chat-card"
      aria-label="Transcrição do Estúdio-Gabinete 222"
    >
      <div className="tv-ticker-bar" aria-live="polite">
        <span className="tv-ticker-tag">● REELS LIVE</span>
        <span className="tv-ticker-text">{headlineTicker}</span>
      </div>

      <div className="chat-feed" ref={feedRef}>
        {entries.map((entry) => {
          if (entry.role === "system") {
            return (
              <div key={entry.id} className="msg-bubble is-system">
                {entry.text}
              </div>
            );
          }

          const isAssistant = entry.role === "assistant";
          const canShare = isAssistant && entry.text.trim().length >= 24;

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
                      className={`quote-share-btn ${
                        copiedMeta?.id === entry.id ? "is-done" : ""
                      }`}
                      onClick={() => void handleShareQuote(entry)}
                      title="Gerar card PNG 'Corte do Gabinete 222' para WhatsApp"
                    >
                      {copiedMeta?.id === entry.id ? (
                        <>
                          <Check size={11} /> {copiedMeta.label}
                        </>
                      ) : (
                        <>
                          <Share2 size={11} /> Aspas
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
              ? `Gravando corte pro Reels — mic silenciado (${micCutSecondsLeft}s)...`
              : isLive
              ? "Fale no microfone ou mande um recado aqui..."
              : "Converse com a Dep. Clarice ou escolha uma Carta na Manga..."
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
