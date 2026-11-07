/**
 * "Tower of the Day" image: the player's finished 3D tower plus spoiler-free stats,
 * composed on a 2D canvas at 1080×1350 (good for Instagram/X/Discord previews).
 */
import type { MatchSummary } from "@triviatowers/shared-types";

const W = 1080;
const H = 1350;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderShareCard(opts: {
  summary: MatchSummary;
  name: string;
  streak: number;
  towerImage: string | null;
  site: string;
  /** Background gradient, top to bottom (the player's island sky). */
  sky?: readonly [string, string, string, string];
  skyInk?: string;
}): Promise<Blob | null> {
  const { summary } = opts;
  if (typeof document === "undefined") return null;
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  const [c0, c1, c2, c3] = opts.sky ?? ["#6fbcff", "#a9dcff", "#d7ecff", "#ffe2ef"];
  sky.addColorStop(0, c0);
  sky.addColorStop(0.45, c1);
  sky.addColorStop(0.75, c2);
  sky.addColorStop(1, c3);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Tower render, "cover"-cropped into the middle of the card.
  if (opts.towerImage) {
    try {
      const img = await loadImage(opts.towerImage);
      const box = { x: 0, y: 170, w: W, h: 840 };
      const scale = Math.max(box.w / img.width, box.h / img.height);
      const sw = box.w / scale;
      const sh = box.h / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, box.x, box.y, box.w, box.h);
    } catch {
      /* card still works without the render */
    }
  }

  // Brand header.
  ctx.textAlign = "center";
  ctx.fillStyle = "#3f6fd8";
  ctx.font = '700 84px "Fredoka Variable", system-ui, sans-serif';
  ctx.fillText("TriviaTowers.io", W / 2, 128);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("TriviaTowers.io", W / 2, 120);
  ctx.font = '600 40px "Fredoka Variable", system-ui, sans-serif';
  ctx.fillStyle = opts.skyInk ?? "#1d2747";
  const subtitle =
    summary.mode === "daily" && summary.dailyNumber
      ? `Daily Tower #${summary.dailyNumber}`
      : summary.mode === "endless"
        ? "Endless Tower"
        : "Quick Build";
  ctx.fillText(`${subtitle} · ${opts.name}`, W / 2, 182);

  // Stats card.
  const cardY = 1000;
  ctx.shadowColor = "rgba(29,39,71,0.25)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, 60, cardY, W - 120, 300, 48);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
  ctx.shadowColor = "transparent";

  const stats: [string, string][] = [
    [`${summary.floors}`, summary.floors === 1 ? "floor" : "floors"],
    [`${summary.correct}/${summary.total}`, "correct"],
    [summary.score.toLocaleString("en-US"), "points"],
  ];
  if (opts.streak > 1) stats.push([`${opts.streak}🔥`, "day streak"]);
  const colW = (W - 120) / stats.length;
  stats.forEach(([value, label], i) => {
    const cx = 60 + colW * (i + 0.5);
    ctx.fillStyle = "#1d2747";
    ctx.font = '700 68px "Fredoka Variable", system-ui, sans-serif';
    ctx.fillText(value, cx, cardY + 100);
    ctx.fillStyle = "#4a5578";
    ctx.font = '600 30px "Nunito Variable", system-ui, sans-serif';
    ctx.fillText(label, cx, cardY + 142);
  });

  // Spoiler-free outcome row (most recent 20 for long Endless runs).
  const outcomes = summary.outcomes.slice(-20);
  const n = outcomes.length;
  const size = Math.min(56, (W - 260) / Math.max(1, n) - 10);
  const rowW = n * (size + 10) - 10;
  outcomes.forEach((ok, i) => {
    const x = (W - rowW) / 2 + i * (size + 10);
    roundRect(ctx, x, cardY + 172, size, size, 12);
    ctx.fillStyle = ok ? "#1f9d5c" : "#e23a55";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    const cx = x + size / 2;
    const cy = cardY + 172 + size / 2;
    if (ok) {
      ctx.moveTo(cx - size * 0.22, cy);
      ctx.lineTo(cx - size * 0.05, cy + size * 0.17);
      ctx.lineTo(cx + size * 0.24, cy - size * 0.17);
    } else {
      ctx.moveTo(cx - size * 0.18, cy - size * 0.18);
      ctx.lineTo(cx + size * 0.18, cy + size * 0.18);
      ctx.moveTo(cx + size * 0.18, cy - size * 0.18);
      ctx.lineTo(cx - size * 0.18, cy + size * 0.18);
    }
    ctx.stroke();
  });

  ctx.fillStyle = opts.skyInk ?? "#1d2747";
  ctx.font = '600 34px "Fredoka Variable", system-ui, sans-serif';
  ctx.fillText(`Can you build higher? ${opts.site.replace(/^https?:\/\//, "")}`, W / 2, H - 14);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
