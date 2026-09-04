"use client";

import { Download } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Select } from "../../components/ui/input";
import { downloadCanvasPng } from "../../lib/download-doc";
import { useBeneficiari } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

type Lang = "ro" | "en";

const LABELS: Record<Lang, { help: string; goal: string; of: string; org: string }> = {
  ro: { help: "Are nevoie de ajutorul tău", goal: "Strâns", of: "din", org: "Salvează o Inimă" },
  en: { help: "Needs your help", goal: "Raised", of: "of", org: "Save a Heart" },
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = word + " ";
      lines += 1;
      if (lines >= 3) return;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + lines * lineHeight);
}

export default function CarduriCazPage() {
  return (
    <Suspense fallback={null}>
      <CarduriCazContent />
    </Suspense>
  );
}

function CarduriCazContent() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const BENEFICIARI = useBeneficiari();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.carduriCaz;
  const [benId, setBenId] = useState(BENEFICIARI[0]?.id ?? "");
  const [lang, setLang] = useState<Lang>(searchParams.get("lang") === "en" ? "en" : "ro");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const b = BENEFICIARI.find((x) => x.id === benId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !b) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 800, H = 1000;
    canvas.width = W;
    canvas.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f766e");
    grad.addColorStop(1, "#134e4a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "600 20px Arial";
    ctx.fillText(LABELS[lang].org, 48, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 44px Arial";
    wrapText(ctx, b.nume, 48, 160, W - 96, 52);

    ctx.font = "500 22px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`${b.localitate} · ${LABELS[lang].help}`, 48, 240);

    ctx.font = "400 20px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    wrapText(ctx, b.poveste, 48, 320, W - 96, 30);

    const pct = Math.min(100, Math.round((b.sumaStransa / b.obiectiv) * 100));
    const barY = 780, barX = 48, barW = W - 96, barH = 18;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 9);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(barX, barY, (barW * pct) / 100, barH, 9);
    ctx.fill();

    ctx.font = "600 26px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      `${LABELS[lang].goal}: ${b.sumaStransa.toLocaleString("ro-RO")} RON ${LABELS[lang].of} ${b.obiectiv.toLocaleString("ro-RO")} RON`,
      48,
      850,
    );
    ctx.font = "700 32px Arial";
    ctx.fillText(`${pct}%`, 48, 900);
  }, [b, lang]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={benId} onChange={(e) => setBenId(e.target.value)} className="w-56">
            {BENEFICIARI.map((x) => <option key={x.id} value={x.id}>{x.nume}</option>)}
          </Select>
          <Select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="w-28">
            <option value="ro">{dict.romana}</option>
            <option value="en">{dict.engleza}</option>
          </Select>
          <Button
            variant="primary"
            onClick={() => canvasRef.current && b && downloadCanvasPng(canvasRef.current, `card-${b.nume}-${lang}.png`)}
            disabled={!b}
          >
            <Download className="h-3.5 w-3.5" /> {dict.descarcaPng}
          </Button>
        </div>
      </div>

      <Card className="flex justify-center">
        <canvas ref={canvasRef} className="max-w-full rounded-lg shadow-[var(--ci-shadow-md)]" style={{ width: 360, height: 450 }} />
      </Card>
    </div>
  );
}
