"use client";

import { Download, ImagePlus, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { cn } from "../../lib/cn";
import { downloadCanvasPng } from "../../lib/download-doc";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

type BannerTexts = { titlu: string; subtitlu: string; smsNumar: string; smsCuvant: string; link: string };
type PhotoAdjust = { panX: number; panY: number; zoom: number };

type Format = { key: string; w: number; h: number };

const FORMATS: Format[] = [
  { key: "sms", w: 1080, h: 400 },
  { key: "instaPost", w: 1080, h: 1080 },
  { key: "instaStory", w: 1080, h: 1920 },
  { key: "facebook", w: 1200, h: 630 },
  { key: "twitter", w: 1200, h: 675 },
  { key: "linkedin", w: 1200, h: 627 },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Micșorează fontul până textul încape pe maxWidth. Setează ctx.font. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  startSize: number,
  minSize: number,
  maxWidth: number,
) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px "${family}"`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${weight} ${size}px "${family}"`;
  return size;
}

/** Poză cu pan/zoom într-un dreptunghi (x,y,w,h) — cover-fit, apoi decupată/mutată după reglajele omului. */
function drawCoverImagePZ(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  adjust: PhotoAdjust,
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let baseW: number, baseH: number, sx0: number, sy0: number;
  if (ir > cr) {
    baseH = img.naturalHeight;
    baseW = baseH * cr;
    sx0 = (img.naturalWidth - baseW) / 2;
    sy0 = 0;
  } else {
    baseW = img.naturalWidth;
    baseH = baseW / cr;
    sx0 = 0;
    sy0 = (img.naturalHeight - baseH) / 2;
  }
  const zoom = clamp(adjust.zoom, 1, 3);
  const cropW = baseW / zoom;
  const cropH = baseH / zoom;
  const freeX = (baseW - cropW) / 2;
  const freeY = (baseH - cropH) / 2;
  const sx = sx0 + freeX + clamp(adjust.panX, -1, 1) * freeX;
  const sy = sy0 + freeY + clamp(adjust.panY, -1, 1) * freeY;
  ctx.drawImage(img, sx, sy, cropW, cropH, x, y, w, h);
}

/** Poziționează titlu + subtitlu centrate vertical într-o regiune (fără CTA — CTA-ul se desenează separat, sub bloc). */
function layoutTitle(
  ctx: CanvasRenderingContext2D,
  regionTop: number,
  regionHeight: number,
  titlu: string,
  subtitlu: string,
  opts: {
    titleFamily: string; titleWeight: number; titleMax: number; titleMin: number;
    subFamily: string; subWeight: number; subMax: number; subMin: number;
    maxWidth: number; reserveBelow: number; marginY?: number;
  },
) {
  const titleSize = fitFontSize(ctx, titlu, opts.titleFamily, opts.titleWeight, opts.titleMax, opts.titleMin, opts.maxWidth);
  const subtitleSize = subtitlu
    ? fitFontSize(ctx, subtitlu, opts.subFamily, opts.subWeight, opts.subMax, opts.subMin, opts.maxWidth)
    : 0;
  const gap1 = subtitlu ? titleSize * 0.32 : 0;
  const blockHeight = titleSize * 0.9 + gap1 + subtitleSize * 0.9 + opts.reserveBelow;
  const marginY = opts.marginY ?? 24;
  const startY = regionTop + Math.max(marginY, (regionHeight - blockHeight) / 2);
  const titleBaseline = startY + titleSize * 0.82;
  const subtitleBaseline = titleBaseline + gap1 + subtitleSize * 0.78;
  const ctaTop = (subtitlu ? subtitleBaseline + subtitleSize * 0.4 : titleBaseline + titleSize * 0.4) + Math.max(20, titleSize * 0.35);
  return { titleSize, subtitleSize, titleBaseline, subtitleBaseline, ctaTop };
}

function resetCtx(ctx: CanvasRenderingContext2D) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 1;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** Semnul asociației — o inimă într-un inel subțire — reluat pe toate șabloanele ca ancoră de brand. */
function drawLogoMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.stroke();
  const s = size * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.4);
  ctx.bezierCurveTo(cx - s * 1.15, cy - s * 0.55, cx - s * 0.5, cy - s * 1.3, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.3, cx + s * 1.15, cy - s * 0.55, cx, cy + s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Inimioare mici decorative, împrăștiate — ton discret, doar în zona de culoare (nu peste poză). */
function drawHeartAccents(ctx: CanvasRenderingContext2D, zoneX: number, zoneY: number, zoneW: number, zoneH: number, color: string, alpha: number, seed: number) {
  const spots: Array<[number, number, number]> = [
    [0.12, 0.14, 0.09], [0.88, 0.1, 0.06], [0.08, 0.85, 0.07], [0.92, 0.88, 0.1], [0.5, 0.06, 0.05],
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  spots.forEach(([fx, fy, fs], i) => {
    const wob = ((seed + i) % 3) * 0.01;
    ctx.font = `${Math.round(zoneW * (fs + wob))}px Georgia`;
    ctx.fillText("♥", zoneX + zoneW * fx, zoneY + zoneH * fy);
  });
  ctx.restore();
}

/** Grilă de puncte — accent decorativ discret, într-un colț. */
function drawDotGrid(ctx: CanvasRenderingContext2D, x: number, y: number, cols: number, rows: number, spacing: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const r = spacing * 0.12;
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      ctx.arc(x + c * spacing, y + row * spacing, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

type CtaColors = {
  badgeTopBg: string; badgeTopFg: string; badgeBottomBg: string; badgeBottomFg: string;
  pillBg: string; pillFg: string; linkColor: string;
};

/** „Trimite SMS la NUMĂR / CUVÂNT" + buton „DONEAZĂ" separat + link mic dedesubt. Întoarce înălțimea folosită. */
function drawCtaBlock(ctx: CanvasRenderingContext2D, x: number, y: number, t: BannerTexts, colors: CtaColors, scale: number) {
  const s = scale;
  const numText = `TRIMITE SMS LA ${t.smsNumar || "8832"}`;
  const wordText = (t.smsCuvant || "CAZ").toUpperCase();
  const padX = 16 * s;
  ctx.font = `700 ${11 * s}px "Manrope"`;
  const numW = ctx.measureText(numText).width;
  ctx.font = `800 ${19 * s}px "Sora"`;
  const wordW = ctx.measureText(wordText).width;
  const boxW = Math.max(numW, wordW, 90 * s) + padX * 2;
  const topH = 24 * s;
  const wordH = 40 * s;
  const r = 8 * s;

  roundRect(ctx, x, y, boxW, topH + r, r);
  ctx.fillStyle = colors.badgeTopBg;
  ctx.fill();
  ctx.fillRect(x, y + topH - r, boxW, r);

  roundRect(ctx, x, y + topH, boxW, wordH + r, r);
  ctx.fillStyle = colors.badgeBottomBg;
  ctx.fill();
  ctx.fillRect(x, y + topH, boxW, r);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = colors.badgeTopFg;
  ctx.font = `700 ${11 * s}px "Manrope"`;
  ctx.fillText(numText, x + boxW / 2, y + topH / 2 + 1);

  ctx.fillStyle = colors.badgeBottomFg;
  ctx.font = `800 ${19 * s}px "Sora"`;
  ctx.fillText(wordText, x + boxW / 2, y + topH + wordH / 2 + 1);

  const pillGap = 14 * s;
  ctx.font = `800 ${16 * s}px "Manrope"`;
  const pillTextW = ctx.measureText("DONEAZĂ").width;
  const pillPadX = 20 * s;
  const pillH = 42 * s;
  const pillW = pillTextW + pillPadX * 2;
  const pillX = x + boxW + pillGap;
  const pillY = y + (topH + wordH - pillH) / 2;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = colors.pillBg;
  ctx.fill();
  ctx.fillStyle = colors.pillFg;
  ctx.fillText("DONEAZĂ", pillX + pillW / 2, pillY + pillH / 2 + 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${11 * s}px "Manrope"`;
  ctx.fillStyle = colors.linkColor;
  ctx.fillText(t.link || "salveazaoinima.ro", x, y + topH + wordH + 22 * s);

  return topH + wordH + 34 * s;
}

function rightWaveClip(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, amp: number) {
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(cx, 0);
  ctx.bezierCurveTo(cx + amp, H * 0.22, cx - amp, H * 0.38, cx, H * 0.5);
  ctx.bezierCurveTo(cx + amp, H * 0.62, cx - amp, H * 0.78, cx + amp * 0.5, H);
  ctx.lineTo(W, H);
  ctx.closePath();
}
function leftWaveClip(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, amp: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(cx, 0);
  ctx.bezierCurveTo(cx + amp, H * 0.22, cx - amp, H * 0.38, cx, H * 0.5);
  ctx.bezierCurveTo(cx + amp, H * 0.62, cx - amp, H * 0.78, cx + amp * 0.5, H);
  ctx.lineTo(0, H);
  ctx.closePath();
}
function rightDiagonalClip(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, skew: number) {
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(cx + skew, 0);
  ctx.lineTo(cx - skew, H);
  ctx.lineTo(W, H);
  ctx.closePath();
}
function leftDiagonalClip(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, skew: number) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(cx + skew, 0);
  ctx.lineTo(cx - skew, H);
  ctx.lineTo(0, H);
  ctx.closePath();
}

/** Cadru „poza lipsă" — desenat în zona foto când nu s-a încărcat încă nicio poză. */
function drawPhotoPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bg: string, fg: string) {
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = fg;
  ctx.font = `${Math.round(Math.min(w, h) * 0.28)}px Georgia`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♥", x + w / 2, y + h / 2);
  ctx.restore();
}

type Template = {
  key: string;
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number, t: BannerTexts, photo: HTMLImageElement | null, adjust: PhotoAdjust) => void;
};

const TEMPLATES: Template[] = [
  {
    key: "impact",
    draw(ctx, W, H, t, photo, adjust) {
      const marginX = W * 0.055;
      const cx = W * 0.52;
      const amp = W * 0.032;

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#D7263D");
      grad.addColorStop(1, "#6E0F1F");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cx + amp + 2, H);

      ctx.save();
      rightWaveClip(ctx, W, H, cx, amp);
      ctx.clip();
      if (photo) drawCoverImagePZ(ctx, photo, cx - amp, 0, W - (cx - amp), H, adjust);
      else drawPhotoPlaceholder(ctx, cx - amp, 0, W - (cx - amp), H, "#F2CFCB", "#6E0F1F");
      ctx.restore();

      ctx.save();
      leftWaveClip(ctx, W, H, cx, amp);
      ctx.clip();
      drawHeartAccents(ctx, 0, 0, cx + amp, H, "#ffffff", 0.1, 1);
      drawDotGrid(ctx, marginX + 6, H - marginX * 1.4, 5, 3, W * 0.014, "#ffffff", 0.25);
      ctx.restore();

      const logoR = Math.max(20, H * 0.075);
      drawLogoMark(ctx, marginX + logoR, marginX * 0.9 + logoR, logoR * 2, "#ffffff");

      const zoneW = cx - amp - marginX * 2;
      const regionTop = marginX + logoR * 2.2;
      const L = layoutTitle(ctx, regionTop, H - regionTop, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(52, H * 0.15), titleMin: 22,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(24, H * 0.07), subMin: 14,
        maxWidth: zoneW, reserveBelow: 110 * (H / 1080), marginY: H * 0.03,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu.toUpperCase(), marginX, L.titleBaseline);

      if (t.subtitlu) {
        ctx.fillStyle = "rgba(255,255,255,0.86)";
        ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
        ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);
      }

      const scale = clamp(zoneW / 460, 0.55, 1.3);
      drawCtaBlock(ctx, marginX, L.ctaTop, t, {
        badgeTopBg: "#6E0F1F", badgeTopFg: "#ffffff", badgeBottomBg: "#ffffff", badgeBottomFg: "#6E0F1F",
        pillBg: "#ffffff", pillFg: "#6E0F1F", linkColor: "rgba(255,255,255,0.75)",
      }, scale);
    },
  },
  {
    key: "urgent",
    draw(ctx, W, H, t, photo, adjust) {
      const marginX = W * 0.055;
      const barH = Math.max(40, H * 0.11);
      const cx = W * 0.56;

      ctx.fillStyle = "#121010";
      ctx.fillRect(0, 0, cx, H);

      if (photo) drawCoverImagePZ(ctx, photo, cx, 0, W - cx, H, adjust);
      else drawPhotoPlaceholder(ctx, cx, 0, W - cx, H, "#2A1F1F", "#C41D33");

      ctx.fillStyle = "#C41D33";
      ctx.fillRect(0, 0, W, barH);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${Math.max(12, barH * 0.34)}px "Manrope"`;
      ctx.textBaseline = "middle";
      ctx.fillText("▲  URGENT", marginX, barH / 2 + 1);
      ctx.textBaseline = "alphabetic";

      drawHeartAccents(ctx, 0, barH, cx, H - barH, "#ffffff", 0.07, 2);

      const logoR = Math.max(18, H * 0.06);
      drawLogoMark(ctx, marginX + logoR, barH + marginX * 0.6 + logoR, logoR * 2, "#ffffff");

      const zoneW = cx - marginX * 2;
      const regionTop = barH + marginX * 0.4 + logoR * 2.2;
      const L = layoutTitle(ctx, regionTop, H - regionTop, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(46, H * 0.13), titleMin: 20,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(22, H * 0.06), subMin: 13,
        maxWidth: zoneW, reserveBelow: 100 * (H / 1080), marginY: H * 0.025,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu.toUpperCase(), marginX, L.titleBaseline);

      if (t.subtitlu) {
        ctx.fillStyle = "#C9C2BE";
        ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
        ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);
      }

      const scale = clamp(zoneW / 460, 0.5, 1.2);
      drawCtaBlock(ctx, marginX, L.ctaTop, t, {
        badgeTopBg: "#C41D33", badgeTopFg: "#ffffff", badgeBottomBg: "#ffffff", badgeBottomFg: "#121010",
        pillBg: "#C41D33", pillFg: "#ffffff", linkColor: "#8A8078",
      }, scale);
    },
  },
  {
    key: "elegant",
    draw(ctx, W, H, t, photo, adjust) {
      const marginX = W * 0.055;
      const cx = W * 0.6;

      ctx.fillStyle = "#F7F3EC";
      ctx.fillRect(0, 0, W, H);

      if (photo) drawCoverImagePZ(ctx, photo, cx, 0, W - cx, H, adjust);
      else drawPhotoPlaceholder(ctx, cx, 0, W - cx, H, "#EFE2C6", "#B08B2E");

      ctx.strokeStyle = "#C9A94E";
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();

      const eyebrowH = Math.max(26, H * 0.065);
      ctx.fillStyle = "#B08B2E";
      ctx.font = `700 ${Math.max(10, H * 0.026)}px "Manrope"`;
      ctx.fillText("S A L V E A Z Ă   O   I N I M Ă", marginX, eyebrowH * 0.75);

      const zoneW = cx - marginX * 2;
      const L = layoutTitle(ctx, eyebrowH, H - eyebrowH, t.titlu, t.subtitlu, {
        titleFamily: "Georgia", titleWeight: 700, titleMax: Math.min(48, H * 0.14), titleMin: 20,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(22, H * 0.06), subMin: 13,
        maxWidth: zoneW, reserveBelow: 100 * (H / 1080), marginY: H * 0.03,
      });

      ctx.fillStyle = "#241C18";
      ctx.font = `700 ${L.titleSize}px "Georgia"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);

      if (t.subtitlu) {
        ctx.fillStyle = "#5A4F3C";
        ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
        ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);
      }

      const scale = clamp(zoneW / 460, 0.5, 1.15);
      drawCtaBlock(ctx, marginX, L.ctaTop, t, {
        badgeTopBg: "#241C18", badgeTopFg: "#F1E6CE", badgeBottomBg: "#ffffff", badgeBottomFg: "#241C18",
        pillBg: "#C9A94E", pillFg: "#241C18", linkColor: "#8A7B5E",
      }, scale);
    },
  },
  {
    key: "noapte",
    draw(ctx, W, H, t, photo, adjust) {
      const marginX = W * 0.055;
      const cx = W * 0.52;
      const amp = W * 0.028;

      ctx.fillStyle = "#050B14";
      ctx.fillRect(0, 0, cx + amp + 2, H);
      const glow = ctx.createRadialGradient(cx * 0.5, H * 0.4, 20, cx * 0.5, H * 0.4, Math.max(W, H) * 0.45);
      glow.addColorStop(0, "rgba(74,159,216,0.3)");
      glow.addColorStop(1, "rgba(5,11,20,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, cx + amp + 2, H);

      ctx.save();
      rightWaveClip(ctx, W, H, cx, amp);
      ctx.clip();
      if (photo) drawCoverImagePZ(ctx, photo, cx - amp, 0, W - (cx - amp), H, adjust);
      else drawPhotoPlaceholder(ctx, cx - amp, 0, W - (cx - amp), H, "#0F2038", "#4A9FD8");
      ctx.restore();

      const starsFrac: Array<[number, number]> = [
        [0.07, 0.10], [0.13, 0.22], [0.4, 0.13], [0.3, 0.35], [0.06, 0.55], [0.15, 0.75], [0.42, 0.85],
      ];
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      starsFrac.forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(fx * cx, fy * H, Math.max(1.2, W * 0.0015), 0, Math.PI * 2);
        ctx.fill();
      });

      const logoR = Math.max(20, H * 0.07);
      drawLogoMark(ctx, marginX + logoR, marginX * 0.9 + logoR, logoR * 2, "#DCEEFA");

      const zoneW = cx - amp - marginX * 2;
      const regionTop = marginX + logoR * 2.2;
      const L = layoutTitle(ctx, regionTop, H - regionTop, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(50, H * 0.14), titleMin: 22,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(22, H * 0.065), subMin: 14,
        maxWidth: zoneW, reserveBelow: 100 * (H / 1080), marginY: H * 0.03,
      });

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(74,159,216,0.6)";
      ctx.shadowBlur = Math.max(8, H * 0.035);
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu.toUpperCase(), marginX, L.titleBaseline);
      ctx.shadowBlur = 0;

      if (t.subtitlu) {
        ctx.fillStyle = "#9FC2DC";
        ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
        ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);
      }

      const scale = clamp(zoneW / 460, 0.5, 1.2);
      drawCtaBlock(ctx, marginX, L.ctaTop, t, {
        badgeTopBg: "#4A9FD8", badgeTopFg: "#04101C", badgeBottomBg: "#DCEEFA", badgeBottomFg: "#0A1628",
        pillBg: "#4A9FD8", pillFg: "#04101C", linkColor: "#6E8BA6",
      }, scale);
    },
  },
  {
    key: "poveste",
    draw(ctx, W, H, t, photo, adjust) {
      const marginX = W * 0.055;
      const cx = W * 0.5;
      const amp = W * 0.045;

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#F4977A");
      grad.addColorStop(1, "#FCC98A");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cx + amp + 2, H);

      ctx.save();
      rightWaveClip(ctx, W, H, cx, amp);
      ctx.clip();
      if (photo) drawCoverImagePZ(ctx, photo, cx - amp, 0, W - (cx - amp), H, adjust);
      else drawPhotoPlaceholder(ctx, cx - amp, 0, W - (cx - amp), H, "#FCE3D3", "#C4633F");
      ctx.restore();

      ctx.save();
      leftWaveClip(ctx, W, H, cx, amp);
      ctx.clip();
      drawHeartAccents(ctx, 0, 0, cx + amp, H, "#ffffff", 0.16, 3);
      ctx.restore();

      const logoR = Math.max(20, H * 0.075);
      drawLogoMark(ctx, marginX + logoR, marginX * 0.9 + logoR, logoR * 2, "#ffffff");

      const zoneW = cx - amp - marginX * 2;
      const regionTop = marginX + logoR * 2.2;
      const L = layoutTitle(ctx, regionTop, H - regionTop, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(50, H * 0.14), titleMin: 22,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(22, H * 0.065), subMin: 14,
        maxWidth: zoneW, reserveBelow: 100 * (H / 1080), marginY: H * 0.03,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);

      if (t.subtitlu) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
        ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);
      }

      const scale = clamp(zoneW / 460, 0.5, 1.2);
      drawCtaBlock(ctx, marginX, L.ctaTop, t, {
        badgeTopBg: "#C4633F", badgeTopFg: "#ffffff", badgeBottomBg: "#ffffff", badgeBottomFg: "#C4633F",
        pillBg: "#ffffff", pillFg: "#C4633F", linkColor: "rgba(255,255,255,0.8)",
      }, scale);
    },
  },
  {
    key: "parteneri",
    draw(ctx, W, H, t, photo, adjust) {
      const marginX = W * 0.055;
      const cx = W * 0.56;
      const skew = W * 0.05;

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#0F1F3D");
      grad.addColorStop(1, "#173B6B");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cx + skew + 2, H);

      ctx.save();
      rightDiagonalClip(ctx, W, H, cx, skew);
      ctx.clip();
      if (photo) drawCoverImagePZ(ctx, photo, cx - skew, 0, W - (cx - skew), H, adjust);
      else drawPhotoPlaceholder(ctx, cx - skew, 0, W - (cx - skew), H, "#152A4E", "#8FB4DE");
      ctx.restore();

      ctx.save();
      leftDiagonalClip(ctx, W, H, cx, skew);
      ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = Math.max(1.5, W * 0.0018);
      for (let i = 0; i < 5; i++) {
        const x = marginX + i * (W * 0.055);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - H * 0.3, H);
        ctx.stroke();
      }
      ctx.restore();

      const logoR = Math.max(18, H * 0.06);
      drawLogoMark(ctx, marginX + logoR, marginX * 0.9 + logoR, logoR * 2, "#ffffff");

      const zoneW = cx - skew - marginX * 2;
      const regionTop = marginX + logoR * 2.2;
      const L = layoutTitle(ctx, regionTop, H - regionTop, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(44, H * 0.12), titleMin: 20,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(20, H * 0.055), subMin: 13,
        maxWidth: zoneW, reserveBelow: 100 * (H / 1080), marginY: H * 0.03,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu.toUpperCase(), marginX, L.titleBaseline);

      ctx.strokeStyle = "#8FB4DE";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX, L.titleBaseline + L.titleSize * 0.32);
      ctx.lineTo(marginX + Math.min(50, zoneW * 0.14), L.titleBaseline + L.titleSize * 0.32);
      ctx.stroke();

      if (t.subtitlu) {
        ctx.fillStyle = "#B9CCE3";
        ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
        ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);
      }

      const scale = clamp(zoneW / 460, 0.45, 1.1);
      drawCtaBlock(ctx, marginX, L.ctaTop, t, {
        badgeTopBg: "#173B6B", badgeTopFg: "#DCEEFA", badgeBottomBg: "#ffffff", badgeBottomFg: "#0F1F3D",
        pillBg: "#8FB4DE", pillFg: "#0F1F3D", linkColor: "#8FA8C7",
      }, scale);
    },
  },
];

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&family=Sora:wght@700;800&display=swap";

function ensureFontsLinked() {
  if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

export default function BannereSmsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.bannereSms;
  const [titlu, setTitlu] = useState("Numele cazului");
  const [subtitlu, setSubtitlu] = useState("");
  const [smsNumar, setSmsNumar] = useState("8832");
  const [smsCuvant, setSmsCuvant] = useState("CAZ");
  const [link, setLink] = useState("salveazaoinima.ro");
  const [templateKey, setTemplateKey] = useState<string>(TEMPLATES[0].key);
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const pickerCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const template = TEMPLATES.find((tpl) => tpl.key === templateKey) ?? TEMPLATES[0];
  const texts: BannerTexts = { titlu, subtitlu, smsNumar, smsCuvant, link };
  const adjust: PhotoAdjust = { panX, panY, zoom };

  useEffect(() => {
    ensureFontsLinked();
  }, []);

  function loadPhotoFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPhotoImg((prev) => {
        if (prev) URL.revokeObjectURL(prev.src);
        return img;
      });
      setPhotoName(file.name);
      setPanX(0);
      setPanY(0);
      setZoom(1);
    };
    img.src = url;
  }

  function removePhoto() {
    setPhotoImg((prev) => {
      if (prev) URL.revokeObjectURL(prev.src);
      return null;
    });
    setPhotoName("");
    setPanX(0);
    setPanY(0);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          document.fonts.load('800 56px "Sora"'),
          document.fonts.load('700 24px "Sora"'),
          document.fonts.load('500 28px "Manrope"'),
          document.fonts.load('700 24px "Manrope"'),
        ]);
      } catch {
        // continuăm cu fonturile de sistem dacă Google Fonts nu s-a încărcat
      }
      if (cancelled) return;
      FORMATS.forEach((format) => {
        const canvas = canvasRefs.current.get(format.key);
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = format.w;
        canvas.height = format.h;
        resetCtx(ctx);
        template.draw(ctx, format.w, format.h, texts, photoImg, adjust);
      });
      TEMPLATES.forEach((tpl) => {
        const canvas = pickerCanvasRefs.current.get(tpl.key);
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 480;
        canvas.height = 480;
        resetCtx(ctx);
        tpl.draw(ctx, 480, 480, texts, photoImg, adjust);
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titlu, subtitlu, smsNumar, smsCuvant, link, template, photoImg, panX, panY, zoom]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-3">
          <div>
            <Label>{dict.sablon}</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => setTemplateKey(tpl.key)}
                  className={cn(
                    "overflow-hidden rounded-lg border-2 text-left transition-all",
                    templateKey === tpl.key
                      ? "border-[var(--ci-primary)] ring-2 ring-[var(--ci-primary)]/25"
                      : "border-[var(--ci-border)] hover:border-[var(--ci-border-strong)]",
                  )}
                >
                  <canvas
                    ref={(el) => {
                      if (el) pickerCanvasRefs.current.set(tpl.key, el);
                      else pickerCanvasRefs.current.delete(tpl.key);
                    }}
                    className="aspect-square w-full"
                  />
                  <span className="block px-2 py-1.5 text-[12px] font-semibold text-[var(--ci-text)]">
                    {dict.sabloane[tpl.key as keyof typeof dict.sabloane]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>{dict.foto}</Label>
            {photoImg ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2">
                  <span className="flex-1 truncate text-[12.5px] text-[var(--ci-text)]">{photoName}</span>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="rounded p-1 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface)] hover:text-[var(--ci-text)]"
                    aria-label={dict.scoateFoto}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium tracking-wide text-[var(--ci-text-faint)] uppercase">
                      <span>{dict.pozitieX}</span>
                    </div>
                    <input type="range" min={-1} max={1} step={0.02} value={panX} onChange={(e) => setPanX(Number(e.target.value))} className="w-full accent-[var(--ci-primary)]" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium tracking-wide text-[var(--ci-text-faint)] uppercase">
                      <span>{dict.pozitieY}</span>
                    </div>
                    <input type="range" min={-1} max={1} step={0.02} value={panY} onChange={(e) => setPanY(Number(e.target.value))} className="w-full accent-[var(--ci-primary)]" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium tracking-wide text-[var(--ci-text-faint)] uppercase">
                      <span>{dict.zoom}</span>
                    </div>
                    <input type="range" min={1} max={3} step={0.02} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[var(--ci-primary)]" />
                  </div>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  loadPhotoFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center transition-colors",
                  dragOver ? "border-[var(--ci-primary)] bg-[var(--ci-primary)]/5" : "border-[var(--ci-border-strong)] hover:border-[var(--ci-primary)]",
                )}
              >
                <ImagePlus className="h-4 w-4 text-[var(--ci-text-muted)]" />
                <span className="text-[12.5px] text-[var(--ci-text)]">{dict.incarcaFoto}</span>
                <span className="text-[11px] text-[var(--ci-text-faint)]">{dict.fotoHint}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => loadPhotoFile(e.target.files?.[0])}
            />
          </div>

          <div>
            <Label>{dict.titlu}</Label>
            <Input value={titlu} onChange={(e) => setTitlu(e.target.value)} />
          </div>
          <div>
            <Label>{dict.subtitlu}</Label>
            <Input value={subtitlu} onChange={(e) => setSubtitlu(e.target.value)} placeholder={dict.subtituluPlaceholder} />
          </div>

          <div>
            <Label>{dict.apelSms}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-[var(--ci-text-faint)]">{dict.numarSms}</label>
                <Input value={smsNumar} onChange={(e) => setSmsNumar(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[var(--ci-text-faint)]">{dict.cuvantSms}</label>
                <Input value={smsCuvant} onChange={(e) => setSmsCuvant(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <Label>{dict.linkLabel}</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FORMATS.map((format) => {
            const maxBoxW = 440, maxBoxH = 460;
            const scale = Math.min(maxBoxW / format.w, maxBoxH / format.h, 1);
            const dispW = Math.round(format.w * scale);
            return (
              <Card key={format.key} className="space-y-2 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[var(--ci-text-muted)]">{format.w}×{format.h}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = canvasRefs.current.get(format.key);
                      if (canvas) downloadCanvasPng(canvas, `banner-${templateKey}-${format.key}.png`);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--ci-primary)] hover:bg-[var(--ci-surface-2)]"
                  >
                    <Download className="h-3 w-3" /> JPG
                  </button>
                </div>
                <div className="flex items-center justify-center">
                  <div
                    className="overflow-hidden rounded-lg shadow-[var(--ci-shadow-md)]"
                    style={{ width: dispW, maxWidth: "100%", aspectRatio: `${format.w} / ${format.h}` }}
                  >
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current.set(format.key, el);
                        else canvasRefs.current.delete(format.key);
                      }}
                      className="block h-full w-full"
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
