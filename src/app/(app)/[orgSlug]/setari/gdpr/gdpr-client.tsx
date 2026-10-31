"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { SETARI_GDPR_UI_DICT } from "@/lib/i18n/dictionaries/setari-gdpr-ui";

import { useLocale } from "../../crm/lib/locale-context";
import { cautaPersoanaAction, exportaPersoanaAction, stergePersoanaAction, type RezultatCautare } from "./actions";

function Rand({ eticheta, n }: { eticheta: string; n: number }) {
  return (
    <li className="flex justify-between border-b border-line py-1.5 text-sm last:border-0">
      <span className="text-body">{eticheta}</span>
      <span className="font-medium text-ink">{n}</span>
    </li>
  );
}

export function GdprClient({ orgSlug }: { orgSlug: string }) {
  const d = SETARI_GDPR_UI_DICT[useLocale()];
  const [email, setEmail] = useState("");
  const [rezultat, setRezultat] = useState<RezultatCautare | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = rezultat ? rezultat.contacte + rezultat.voluntari + rezultat.paginiCreate + rezultat.mesaje + rezultat.contacteMedia : 0;

  function cauta(e: React.FormEvent) {
    e.preventDefault();
    setEroare(null);
    setMesaj(null);
    setRezultat(null);
    startTransition(async () => {
      const r = await cautaPersoanaAction(orgSlug, email);
      if (r.error) setEroare(r.error);
      else setRezultat(r.rezultat);
    });
  }

  function exporta() {
    if (!rezultat) return;
    setEroare(null);
    startTransition(async () => {
      const r = await exportaPersoanaAction(orgSlug, rezultat.email);
      if (r.error || !r.date) {
        setEroare(r.error ?? d.exportEsuat);
        return;
      }
      const blob = new Blob([JSON.stringify(r.date, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `date-persoana-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function sterge() {
    if (!rezultat) return;
    if (!window.confirm(d.confirma(rezultat.email))) return;
    setEroare(null);
    startTransition(async () => {
      const r = await stergePersoanaAction(orgSlug, rezultat.email);
      if (r.error || !r.rezumat) {
        setEroare(r.error ?? d.stergereEsuata);
        return;
      }
      const x = r.rezumat;
      setMesaj(d.gata(x));
      const nou = await cautaPersoanaAction(orgSlug, rezultat.email);
      if (nou.rezultat) setRezultat(nou.rezultat);
    });
  }

  return (
    <div className="mt-6">
      <form onSubmit={cauta} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm font-medium text-ink" style={{ minWidth: 220 }}>
          {d.email}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {d.cauta}
        </button>
      </form>

      {eroare && <p className="mt-3 text-sm text-red-600">{eroare}</p>}
      {mesaj && <p className="mt-3 text-sm text-brand-green">{mesaj}</p>}

      {rezultat && (
        <div className="mt-5 rounded-xl border border-line bg-panel p-5">
          <p className="text-sm font-medium text-ink">{d.gasite(rezultat.email)}</p>
          <ul className="mt-2">
            <Rand eticheta={d.randuri.contacte} n={rezultat.contacte} />
            <Rand eticheta={d.randuri.voluntari} n={rezultat.voluntari} />
            <Rand eticheta={d.randuri.pagini} n={rezultat.paginiCreate} />
            <Rand eticheta={d.randuri.mesaje} n={rezultat.mesaje} />
            <Rand eticheta={d.randuri.media} n={rezultat.contacteMedia} />
          </ul>

          {(rezultat.donatorId || rezultat.donatii > 0 || rezultat.formulare230 > 0) && (
            <p className="mt-3 rounded-lg bg-panel-2 p-3 text-xs leading-relaxed text-muted">
              {d.ceiDonator(rezultat.donatii, rezultat.formulare230)}
              {rezultat.donatorId && (
                <>
                  {" — "}
                  <Link prefetch={false} href={`/${orgSlug}/crm/donatori/reali/${rezultat.donatorId}`} className="font-medium text-brand-green underline">
                    {d.deschideProfil}
                  </Link>
                </>
              )}
              .
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exporta}
              disabled={pending}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-panel-2 disabled:opacity-60"
            >
              {d.exporta}
            </button>
            <button
              type="button"
              onClick={sterge}
              disabled={pending || total === 0}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {d.sterge}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
