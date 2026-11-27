# Gabinete da Clarice — Gabinete 222 · Anexo IV

Terceira peça da **Trinca Caótica do Anexo IV** (ao lado do [Gabinete do Vavá](https://gabinetedovava.pages.dev) e do [Gabinete do Bento](https://gabinetedobento.pages.dev)): sátira política 100% ficcional estrelada pela **Dep. Prof.ª Clarice "Clá" Alencar (PFM/SC)** — Vice-Líder da Frente da Família & Costumes, autora de best-seller de guerra cultural e dona da *Mentoria Esposa de Alto Valor (12x de R$ 197)*.

## Arquitetura 2.0 (Dual-Brain + Voz Customizada)

- **Chat Escrito com Streaming SSE:** `POST /api/chat` (`gpt-6-luna`), respostas curtas adaptativas (~150–220 caracteres).
- **AI Director Estruturado:** `POST /api/director` (`json_schema` estrito + fallback heurístico) controlando 6 expressões, 4 medidores diegéticos (*Cortes Virais*, *Paradoxo Tradwife*, *Faturamento Hotmart*, *Compostura*), ações físicas (*Corte pro Reels*, *Canal Escola Sem Doutrinação*, *Oferta Hotmart*, *Batida do Livro*, *Ring Light + Silenciamento*), cooldown algorítmico de bordões e *Cartas na Manga* em 1ª pessoa.
- **Voz ao Vivo WebRTC (`gpt-live-1.1`):** voz feminina brasileira customizada `DeputadaClariceBR34`, Standby Mode (`wake_policy: speech`, `idle_timeout_s: 20`) e injeção de eventos de bastidor ao vivo.
- **Fábrica de Cards PNG 1080×1080:** Aspas, Thumbnails de Reels, Ofícios, Cupons Hotmart e Boletim Final prontos para WhatsApp (Web Share API + fallback clipboard/download).

## Desenvolvimento Local

```bash
cp .dev.vars.example .dev.vars
# Preencha OPENAI_API_KEY em .dev.vars
npm install
npm run cf-typegen
npm run dev
```

## Testes e Deploy (Cloudflare Pages)

```bash
npm run check
npm test
npm run build:pages
```
