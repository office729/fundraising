"use client";

import { Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input, Label, Select } from "../../components/ui/input";
import { downloadCanvasPng } from "../../lib/download-doc";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

const PALETE = [
  { key: "teal", de: "#0f766e", la: "#134e4a" },
  { key: "rosuUrgenta", de: "#b91c1c", la: "#7f1d1d" },
  { key: "albastru", de: "#1d4ed8", la: "#1e3a8a" },
  { key: "auriu", de: "#b45309", la: "#78350f" },
] as const;

export default function BannereSmsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.bannereSms;
  const [titlu, setTitlu] = useState("Ajută un copil azi");
  const [subtitlu, setSubtitlu] = useState("Trimite STAR la 8845 și donează 2 EUR");
  const [cta, setCta] = useState("salveazaoinima.org.ro");
  const [paletaIdx, setPaletaIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paleta = PALETE[paletaIdx];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 1080, H = 400;
    canvas.width = W;
    canvas.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, paleta.de);
    grad.addColorStop(1, paleta.la);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 56px Arial";
    ctx.fillText(titlu, 60, 150);

    ctx.font = "500 32px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(subtitlu, 60, 220);

    ctx.font = "600 28px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(cta, 60, 330);
  }, [titlu, subtitlu, cta, paleta]);

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
          <div>
            <Label>{dict.paletaCulori}</Label>
            <Select value={paletaIdx} onChange={(e) => setPaletaIdx(Number(e.target.value))}>
              {PALETE.map((p, i) => <option key={p.key} value={i}>{dict.palete[p.key]}</option>)}
            </Select>
          </div>
          <Button
            variant="primary"
            onClick={() => canvasRef.current && downloadCanvasPng(canvasRef.current, "banner-sms.png")}
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
