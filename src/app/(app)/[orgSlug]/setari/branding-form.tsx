"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";
import { updateBrandingAction, type BrandingState } from "./actions";

// Culoarea medie a pixelilor opaci dintr-un logo, calculată pe canvas — nu
// e o extracție „inteligentă" (paletă dominantă), doar o medie simplă, dar
// suficientă ca punct de plecare editabil manual.
function extractAverageColor(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = 40);
  const h = (canvas.height = 40);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "#154A85";
  ctx.drawImage(img, 0, 0, w, h);
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue; // ignoră pixelii transparenți
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  } catch {
    return "#154A85"; // canvas „tainted" (imagine cross-origin) — păstrează implicitul
  }
  if (!n) return "#154A85";
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function BrandingForm({
  orgSlug,
  locale,
  initialLogoUrl,
  initialSlogan,
  initialBrandColor,
  onSaved,
}: {
  orgSlug: string;
  locale: Locale;
  initialLogoUrl: string | null;
  initialSlogan: string | null;
  initialBrandColor: string | null;
  onSaved?: () => void;
}) {
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari;
  const router = useRouter();
  const boundAction = updateBrandingAction.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState<BrandingState, FormData>(boundAction, {
    error: null,
    ok: false,
  });
  const [preview, setPreview] = useState<string | null>(initialLogoUrl);
  const [color, setColor] = useState(initialBrandColor || "#154A85");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    // header-ul și accentul CRM sunt citite din server (layout-uri) — fără
    // refresh, logo-ul nou nu apare decât la următoarea navigare.
    router.refresh();
    onSaved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      const img = document.createElement("img");
      img.onload = () => setColor(extractAverageColor(img));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <div>
        <label className="text-sm font-medium text-ink">{dict.logo}</label>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-line bg-panel-2">
            {preview ? (
              <Image src={preview} alt="" width={64} height={64} className="h-full w-full object-contain" unoptimized />
            ) : (
              <span className="text-xs text-muted">{dict.faraLogo}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink transition hover:border-brand-green"
          >
            {dict.incarcaLogo}
          </button>
          <input
            ref={fileRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
        <p className="mt-1 text-xs text-muted">{dict.logoFormat}</p>
      </div>

      <label className="text-sm font-medium text-ink">
        {dict.slogan}
        <input
          name="slogan"
          defaultValue={initialSlogan ?? ""}
          placeholder={dict.sloganPlaceholder}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
        />
      </label>

      <div>
        <label className="text-sm font-medium text-ink">{dict.culoareOrg}</label>
        <p className="mt-1 text-xs text-muted">{dict.culoareOrgDesc}</p>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="color"
            name="brandColor"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-line p-1"
          />
          <span className="text-sm text-muted">{color}</span>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && !state.error && <p className="text-sm text-brand-green-hover">{dict.salvat}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-green px-5 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
      >
        {pending ? dict.seSalveaza : dict.salveaza}
      </button>
    </form>
  );
}
