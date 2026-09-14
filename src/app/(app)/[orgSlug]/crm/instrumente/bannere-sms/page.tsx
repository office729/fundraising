"use client";

import { Download } from "lucide-react";
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

const W = 1080;
const H = 400;
const MARGIN = 64;

type BannerTexts = { titlu: string; subtitlu: string; cta: string };

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
  draw: (ctx: CanvasRenderingContext2D, t: BannerTexts) => void;
};

const TEMPLATES: Template[] = [
  {
    key: "impact",
    swatch: "linear-gradient(135deg, #D7263D 0%, #6E0F1F 100%)",
    label: "light",
    draw(ctx, t) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#D7263D");
      grad.addColorStop(1, "#6E0F1F");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#ffffff";
      ctx.font = '360px Georgia';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("♥", 860, 210);
      ctx.restore();

      const maxW = 700;
      ctx.fillStyle = "#ffffff";
      const tSize = fitFontSize(ctx, t.titlu, "Sora", 800, 60, 30, maxW);
      ctx.fillText(t.titlu, MARGIN, 138);

      ctx.fillStyle = "rgba(255,255,255,0.86)";
      fitFontSize(ctx, t.subtitlu, "Manrope", 500, 30, 18, maxW);
      ctx.fillText(t.subtitlu, MARGIN, 138 + tSize * 0.72 + 14);

      const padX = 26, pillH = 54;
      fitFontSize(ctx, t.cta, "Manrope", 700, 25, 16, W - MARGIN * 2 - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      const pillY = H - 96;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, MARGIN, pillY, ctaW + padX * 2, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = "#6E0F1F";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, MARGIN + padX, pillY + pillH / 2 + 1);
    },
  },
  {
    key: "urgent",
    swatch: "linear-gradient(180deg, #C41D33 0%, #C41D33 16%, #121010 16%, #121010 100%)",
    label: "light",
    draw(ctx, t) {
      ctx.fillStyle = "#121010";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#C41D33";
      ctx.fillRect(0, 0, W, 64);
      ctx.fillStyle = "#ffffff";
      ctx.font = '800 18px "Manrope"';
      ctx.textBaseline = "middle";
      ctx.fillText("▲  URGENT", MARGIN, 33);

      ctx.textBaseline = "alphabetic";
      const maxW = W - MARGIN * 2;
      ctx.fillStyle = "#ffffff";
      const tSize = fitFontSize(ctx, t.titlu, "Sora", 800, 56, 30, maxW);
      ctx.fillText(t.titlu, MARGIN, 190);

      ctx.fillStyle = "#C9C2BE";
      fitFontSize(ctx, t.subtitlu, "Manrope", 500, 28, 18, maxW);
      ctx.fillText(t.subtitlu, MARGIN, 190 + tSize * 0.7 + 12);

      const padX = 22, boxH = 50;
      fitFontSize(ctx, t.cta, "Manrope", 700, 24, 16, maxW - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      const boxY = H - 88;
      ctx.strokeStyle = "#C41D33";
      ctx.lineWidth = 2;
      roundRect(ctx, MARGIN, boxY, ctaW + padX * 2, boxH, 8);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, MARGIN + padX, boxY + boxH / 2 + 1);
    },
  },
  {
    key: "elegant",
    swatch: "linear-gradient(135deg, #F7F3EC 0%, #F1E6CE 100%)",
    label: "dark",
    draw(ctx, t) {
      ctx.fillStyle = "#F7F3EC";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#B08B2E";
      ctx.font = '700 13px "Manrope"';
      ctx.fillText("S A L V E A Z Ă   O   I N I M Ă", MARGIN, 64);

      const maxW = W - MARGIN * 2;
      ctx.fillStyle = "#241C18";
      const tSize = fitFontSize(ctx, t.titlu, "Georgia", 700, 54, 28, maxW);
      const titleY = 64 + tSize * 0.95 + 22;
      ctx.fillText(t.titlu, MARGIN, titleY);

      ctx.strokeStyle = "#C9A94E";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(MARGIN, titleY + 22);
      ctx.lineTo(MARGIN + 70, titleY + 22);
      ctx.stroke();

      ctx.fillStyle = "#5A4F3C";
      fitFontSize(ctx, t.subtitlu, "Manrope", 500, 26, 16, maxW);
      ctx.fillText(t.subtitlu, MARGIN, titleY + 58);

      ctx.font = '700 24px "Manrope"';
      fitFontSize(ctx, t.cta, "Manrope", 700, 24, 16, maxW);
      ctx.fillStyle = "#241C18";
      const ctaW = ctx.measureText(t.cta).width;
      const ctaX = W - MARGIN - ctaW;
      const ctaY = H - 60;
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
    draw(ctx, t) {
      ctx.fillStyle = "#050B14";
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(300, 160, 20, 300, 160, 420);
      glow.addColorStop(0, "rgba(74,159,216,0.35)");
      glow.addColorStop(1, "rgba(5,11,20,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      const stars: Array<[number, number]> = [
        [80, 40], [140, 90], [900, 50], [980, 120], [760, 60],
        [1000, 220], [920, 300], [60, 300], [180, 340], [500, 40], [620, 330],
      ];
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      stars.forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      const maxW = W - MARGIN * 2;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(74,159,216,0.6)";
      ctx.shadowBlur = 18;
      const tSize = fitFontSize(ctx, t.titlu, "Sora", 800, 56, 30, maxW);
      ctx.fillText(t.titlu, MARGIN, 168);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#9FC2DC";
      fitFontSize(ctx, t.subtitlu, "Manrope", 500, 28, 18, maxW);
      ctx.fillText(t.subtitlu, MARGIN, 168 + tSize * 0.7 + 12);

      const padX = 24, pillH = 52;
      fitFontSize(ctx, t.cta, "Manrope", 700, 24, 16, maxW - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      const pillY = H - 92;
      ctx.strokeStyle = "#4A9FD8";
      ctx.lineWidth = 2;
      roundRect(ctx, MARGIN, pillY, ctaW + padX * 2, pillH, pillH / 2);
      ctx.stroke();
      ctx.fillStyle = "#DCEEFA";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, MARGIN + padX, pillY + pillH / 2 + 1);
    },
  },
  {
    key: "poveste",
    swatch: "linear-gradient(135deg, #F4977A 0%, #FCC98A 100%)",
    label: "light",
    draw(ctx, t) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#F4977A");
      grad.addColorStop(1, "#FCC98A");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(900, 80, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const maxW = 680;
      ctx.fillStyle = "#ffffff";
      const tSize = fitFontSize(ctx, t.titlu, "Sora", 800, 56, 30, maxW);
      ctx.fillText(t.titlu, MARGIN, 150);

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      fitFontSize(ctx, t.subtitlu, "Manrope", 500, 28, 18, maxW);
      ctx.fillText(t.subtitlu, MARGIN, 150 + tSize * 0.72 + 12);

      const padX = 28, pillH = 56;
      fitFontSize(ctx, t.cta, "Manrope", 700, 25, 16, W - MARGIN * 2 - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      const pillY = H - 96;
      ctx.fillStyle = "#ffffff";
      roundRect(ctx, MARGIN, pillY, ctaW + padX * 2, pillH, 16);
      ctx.fill();
      ctx.fillStyle = "#C4633F";
      ctx.textBaseline = "middle";
      ctx.fillText(t.cta, MARGIN + padX, pillY + pillH / 2 + 1);
    },
  },
  {
    key: "parteneri",
    swatch: "linear-gradient(135deg, #0F1F3D 0%, #173B6B 100%)",
    label: "light",
    draw(ctx, t) {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#0F1F3D");
      grad.addColorStop(1, "#173B6B");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(700 + i * 40, 0);
        ctx.lineTo(700 + i * 40 - 160, H);
        ctx.stroke();
      }
      ctx.restore();

      const maxW = 620;
      ctx.fillStyle = "#ffffff";
      fitFontSize(ctx, t.titlu, "Sora", 800, 54, 28, maxW);
      ctx.fillText(t.titlu, MARGIN, 140);

      ctx.strokeStyle = "#8FB4DE";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(MARGIN, 158);
      ctx.lineTo(MARGIN + 60, 158);
      ctx.stroke();

      ctx.fillStyle = "#B9CCE3";
      fitFontSize(ctx, t.subtitlu, "Manrope", 500, 26, 16, maxW);
      ctx.fillText(t.subtitlu, MARGIN, 196);

      const padX = 22, btnH = 48;
      fitFontSize(ctx, t.cta, "Manrope", 700, 22, 15, maxW - padX * 2);
      const ctaW = ctx.measureText(t.cta).width;
      const btnW = ctaW + padX * 2;
      const btnX = W - MARGIN - btnW;
      const btnY = H - 86;
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

export default function BannereSmsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.bannereSms;
  const [titlu, setTitlu] = useState("Ajută un copil azi");
  const [subtitlu, setSubtitlu] = useState("Trimite STAR la 8845 și donează 2 EUR");
  const [cta, setCta] = useState("salveazaoinima.org.ro");
  const [templateKey, setTemplateKey] = useState<string>(TEMPLATES[0].key);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const template = TEMPLATES.find((tpl) => tpl.key === templateKey) ?? TEMPLATES[0];

  useEffect(() => {
    ensureFontsLinked();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;

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
      template.draw(ctx, { titlu, subtitlu, cta });
    })();

    return () => {
      cancelled = true;
    };
  }, [titlu, subtitlu, cta, template]);

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
            onClick={() => canvasRef.current && downloadCanvasPng(canvasRef.current, `banner-sms-${templateKey}.png`)}
            className="w-full"
          >
            <Download className="h-3.5 w-3.5" /> {dict.descarcaPng}
          </Button>
        </Card>

        <Card className="flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-full rounded-lg shadow-[var(--ci-shadow-md)]" style={{ width: "100%", maxWidth: 640, height: "auto", aspectRatio: "1080 / 400" }} />
        </Card>
      </div>
    </div>
  );
}
