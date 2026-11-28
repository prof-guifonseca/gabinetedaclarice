import {
  classifyVisitorArchetype,
  type AvatarMood,
  type CabinetDocument,
  type SessionLedger,
} from "../shared/gameState";
import { SCENARIOS } from "../shared/scenarios";

const AVATAR_PATHS: Record<AvatarMood, string> = {
  neutro: "/avatars/clarice-neutro.jpg",
  falando: "/avatars/clarice-falando.jpg",
  reels: "/avatars/clarice-reels.jpg",
  crise: "/avatars/clarice-crise.jpg",
  livro: "/avatars/clarice-livro.jpg",
  celular: "/avatars/clarice-celular.jpg",
};

function loadImage(
  src: string,
  timeoutMs = 6000
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let settled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = src;
  });
}

function fitLineWithEllipsis(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number
): string {
  let trimmed = line.replace(/[.,;!?…]*$/, "").trim();
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1).trimEnd();
  }
  return trimmed ? `${trimmed}…` : "…";
}

function breakLongWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number
): string[] {
  if (ctx.measureText(word).width <= maxWidth) return [word];
  const chunks: string[] = [];
  let part = "";
  for (const ch of word) {
    const candidate = `${part}${ch}`;
    if (part && ctx.measureText(candidate).width > maxWidth) {
      chunks.push(part);
      part = ch;
    } else {
      part = candidate;
    }
  }
  if (part) chunks.push(part);
  return chunks;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const normalized = text.trim();
  if (!normalized || maxLines <= 0) return [];
  const rawWords = normalized.split(/\s+/);
  const tokens: string[] = [];
  for (const word of rawWords) {
    tokens.push(...breakLongWord(ctx, word, maxWidth));
  }

  const lines: string[] = [];
  let current = "";
  let truncated = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const test = current ? `${current} ${token}` : token;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) {
        lines.push(current);
        if (lines.length >= maxLines) {
          truncated = true;
          current = "";
          break;
        }
      }
      current = token;
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      truncated = true;
    }
  }

  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = fitLineWithEllipsis(
      ctx,
      lines[lines.length - 1],
      maxWidth
    );
  }
  return lines;
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = "#b83b5e",
  angleRad = -0.14,
  fontSize = 30
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);
  ctx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  const width = ctx.measureText(text).width + 40;
  const height = Math.round(fontSize * 1.9);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.strokeRect(-width / 2, -height / 2, width, height);
  ctx.lineWidth = 2;
  ctx.strokeRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao renderizar PNG."));
    }, "image/png");
  });
}

async function ensureFontsReady(): Promise<void> {
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // proceed with fallback fonts
  }
}

export async function generateQuoteCard(params: {
  quote: string;
  mood: AvatarMood;
  badge?: string;
}): Promise<Blob> {
  await ensureFontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, 1080);
  bg.addColorStop(0, "#10192d");
  bg.addColorStop(1, "#070c18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  const img = await loadImage(AVATAR_PATHS[params.mood] || AVATAR_PATHS.neutro);
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(56, 56, 968, 520);
    ctx.clip();
    const scale = Math.max(968 / img.width, 520 / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(
      img,
      56 + (968 - drawW) / 2,
      56 + (520 - drawH) * 0.18,
      drawW,
      drawH
    );
    const fade = ctx.createLinearGradient(0, 340, 0, 580);
    fade.addColorStop(0, "rgba(11, 17, 32, 0)");
    fade.addColorStop(1, "rgba(11, 17, 32, 0.96)");
    ctx.fillStyle = fade;
    ctx.fillRect(56, 340, 968, 240);
    ctx.restore();
  }

  ctx.strokeStyle = "#d6b26e";
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 1008, 1008);

  ctx.fillStyle = "#c24163";
  ctx.fillRect(82, 82, 355, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillText("● REC • CORTE DO GAB. 222", 102, 111);

  if (params.badge) {
    ctx.fillStyle = "rgba(17, 29, 53, 0.92)";
    ctx.fillRect(710, 82, 288, 44);
    ctx.strokeStyle = "#d6b26e";
    ctx.lineWidth = 2;
    ctx.strokeRect(710, 82, 288, 44);
    ctx.fillStyle = "#f7efe0";
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText(params.badge.toUpperCase().slice(0, 22), 854, 111, 268);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "#d6b26e";
  ctx.font = '700 84px "Playfair Display", Georgia, serif';
  ctx.fillText("“", 76, 638);

  ctx.fillStyle = "#faf6ef";
  ctx.font = '600 38px "Playfair Display", Georgia, serif';
  const lines = wrapText(ctx, params.quote, 880, 6);
  lines.forEach((line, idx) => {
    ctx.fillText(line, 112, 636 + idx * 54);
  });

  ctx.fillStyle = "#152340";
  ctx.fillRect(56, 916, 968, 96);
  ctx.strokeStyle = "#d6b26e";
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 916, 968, 96);

  // Left footer column constrained to maxWidth 560 (x: 80..640) — zero collision with domain on right (x: 670..1000)
  ctx.fillStyle = "#faf6ef";
  ctx.font = '700 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Dep. Prof.ª Clarice "Clá" Alencar (PFM/SC)', 80, 955, 560);

  ctx.fillStyle = "#d6b26e";
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillText("FRENTE DA FAMÍLIA & COSTUMES • GAB. 222", 80, 989, 560);

  ctx.fillStyle = "#dce6f7";
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.textAlign = "right";
  ctx.fillText("gabinetedaclarice.pages.dev", 1000, 975, 330);
  ctx.textAlign = "left";

  return canvasToBlob(canvas);
}

export async function generateDocumentCard(doc: CabinetDocument): Promise<Blob> {
  await ensureFontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#faf6ef";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.strokeStyle = "#131f38";
  ctx.lineWidth = 6;
  ctx.strokeRect(42, 42, 996, 996);
  ctx.strokeStyle = "#b79047";
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, 968, 968);

  ctx.fillStyle = "#131f38";
  ctx.textAlign = "center";
  ctx.font = '700 21px "JetBrains Mono", monospace';
  ctx.fillText("ESTÚDIO-GABINETE 222 • ANEXO IV • BRASÍLIA - DF", 540, 112);

  const isReels = doc.action.type === "gravar_corte_reels";
  const isDenuncia = doc.action.type === "protocolar_denuncia_escola";

  ctx.font = '700 42px "Playfair Display", Georgia, serif';
  ctx.fillText(
    isReels
      ? "CORTE VIRAL — REELS & SHORTS"
      : isDenuncia
      ? "CANAL ESCOLA SEM DOUTRINAÇÃO"
      : "OFERTA RELÂMPAGO — HOTMART VIP",
    540,
    170
  );

  ctx.fillStyle = "#5a647a";
  ctx.font = '500 19px "JetBrains Mono", monospace';
  ctx.fillText(
    `REGISTRO ${doc.createdAt} • TURNO ${doc.turn} • SÁTIRA 100% FICCIONAL`,
    540,
    210
  );

  ctx.strokeStyle = "#131f38";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(90, 236);
  ctx.lineTo(990, 236);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#131f38";

  if (doc.action.type === "gravar_corte_reels") {
    // Wrap views + hashtags cleanly left of the CORTE NO AR stamp
    ctx.fillStyle = "#c24163";
    ctx.font = '700 22px "JetBrains Mono", monospace';
    const metaLines = wrapText(
      ctx,
      `● VIRALIZOU • ${doc.action.viewsEstimadas} VIEWS • ${doc.action.hashtag}`,
      560,
      2
    );
    metaLines.forEach((l, i) => ctx.fillText(l, 96, 286 + i * 30));

    drawStamp(ctx, "CORTE NO AR", 830, 302, "#c24163", -0.12, 26);

    ctx.fillStyle = "#131f38";
    ctx.font = '700 46px "Playfair Display", Georgia, serif';
    const titleLines = wrapText(ctx, doc.action.tituloViral, 880, 4);
    titleLines.forEach((l, i) => ctx.fillText(l, 96, 392 + i * 56));

    ctx.fillStyle = "#eef2f9";
    ctx.fillRect(96, 636, 888, 196);
    ctx.strokeStyle = "#c24163";
    ctx.lineWidth = 2;
    ctx.strokeRect(96, 636, 888, 196);

    ctx.fillStyle = "#c24163";
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText("LEGENDA FIXADA PELO ENZO DO TRIPÉ:", 118, 676);

    ctx.fillStyle = "#1e2a45";
    ctx.font = '500 24px "Plus Jakarta Sans", system-ui, sans-serif';
    const legLines = wrapText(ctx, doc.action.legendaCorte, 844, 4);
    legLines.forEach((l, i) => ctx.fillText(l, 118, 720 + i * 32));
  } else if (doc.action.type === "protocolar_denuncia_escola") {
    ctx.font = '700 24px "JetBrains Mono", monospace';
    ctx.fillText(`PROTOCOLO: ${doc.action.protocolo}`, 96, 296, 540);

    ctx.font = '700 34px "Playfair Display", Georgia, serif';
    const instLines = wrapText(
      ctx,
      `NOTIFICADO: ${doc.action.instituicao}`,
      880,
      2
    );
    instLines.forEach((l, i) => ctx.fillText(l, 96, 366 + i * 44));

    ctx.font = '500 28px "Plus Jakarta Sans", system-ui, sans-serif';
    const acusLines = wrapText(
      ctx,
      `Ocorrência: ${doc.action.acusacaoAbsurda}`,
      880,
      5
    );
    acusLines.forEach((l, i) => ctx.fillText(l, 96, 474 + i * 38));

    ctx.fillStyle = "#f2e7d5";
    ctx.fillRect(96, 686, 888, 160);
    ctx.strokeStyle = "#b79047";
    ctx.lineWidth = 2;
    ctx.strokeRect(96, 686, 888, 160);

    ctx.fillStyle = "#8a6321";
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText("MEDIDA CORRETIVA PROPOSTA:", 118, 724);

    ctx.fillStyle = "#2b2114";
    ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
    const penLines = wrapText(ctx, doc.action.penalidadeProposta, 844, 3);
    penLines.forEach((l, i) => ctx.fillText(l, 118, 764 + i * 32));

    drawStamp(ctx, "NOTIFICADO", 800, 306, "#b83b5e", 0.12, 28);
  } else {
    ctx.fillStyle = "#1f7a5a";
    ctx.font = '700 23px "JetBrains Mono", monospace';
    const couponLines = wrapText(
      ctx,
      `CUPOM: ${doc.action.cupom} • FATURAMENTO +R$ ${doc.action.valorFaturadoK}k`,
      880,
      2
    );
    couponLines.forEach((l, i) => ctx.fillText(l, 96, 290 + i * 30));

    ctx.fillStyle = "#131f38";
    ctx.font = '700 42px "Playfair Display", Georgia, serif';
    const prodLines = wrapText(ctx, doc.action.nomeProduto, 880, 3);
    prodLines.forEach((l, i) => ctx.fillText(l, 96, 368 + i * 50));

    // Keep parcela cleanly left of CARRINHO ABERTO stamp (maxWidth 470: x=96..566, stamp x=650..960)
    ctx.fillStyle = "#1f7a5a";
    ctx.font = '700 44px "JetBrains Mono", monospace';
    ctx.fillText(doc.action.parcela, 96, 560, 470);

    drawStamp(ctx, "CARRINHO ABERTO", 805, 545, "#1f7a5a", -0.1, 25);

    ctx.fillStyle = "#eef7f3";
    ctx.fillRect(96, 622, 888, 210);
    ctx.strokeStyle = "#1f7a5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(96, 622, 888, 210);

    ctx.fillStyle = "#1f7a5a";
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText("MÓDULOS BÔNUS EXCLUSIVOS (LINK NA BIO):", 118, 662);

    ctx.fillStyle = "#163529";
    ctx.font = '500 24px "Plus Jakarta Sans", system-ui, sans-serif';
    const modLines = wrapText(ctx, doc.action.modulosBonus, 844, 4);
    modLines.forEach((l, i) => ctx.fillText(l, 118, 706 + i * 34));
  }

  ctx.strokeStyle = "#131f38";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 932);
  ctx.lineTo(540, 932);
  ctx.stroke();

  ctx.fillStyle = "#131f38";
  ctx.font = '700 22px "Playfair Display", Georgia, serif';
  ctx.fillText('Dep. Prof.ª Clarice "Clá" Alencar (PFM/SC)', 96, 966, 530);

  ctx.fillStyle = "#5a647a";
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.textAlign = "right";
  ctx.fillText("gabinetedaclarice.pages.dev", 984, 966, 340);
  ctx.textAlign = "left";

  return canvasToBlob(canvas);
}

export async function generateDossierCard(ledger: SessionLedger): Promise<Blob> {
  await ensureFontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  const arch = classifyVisitorArchetype(ledger);
  const scenario = SCENARIOS[ledger.scenarioId] ?? SCENARIOS.livre;

  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, "#0b1120");
  bg.addColorStop(1, "#182441");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.strokeStyle = "#d6b26e";
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 1008, 1008);

  // Constrain dossier header left of portrait box (portrait starts at x=756, leave 40px gutter -> maxWidth 640)
  ctx.fillStyle = "#d6b26e";
  ctx.font = '700 20px "JetBrains Mono", monospace';
  const headerLines = wrapText(
    ctx,
    `BOLETIM DA GUERRA CULTURAL • ${scenario.title.toUpperCase()}`,
    640,
    2
  );
  headerLines.forEach((l, i) => ctx.fillText(l, 76, 98 + i * 28));

  const mood = ledger.bestQuote?.mood || "reels";
  const img = await loadImage(AVATAR_PATHS[mood] || AVATAR_PATHS.neutro);
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(756, 76, 248, 248, 16);
    ctx.clip();
    ctx.drawImage(img, 756, 76, 248, 248);
    ctx.restore();
    ctx.strokeStyle = "#d6b26e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(756, 76, 248, 248, 16);
    ctx.stroke();
  }

  const titleStartY = headerLines.length > 1 ? 192 : 176;
  ctx.fillStyle = "#faf6ef";
  ctx.font = '700 46px "Playfair Display", Georgia, serif';
  const titleLines = wrapText(ctx, arch.title, 640, 2);
  titleLines.forEach((l, i) => ctx.fillText(l, 76, titleStartY + i * 54));

  const subStartY = titleStartY + titleLines.length * 54 + 14;
  ctx.fillStyle = "#c8d2e6";
  ctx.font = '500 24px "Plus Jakarta Sans", system-ui, sans-serif';
  const subLines = wrapText(ctx, arch.subtitle, 640, 3);
  subLines.forEach((l, i) => ctx.fillText(l, 76, subStartY + i * 34));

  const stats = [
    {
      label: "CORTES VIRAIS",
      value: `${ledger.meters.cortesVirais}%`,
      color: "#d6b26e",
    },
    {
      label: "PARADOXO TRADWIFE",
      value: `${ledger.meters.paradoxoTradwife}%`,
      color: "#e25d7d",
    },
    {
      label: "FUNIL HOTMART",
      value: `R$ ${ledger.meters.faturamentoHotmartK}k`,
      color: "#38b688",
    },
    {
      label: "COMPOSTURA FINAL",
      value: `${ledger.meters.compostura}%`,
      color: "#a8c1f0",
    },
  ];

  stats.forEach((st, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 76 + col * 474;
    const y = 420 + row * 124;
    ctx.fillStyle = "rgba(250, 246, 239, 0.05)";
    ctx.fillRect(x, y, 454, 102);
    ctx.strokeStyle = "rgba(214, 178, 110, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 454, 102);

    ctx.fillStyle = "#9aa9c4";
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(st.label, x + 22, y + 36);

    ctx.fillStyle = st.color;
    ctx.font = '700 42px "JetBrains Mono", monospace';
    ctx.fillText(st.value, x + 22, y + 84);
  });

  const quoteText =
    ledger.bestQuote?.text ||
    "O feminismo prometeu empoderamento e entregou burnout e boleto de terapia — link da Mentoria na bio!";
  ctx.fillStyle = "rgba(21, 35, 64, 0.72)";
  ctx.fillRect(76, 686, 928, 210);
  ctx.strokeStyle = "rgba(214, 178, 110, 0.45)";
  ctx.strokeRect(76, 686, 928, 210);

  ctx.fillStyle = "#d6b26e";
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText("CORTE DE DESTAQUE DO GABINETE 222:", 104, 724);

  ctx.fillStyle = "#faf6ef";
  ctx.font = 'italic 29px "Playfair Display", Georgia, serif';
  const qLines = wrapText(ctx, `“${quoteText}”`, 872, 4);
  qLines.forEach((l, i) => ctx.fillText(l, 104, 770 + i * 38));

  drawStamp(ctx, arch.stamp, 810, 954, "#d6b26e", -0.08, 26);

  ctx.fillStyle = "#c8d2e6";
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText("gabinetedaclarice.pages.dev", 76, 976, 500);

  return canvasToBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function copyImageOrDownload(
  blob: Blob,
  filename: string
): Promise<"copied" | "downloaded"> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      "write" in navigator.clipboard &&
      typeof ClipboardItem !== "undefined"
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return "copied";
    }
  } catch {
    // fall back to download
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

export async function shareImageNativeOrCopy(
  blob: Blob,
  filename: string,
  title = "Gabinete da Clarice",
  text = "Olha o que a Dep. Clarice aprontou no Gabinete 222: https://gabinetedaclarice.pages.dev"
): Promise<"shared" | "copied" | "downloaded" | "cancelled"> {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof File !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      const file = new File([blob], filename, { type: "image/png" });
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title, text });
        return "shared";
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
  }
  return copyImageOrDownload(blob, filename);
}
