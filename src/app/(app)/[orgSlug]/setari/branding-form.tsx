"use client";

import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { TOATE_DOMENIILE, type DomeniuActivitate } from "@/lib/campaign-templates";
import type { Locale } from "@/lib/i18n/config";
import { JUDETE } from "@/lib/judete";
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
  initialCif,
  initialAdresaSediu = null,
  initialJudet = null,
  initialIban = null,
  initialDomeniuActivitate,
  showDateFacturare = true,
  onSaved,
}: {
  orgSlug: string;
  locale: Locale;
  initialLogoUrl: string | null;
  initialSlogan: string | null;
  initialBrandColor: string | null;
  initialCif: string | null;
  initialAdresaSediu?: string | null;
  initialJudet?: string | null;
  initialIban?: string | null;
  initialDomeniuActivitate: DomeniuActivitate | null;
  // Ascuns în dialogul de onboarding (identitate vizuală rapidă la primul
  // login) — datele de facturare se completează ulterior, din Setări.
  showDateFacturare?: boolean;
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

  const [numeFisier, setNumeFisier] = useState<string | null>(null);
  const [eroareLogo, setEroareLogo] = useState<string | null>(null);
  const [tragere, setTragere] = useState(false);

  // Verificăm fișierul imediat, la alegere (nu abia la salvare, după ce omul a completat tot formularul).
  function preiaFisier(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setEroareLogo(dict.logoTipInvalid);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setEroareLogo(dict.logoPreaMare);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setEroareLogo(null);
    setNumeFisier(file.name);
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    preiaFisier(e.target.files?.[0]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setTragere(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !fileRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileRef.current.files = dt.files;
    preiaFisier(file);
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          <label htmlFor="logo-input" className="text-sm font-medium text-ink">
            {dict.logo}
          </label>
          {!initialLogoUrl && !numeFisier && (
            <span className="rounded-full bg-brand-green-soft px-2 py-0.5 text-[11px] font-semibold text-brand-green">{dict.logoIncepeAici}</span>
          )}
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setTragere(true);
          }}
          onDragLeave={() => setTragere(false)}
          onDrop={onDrop}
          className={`mt-2 flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-5 text-center transition sm:flex-row sm:text-left ${
            tragere ? "border-brand-green bg-brand-green-soft" : "border-line bg-panel-2"
          }`}
        >
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
            {preview ? (
              <Image src={preview} alt="" width={96} height={96} className="h-full w-full object-contain" unoptimized />
            ) : (
              <ImagePlus className="h-8 w-8 text-muted-2" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{preview ? dict.logoSchimbaTitlu : dict.logoDropTitlu}</p>
            <p className="mt-0.5 text-xs text-muted">
              {dict.logoDropIndiciu} {dict.logoFormat}
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-hover"
            >
              {preview ? dict.logoSchimba : dict.incarcaLogo}
            </button>
          </div>
          <input
            id="logo-input"
            ref={fileRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
        {eroareLogo && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {eroareLogo}
          </p>
        )}
        {numeFisier && !eroareLogo && (
          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-brand-amber-soft px-3 py-2 text-sm text-ink">
            <span>{dict.logoAleasa(numeFisier)}</span>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
            >
              {pending ? dict.seSalveaza : dict.logoSalveazaAcum}
            </button>
          </div>
        )}
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
            aria-label={dict.culoareOrg}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-line p-1"
          />
          <span className="text-sm text-muted">{color}</span>
        </div>
      </div>

      <label className="text-sm font-medium text-ink">
        {dict.cif}
        <input
          name="cif"
          defaultValue={initialCif ?? ""}
          placeholder={dict.cifPlaceholder}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
        />
      </label>

      {showDateFacturare && (
        <div>
          <p className="text-sm font-medium text-ink">{dict.dateFacturare.title}</p>
          <p className="mt-1 text-xs text-muted">{dict.dateFacturare.descriere}</p>
          <div className="mt-2.5 flex flex-col gap-3">
            <label className="text-sm font-medium text-ink">
              {dict.dateFacturare.adresaSediu}
              <input
                name="adresaSediu"
                defaultValue={initialAdresaSediu ?? ""}
                placeholder={dict.dateFacturare.adresaSediuPlaceholder}
                className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
              />
            </label>
            <label className="text-sm font-medium text-ink">
              {dict.dateFacturare.judet}
              <select
                name="judet"
                defaultValue={initialJudet ?? ""}
                className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
              >
                <option value="">{dict.dateFacturare.judetAlege}</option>
                {JUDETE.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-ink">
              {dict.dateFacturare.iban}
              <input
                name="iban"
                defaultValue={initialIban ?? ""}
                placeholder={dict.dateFacturare.ibanPlaceholder}
                className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
              />
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-ink">{dict.domeniuActivitate.label}</label>
        <p className="mt-1 text-xs text-muted">{dict.domeniuActivitate.descriere}</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="domeniuActivitate"
              value=""
              defaultChecked={!initialDomeniuActivitate}
              className="peer sr-only"
            />
            <div className="flex h-11 items-center justify-center rounded-lg border border-line bg-panel-2 px-1 text-center text-[11px] leading-tight font-medium text-muted peer-checked:border-brand-green peer-checked:ring-2 peer-checked:ring-brand-green">
              {dict.domeniuActivitate.alege}
            </div>
          </label>
          {TOATE_DOMENIILE.map((id) => (
            <label key={id} className="cursor-pointer" data-domeniu={id}>
              <input
                type="radio"
                name="domeniuActivitate"
                value={id}
                defaultChecked={initialDomeniuActivitate === id}
                className="peer sr-only"
              />
              <div className="flex h-11 items-center justify-center rounded-lg border border-line bg-gradient-to-br from-brand-blue-soft to-brand-green-soft px-1 text-center text-[11px] leading-tight font-medium text-body peer-checked:border-brand-green peer-checked:ring-2 peer-checked:ring-brand-green">
                {dict.domeniuActivitate.optiuni[id]}
              </div>
            </label>
          ))}
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
