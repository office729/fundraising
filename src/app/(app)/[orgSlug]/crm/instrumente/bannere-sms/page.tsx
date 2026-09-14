"use client";

import { Download, ImagePlus, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { cn } from "../../lib/cn";
import { downloadCanvasPng } from "../../lib/download-doc";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

type BannerTexts = { titlu: string; subtitlu: string; cta: string };

type Format = { key: string; w: number; h: number };

const FORMATS: Format[] = [
  { key: "sms", w: 1080, h: 400 },
  { key: "instaPost", w: 1080, h: 1080 },
  { key: "instaStory", w: 1080, h: 1920 },
  { key: "facebook", w: 1200, h: 630 },
  { key: "twitter", w: 1200, h: 675 },
  { key: "linkedin", w: 1200, h: 627 },
];

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

/** Micșorează fontul până textul încape pe maxWidth (evită overlap la texte lungi). Setează ctx.font. */
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

/** Umple canvas-ul cu o poză, tăiată (cover) ca să acopere întreg formatul, indiferent de proporție. */
function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = W / H;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > cr) {
    sw = img.naturalHeight * cr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / cr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
}

/** Poziționează titlu + subtitlu + CTA centrate vertical într-o regiune — funcționează la orice proporție (bannner lat, pătrat, poveste înaltă). */
function layoutBlock(
  ctx: CanvasRenderingContext2D,
  regionTop: number,
  regionHeight: number,
  titlu: string,
  subtitlu: string,
  opts: {
    titleFamily: string; titleWeight: number; titleMax: number; titleMin: number;
    subFamily: string; subWeight: number; subMax: number; subMin: number;
    maxWidth: number; pillH: number; marginY?: number;
  },
) {
  const titleSize = fitFontSize(ctx, titlu, opts.titleFamily, opts.titleWeight, opts.titleMax, opts.titleMin, opts.maxWidth);
  const subtitleSize = fitFontSize(ctx, subtitlu, opts.subFamily, opts.subWeight, opts.subMax, opts.subMin, opts.maxWidth);
  const gap1 = titleSize * 0.32;
  const gap2 = Math.max(22, subtitleSize * 0.85);
  const blockHeight = titleSize * 0.9 + gap1 + subtitleSize * 0.9 + gap2 + opts.pillH;
  const marginY = opts.marginY ?? 24;
  const startY = regionTop + Math.max(marginY, (regionHeight - blockHeight) / 2);
  const titleBaseline = startY + titleSize * 0.82;
  const subtitleBaseline = titleBaseline + gap1 + subtitleSize * 0.78;
  const ctaTop = subtitleBaseline + subtitleSize * 0.35 + gap2;
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

type Template = {
  key: string;
  swatch: string;
  label: "light" | "dark";
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number, t: BannerTexts, photo: HTMLImageElement | null) => void;
};

const TEMPLATES: Template[] = [
  {
    key: "impact",
    swatch: "linear-gradient(135deg, #D7263D 0%, #6E0F1F 100%)",
    label: "light",
    draw(ctx, W, H, t, photo) {
      const marginX = W * 0.06;
      const reserveRight = photo ? 0 : W * 0.32;

      if (photo) {
        drawCoverImage(ctx, photo, W, H);
        ctx.save();
        ctx.globalAlpha = 0.62;
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#D7263D");
        grad.addColorStop(1, "#6E0F1F");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#D7263D");
        grad.addColorStop(1, "#6E0F1F");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "#ffffff";
        ctx.font = `${Math.round(Math.min(W, H) * 0.9)}px Georgia`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♥", W - reserveRight * 0.55, H / 2);
        ctx.restore();
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      const maxW = W - marginX * 2 - reserveRight;
      const pillH = Math.max(46, H * 0.13);
      const L = layoutBlock(ctx, 0, H, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(64, H * 0.18), titleMin: 26,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(32, H * 0.09), subMin: 16,
        maxWidth: maxW, pillH, marginY: H * 0.08,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);

      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
      ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);

      const padX = pillH * 0.42;
      fitFontSize(ctx, t.cta, "Manrope", 700, Math.min(25, pillH * 0.46), 14, maxW - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, marginX, L.ctaTop, ctaW + padX * 2, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = "#6E0F1F";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, marginX + padX, L.ctaTop + pillH / 2 + 1);
    },
  },
  {
    key: "urgent",
    swatch: "linear-gradient(180deg, #C41D33 0%, #C41D33 16%, #121010 16%, #121010 100%)",
    label: "light",
    draw(ctx, W, H, t, photo) {
      const marginX = W * 0.06;
      const barH = Math.max(44, H * 0.15);

      if (photo) {
        drawCoverImage(ctx, photo, W, H);
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#121010";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        ctx.fillStyle = "#121010";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = "#C41D33";
      ctx.fillRect(0, 0, W, barH);
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${Math.max(13, barH * 0.32)}px "Manrope"`;
      ctx.textBaseline = "middle";
      ctx.fillText("▲  URGENT", marginX, barH / 2 + 1);
      ctx.textBaseline = "alphabetic";

      const maxW = W - marginX * 2;
      const pillH = Math.max(42, H * 0.12);
      const L = layoutBlock(ctx, barH, H - barH, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(56, H * 0.15), titleMin: 24,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(28, H * 0.075), subMin: 15,
        maxWidth: maxW, pillH, marginY: H * 0.05,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);

      ctx.fillStyle = "#C9C2BE";
      ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
      ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);

      const padX = pillH * 0.42;
      fitFontSize(ctx, t.cta, "Manrope", 700, Math.min(24, pillH * 0.46), 14, maxW - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      ctx.strokeStyle = "#C41D33";
      ctx.lineWidth = 2;
      roundRect(ctx, marginX, L.ctaTop, ctaW + padX * 2, pillH, 8);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, marginX + padX, L.ctaTop + pillH / 2 + 1);
    },
  },
  {
    key: "elegant",
    swatch: "linear-gradient(135deg, #F7F3EC 0%, #F1E6CE 100%)",
    label: "dark",
    draw(ctx, W, H, t, photo) {
      const marginX = W * 0.06;

      if (photo) {
        drawCoverImage(ctx, photo, W, H);
        ctx.save();
        ctx.globalAlpha = 0.82;
        ctx.fillStyle = "#F7F3EC";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        ctx.fillStyle = "#F7F3EC";
        ctx.fillRect(0, 0, W, H);
      }

      const eyebrowH = Math.max(28, H * 0.07);
      ctx.fillStyle = "#B08B2E";
      ctx.font = `700 ${Math.max(11, H * 0.028)}px "Manrope"`;
      ctx.fillText("S A L V E A Z Ă   O   I N I M Ă", marginX, eyebrowH * 0.75);

      const maxW = W - marginX * 2;
      const ctaApproxH = Math.max(24, H * 0.06);
      const L = layoutBlock(ctx, eyebrowH, H - eyebrowH, t.titlu, t.subtitlu, {
        titleFamily: "Georgia", titleWeight: 700, titleMax: Math.min(58, H * 0.16), titleMin: 24,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(28, H * 0.075), subMin: 15,
        maxWidth: maxW, pillH: ctaApproxH, marginY: H * 0.06,
      });

      ctx.fillStyle = "#241C18";
      ctx.font = `700 ${L.titleSize}px "Georgia"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);

      ctx.strokeStyle = "#C9A94E";
      ctx.lineWidth = Math.max(2, H * 0.007);
      ctx.beginPath();
      ctx.moveTo(marginX, L.titleBaseline + L.titleSize * 0.32);
      ctx.lineTo(marginX + Math.min(70, W * 0.065), L.titleBaseline + L.titleSize * 0.32);
      ctx.stroke();

      ctx.fillStyle = "#5A4F3C";
      ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
      ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);

      fitFontSize(ctx, t.cta, "Manrope", 700, Math.min(24, H * 0.06), 14, maxW);
      ctx.fillStyle = "#241C18";
      const ctaW = ctx.measureText(t.cta).width;
      const ctaX = W - marginX - ctaW;
      const ctaY = L.ctaTop + ctaApproxH * 0.7;
      ctx.fillText(t.cta, ctaX, ctaY);
      ctx.strokeStyle = "#C9A94E";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ctaX, ctaY + 8);
      ctx.lineTo(ctaX + ctaW, ctaY + 8);
      ctx.stroke();
    },
  },
  {
    key: "noapte",
    swatch:
      "radial-gradient(circle at 35% 35%, rgba(74,159,216,0.55), transparent 60%), linear-gradient(180deg, #0A1628, #050B14)",
    label: "light",
    draw(ctx, W, H, t, photo) {
      const marginX = W * 0.06;

      if (photo) {
        drawCoverImage(ctx, photo, W, H);
        ctx.save();
        ctx.globalAlpha = 0.66;
        ctx.fillStyle = "#050B14";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        ctx.fillStyle = "#050B14";
        ctx.fillRect(0, 0, W, H);
        const glow = ctx.createRadialGradient(W * 0.28, H * 0.4, 20, W * 0.28, H * 0.4, Math.max(W, H) * 0.5);
        glow.addColorStop(0, "rgba(74,159,216,0.35)");
        glow.addColorStop(1, "rgba(5,11,20,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }

      const starsFrac: Array<[number, number]> = [
        [0.07, 0.10], [0.13, 0.22], [0.83, 0.13], [0.91, 0.30], [0.70, 0.15],
        [0.93, 0.55], [0.85, 0.75], [0.06, 0.75], [0.17, 0.85], [0.46, 0.10], [0.57, 0.83],
      ];
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      starsFrac.forEach(([fx, fy]) => {
        ctx.beginPath();
        ctx.arc(fx * W, fy * H, Math.max(1.2, W * 0.0015), 0, Math.PI * 2);
        ctx.fill();
      });

      const maxW = W - marginX * 2;
      const pillH = Math.max(44, H * 0.12);
      const L = layoutBlock(ctx, 0, H, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(56, H * 0.16), titleMin: 26,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(28, H * 0.08), subMin: 16,
        maxWidth: maxW, pillH, marginY: H * 0.08,
      });

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(74,159,216,0.6)";
      ctx.shadowBlur = Math.max(10, H * 0.045);
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#9FC2DC";
      ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
      ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);

      const padX = pillH * 0.44;
      fitFontSize(ctx, t.cta, "Manrope", 700, Math.min(24, pillH * 0.44), 14, maxW - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      ctx.strokeStyle = "#4A9FD8";
      ctx.lineWidth = 2;
      roundRect(ctx, marginX, L.ctaTop, ctaW + padX * 2, pillH, pillH / 2);
      ctx.stroke();
      ctx.fillStyle = "#DCEEFA";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, marginX + padX, L.ctaTop + pillH / 2 + 1);
    },
  },
  {
    key: "poveste",
    swatch: "linear-gradient(135deg, #F4977A 0%, #FCC98A 100%)",
    label: "light",
    draw(ctx, W, H, t, photo) {
      const marginX = W * 0.06;
      const reserveRight = photo ? 0 : W * 0.22;

      if (photo) {
        drawCoverImage(ctx, photo, W, H);
        ctx.save();
        ctx.globalAlpha = 0.6;
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#F4977A");
        grad.addColorStop(1, "#FCC98A");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#F4977A");
        grad.addColorStop(1, "#FCC98A");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(W * 0.83, H * 0.2, Math.min(W, H) * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const maxW = W - marginX * 2 - reserveRight;
      const pillH = Math.max(46, H * 0.13);
      const L = layoutBlock(ctx, 0, H, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(56, H * 0.16), titleMin: 26,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(28, H * 0.08), subMin: 16,
        maxWidth: maxW, pillH, marginY: H * 0.08,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
      ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);

      const padX = pillH * 0.5;
      fitFontSize(ctx, t.cta, "Manrope", 700, Math.min(25, pillH * 0.46), 14, maxW - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, marginX, L.ctaTop, ctaW + padX * 2, pillH, pillH * 0.3);
      ctx.fill();
      ctx.fillStyle = "#C4633F";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, marginX + padX, L.ctaTop + pillH / 2 + 1);
    },
  },
  {
    key: "parteneri",
    swatch: "linear-gradient(135deg, #0F1F3D 0%, #173B6B 100%)",
    label: "light",
    draw(ctx, W, H, t, photo) {
      const marginX = W * 0.06;

      if (photo) {
        drawCoverImage(ctx, photo, W, H);
        ctx.save();
        ctx.globalAlpha = 0.66;
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#0F1F3D");
        grad.addColorStop(1, "#173B6B");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#0F1F3D");
        grad.addColorStop(1, "#173B6B");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = Math.max(1.5, W * 0.0018);
      for (let i = 0; i < 6; i++) {
        const x = W * 0.62 + i * (W * 0.037);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - H * 0.4, H);
        ctx.stroke();
      }
      ctx.restore();

      const maxW = W * 0.58;
      const btnH = Math.max(40, H * 0.11);
      const L = layoutBlock(ctx, 0, H, t.titlu, t.subtitlu, {
        titleFamily: "Sora", titleWeight: 800, titleMax: Math.min(54, H * 0.15), titleMin: 24,
        subFamily: "Manrope", subWeight: 500, subMax: Math.min(26, H * 0.07), subMin: 15,
        maxWidth: maxW, pillH: btnH, marginY: H * 0.08,
      });

      ctx.fillStyle = "#ffffff";
      ctx.font = `800 ${L.titleSize}px "Sora"`;
      ctx.fillText(t.titlu, marginX, L.titleBaseline);

      ctx.strokeStyle = "#8FB4DE";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(marginX, L.titleBaseline + L.titleSize * 0.32);
      ctx.lineTo(marginX + Math.min(60, W * 0.055), L.titleBaseline + L.titleSize * 0.32);
      ctx.stroke();

      ctx.fillStyle = "#B9CCE3";
      ctx.font = `500 ${L.subtitleSize}px "Manrope"`;
      ctx.fillText(t.subtitlu, marginX, L.subtitleBaseline);

      const padX = btnH * 0.45;
      fitFontSize(ctx, t.cta, "Manrope", 700, Math.min(22, btnH * 0.44), 14, W - marginX * 2 - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      const btnW = ctaW + padX * 2;
      const btnX = W - marginX - btnW;
      const btnY = L.ctaTop;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(btnX, btnY, btnW, btnH);
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, btnX + padX, btnY + btnH / 2 + 1);
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

const PREVIEW_MAX_W = 480;
const PREVIEW_MAX_H = 520;

export default function BannereSmsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.bannereSms;
  const [titlu, setTitlu] = useState("Ajută un copil azi");
  const [subtitlu, setSubtitlu] = useState("Trimite STAR la 8845 și donează 2 EUR");
  const [cta, setCta] = useState("salveazaoinima.org.ro");
  const [templateKey, setTemplateKey] = useState<string>(TEMPLATES[0].key);
  const [formatKey, setFormatKey] = useState<string>(FORMATS[0].key);
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const template = TEMPLATES.find((tpl) => tpl.key === templateKey) ?? TEMPLATES[0];
  const format = FORMATS.find((f) => f.key === formatKey) ?? FORMATS[0];

  useEffect(() => {
    ensureFontsLinked();
  }, []);

  function onPhotoChosen(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPhotoImg((prev) => {
        if (prev) URL.revokeObjectURL(prev.src);
        return img;
      });
      setPhotoName(file.name);
    };
    img.src = url;
  }

  function removePhoto() {
    setPhotoImg((prev) => {
      if (prev) URL.revokeObjectURL(prev.src);
      return null;
    });
    setPhotoName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = format.w;
    canvas.height = format.h;

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
      resetCtx(ctx);
      template.draw(ctx, format.w, format.h, { titlu, subtitlu, cta }, photoImg);
    })();

    return () => {
      cancelled = true;
    };
  }, [titlu, subtitlu, cta, template, format, photoImg]);

  const previewScale = Math.min(PREVIEW_MAX_W / format.w, PREVIEW_MAX_H / format.h, 1);
  const previewW = Math.round(format.w * previewScale);
  const previewH = Math.round(format.h * previewScale);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-3">
          <div>
            <Label>{dict.format}</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFormatKey(f.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors",
                    formatKey === f.key
                      ? "border-[var(--ci-primary)] bg-[var(--ci-primary)]/5"
                      : "border-[var(--ci-border)] hover:border-[var(--ci-border-strong)]",
                  )}
                >
                  <span
                    className="rounded-sm border border-[var(--ci-border-strong)] bg-[var(--ci-surface-2)]"
                    style={{
                      width: f.w >= f.h ? 26 : Math.round(26 * (f.w / f.h)),
                      height: f.w >= f.h ? Math.round(26 * (f.h / f.w)) : 26,
                    }}
                  />
                  <span className="text-center text-[10.5px] leading-tight text-[var(--ci-text-muted)]">
                    {dict.formate[f.key as keyof typeof dict.formate]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>{dict.sablon}</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => setTemplateKey(tpl.key)}
                  className={cn(
                    "flex h-16 items-center justify-center rounded-lg border-2 transition-all",
                    templateKey === tpl.key
                      ? "border-[var(--ci-primary)] ring-2 ring-[var(--ci-primary)]/25"
                      : "border-transparent hover:opacity-90",
                  )}
                  style={{ backgroundImage: tpl.swatch }}
                >
                  <span
                    className={cn(
                      "text-[12.5px] font-semibold",
                      tpl.label === "dark" ? "text-[#241C18]" : "text-white",
                    )}
                  >
                    {dict.sabloane[tpl.key as keyof typeof dict.sabloane]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>{dict.foto}</Label>
            {photoImg ? (
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
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--ci-border-strong)] text-[13px] text-[var(--ci-text-muted)] transition-colors hover:border-[var(--ci-primary)] hover:text-[var(--ci-text)]"
              >
                <ImagePlus className="h-3.5 w-3.5" /> {dict.incarcaFoto}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPhotoChosen(e.target.files?.[0])}
            />
            <p className="mt-1 text-[11.5px] text-[var(--ci-text-faint)]">{dict.fotoHint}</p>
          </div>

          <div>
            <Label>{dict.titlu}</Label>
            <Input value={titlu} onChange={(e) => setTitlu(e.target.value)} />
          </div>
          <div>
            <Label>{dict.subtitlu}</Label>
            <Input value={subtitlu} onChange={(e) => setSubtitlu(e.target.value)} />
          </div>
          <div>
            <Label>{dict.textFinal}</Label>
            <Input value={cta} onChange={(e) => setCta(e.target.value)} />
          </div>
          <Button
            variant="primary"
            onClick={() => canvasRef.current && downloadCanvasPng(canvasRef.current, `banner-${templateKey}-${formatKey}.png`)}
            className="w-full"
          >
            <Download className="h-3.5 w-3.5" /> {dict.descarcaPng}
          </Button>
        </Card>

        <Card className="flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-[var(--ci-shadow-md)]"
            style={{ width: previewW, height: previewH }}
          />
        </Card>
      </div>
    </div>
  );
}
