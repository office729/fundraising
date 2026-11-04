"use client";

import { useState, useTransition } from "react";

import { INFLUENCERI_UI_DICT } from "@/lib/i18n/dictionaries/influenceri-ui";
import { JUDETE } from "@/lib/judete";
import { CATEGORII, PLATFORME_CHEI, type PlatformaSociala } from "@/lib/influenceri/reguli";
import type { CampuriInfluencer, DateInfluenceri, Influencer } from "@/lib/influenceri/tipuri";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Select, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

import { salveazaAction } from "./actions";
import { Camp, etichetaPlatforma, textLocale } from "./ui";

// Câmpurile fișei, în pagină (editare) sau în fereastră (adăugare). La adăugare se bifează doar platformele pe care e activ influencerul.
export function FormularCampuri({
  orgSlug,
  date,
  initial,
  onSalvat,
  onDeschideExistenta,
  onAnuleaza,
}: {
  orgSlug: string;
  date: DateInfluenceri;
  initial: Influencer | null;
  onSalvat: (id: string) => void;
  onDeschideExistenta: (id: string) => void;
  onAnuleaza: () => void;
}) {
  const locale = useLocale();
  const d = INFLUENCERI_UI_DICT[locale].form;
  const [c, setC] = useState<CampuriInfluencer>(() => ({
    nume: initial?.nume ?? "",
    numePublic: initial?.numePublic ?? "",
    fotoUrl: initial?.fotoUrl ?? "",
    instagram: initial?.instagram ?? "",
    facebook: initial?.facebook ?? "",
    tiktok: initial?.tiktok ?? "",
    youtube: initial?.youtube ?? "",
    urmaritori: initial?.urmaritori ?? {},
    categorie: initial?.categorie ?? "lifestyle",
    domeniu: initial?.domeniu ?? "",
    publicTinta: initial?.publicTinta ?? "",
    oras: initial?.oras ?? "",
    judet: initial?.judet ?? "",
    tara: initial?.tara ?? "România",
    email: initial?.email ?? "",
    telefon: initial?.telefon ?? "",
    sursaDate: initial?.sursaDate ?? d.sursaImplicita,
    temeiLegal: initial?.temeiLegal ?? d.temeiImplicit,
    responsabilId: initial?.responsabilId ?? null,
    cazId: initial?.cazId ?? null,
    note: initial?.note ?? "",
    acordPublic: initial?.acordPublic ?? false,
  }));
  const [active, setActive] = useState<PlatformaSociala[]>(() => {
    const cu = PLATFORME_CHEI.filter((k) => Boolean(initial?.[k]));
    return cu.length > 0 ? cu : ["instagram"];
  });
  const [eroare, setEroare] = useState<string | null>(null);
  const [duplicat, setDuplicat] = useState<string | null>(null);
  const [ocupat, start] = useTransition();

  const set = (k: keyof CampuriInfluencer, v: string | null) => setC((x) => ({ ...x, [k]: v }));
  const text = (k: "numePublic" | "nume" | "domeniu" | "publicTinta" | "oras" | "tara" | "email" | "telefon" | "sursaDate" | "temeiLegal", eticheta: string, placeholder?: string) => (
    <Camp eticheta={eticheta}>
      <Input value={c[k] ?? ""} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />
    </Camp>
  );
  const profil = (k: PlatformaSociala, eticheta: string) => (
    <div key={k} className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-[2fr_1fr]">
      <Camp eticheta={eticheta}>
        <Input value={c[k] ?? ""} placeholder={d.handlePlaceholder} onChange={(e) => set(k, e.target.value)} />
      </Camp>
      <Camp eticheta={`${d.urmaritori} ${etichetaPlatforma(k, locale)}`}>
        <Input
          inputMode="numeric"
          value={String(c.urmaritori?.[k] ?? "")}
          onChange={(e) => setC((x) => ({ ...x, urmaritori: { ...x.urmaritori, [k]: e.target.value.replace(/\D/g, "") } }))}
        />
      </Camp>
    </div>
  );
  const eticheteProfil: Record<PlatformaSociala, string> = { instagram: d.instagram, facebook: d.facebook, tiktok: d.tiktok, youtube: d.youtube };

  const trimite = () =>
    start(async () => {
      setEroare(null);
      setDuplicat(null);
      // Platformele nebifate nu se salvează.
      const campuri: CampuriInfluencer = { ...c, urmaritori: Object.fromEntries(Object.entries(c.urmaritori ?? {}).filter(([k]) => active.includes(k as PlatformaSociala))) };
      for (const k of PLATFORME_CHEI) if (!active.includes(k)) campuri[k] = "";
      const r = await salveazaAction(orgSlug, initial?.id ?? null, campuri);
      if (!r.ok) {
        setEroare(r.eroare);
        return;
      }
      if (r.data.duplicat) {
        setDuplicat(r.data.id);
        return;
      }
      onSalvat(r.data.id);
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {text("numePublic", d.numePublic, d.numePublicPlaceholder)}
        {text("nume", d.numeReal)}
        <Camp eticheta={d.categorie}>
          <Select value={c.categorie} onChange={(e) => set("categorie", e.target.value)}>
            {CATEGORII.map((x) => (
              <option key={x.k} value={x.k}>
                {textLocale(x, locale)}
              </option>
            ))}
          </Select>
        </Camp>
        {text("domeniu", d.domeniu, d.domeniuPlaceholder)}

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.platforme}</legend>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORME_CHEI.map((k) => {
              const bifat = active.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={bifat}
                  onClick={() => setActive((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}
                  className={`h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${bifat ? "bg-[var(--ci-primary)] text-white" : "border border-[var(--ci-border)] text-[var(--ci-text)]"}`}
                >
                  {bifat ? "✓ " : ""}
                  {etichetaPlatforma(k, locale)}
                </button>
              );
            })}
          </div>
        </fieldset>
        {PLATFORME_CHEI.filter((k) => active.includes(k)).map((k) => profil(k, eticheteProfil[k]))}

        {text("publicTinta", d.publicTinta, d.publicTintaPlaceholder)}
        {text("oras", d.oras)}
        <Camp eticheta={d.judet}>
          <Select value={c.judet ?? ""} onChange={(e) => set("judet", e.target.value)}>
            <option value="">{d.judetAuto}</option>
            {JUDETE.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </Select>
        </Camp>
        {text("tara", d.tara)}
        {text("email", d.email)}
        {text("telefon", d.telefon)}
        <Camp eticheta={d.responsabil}>
          <Select value={c.responsabilId ?? ""} onChange={(e) => set("responsabilId", e.target.value || null)}>
            <option value="">{d.nimeni}</option>
            {date.membri.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nume}
              </option>
            ))}
          </Select>
        </Camp>
        <Camp eticheta={d.campania}>
          <Select value={c.cazId ?? ""} onChange={(e) => set("cazId", e.target.value || null)}>
            <option value="">{d.niciuna}</option>
            {date.cazuri.map((z) => (
              <option key={z.id} value={z.id}>
                {z.titlu}
              </option>
            ))}
          </Select>
        </Camp>
        {text("sursaDate", d.sursa)}
        {text("temeiLegal", d.temei)}
        <Camp eticheta={d.note} className="sm:col-span-2">
          <Textarea value={c.note ?? ""} onChange={(e) => set("note", e.target.value)} rows={3} />
        </Camp>
      </div>

      <p className="text-[12.5px] text-[var(--ci-text-muted)]">{d.avertisment}</p>

      {eroare && (
        <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
          {eroare}
        </p>
      )}
      {duplicat && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
          <span>{d.existaDeja}</span>
          <Button size="sm" onClick={() => onDeschideExistenta(duplicat)}>
            {d.deschideExistenta}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onAnuleaza}>{d.anuleaza}</Button>
        <Button variant="primary" onClick={trimite} loading={ocupat} disabled={!(c.numePublic ?? "").trim() && !PLATFORME_CHEI.some((k) => active.includes(k) && (c[k] ?? "").trim())}>
          {ocupat ? d.seSalveaza : d.salveaza}
        </Button>
      </div>
    </div>
  );
}

export function FormularInfluencer({
  orgSlug,
  date,
  initial,
  onInchide,
  onSalvat,
  onDeschideExistenta,
}: {
  orgSlug: string;
  date: DateInfluenceri;
  initial: Influencer | null;
  onInchide: () => void;
  onSalvat: (id: string) => void;
  onDeschideExistenta: (id: string) => void;
}) {
  const d = INFLUENCERI_UI_DICT[useLocale()].form;
  return (
    <Dialog open onClose={onInchide} title={initial ? d.titluEditare : d.titluNou} width="max-w-3xl">
      <FormularCampuri orgSlug={orgSlug} date={date} initial={initial} onSalvat={onSalvat} onDeschideExistenta={onDeschideExistenta} onAnuleaza={onInchide} />
    </Dialog>
  );
}
