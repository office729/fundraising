"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

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
        setEroare(r.error ?? "Exportul a eșuat.");
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
    if (!window.confirm(`Ștergi/anonimizezi datele asociate cu ${rezultat.email} din sursele de mai jos? Nu se poate anula.`)) return;
    setEroare(null);
    startTransition(async () => {
      const r = await stergePersoanaAction(orgSlug, rezultat.email);
      if (r.error || !r.rezumat) {
        setEroare(r.error ?? "Ștergerea a eșuat.");
        return;
      }
      const x = r.rezumat;
      setMesaj(
        `Gata: ${x.contacteSterse} contacte șterse, ${x.voluntariStersi} voluntari scoși, ${x.paginiAnonimizate} pagini și ${x.mesajeAnonimizate} mesaje anonimizate, ${x.contacteMediaAnonimizate} contacte media anonimizate.`,
      );
      const nou = await cautaPersoanaAction(orgSlug, rezultat.email);
      if (nou.rezultat) setRezultat(nou.rezultat);
    });
  }

  return (
    <div className="mt-6">
      <form onSubmit={cauta} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm font-medium text-ink" style={{ minWidth: 220 }}>
          Adresa de email a persoanei
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
          Caută
        </button>
      </form>

      {eroare && <p className="mt-3 text-sm text-red-600">{eroare}</p>}
      {mesaj && <p className="mt-3 text-sm text-brand-green">{mesaj}</p>}

      {rezultat && (
        <div className="mt-5 rounded-xl border border-line bg-panel p-5">
          <p className="text-sm font-medium text-ink">Date găsite pentru {rezultat.email}</p>
          <ul className="mt-2">
            <Rand eticheta="Persoane de contact la companii (CRM Companii)" n={rezultat.contacte} />
            <Rand eticheta="Voluntari (CRM Voluntari)" n={rezultat.voluntari} />
            <Rand eticheta="Pagini de campanie create" n={rezultat.paginiCreate} />
            <Rand eticheta="Mesaje trimise (portal beneficiari)" n={rezultat.mesaje} />
            <Rand eticheta="Contacte media" n={rezultat.contacteMedia} />
          </ul>

          {(rezultat.donatorId || rezultat.donatii > 0 || rezultat.formulare230 > 0) && (
            <p className="mt-3 rounded-lg bg-panel-2 p-3 text-xs leading-relaxed text-muted">
              Persoana apare și ca donator ({rezultat.donatii} donații, {rezultat.formulare230} formulare 230). Datele de donator,
              donațiile și Formularul 230 au evidență contabilă/legală și se gestionează din panoul GDPR al donatorului
              {rezultat.donatorId && (
                <>
                  {" — "}
                  <Link href={`/${orgSlug}/crm/donatori/reali/${rezultat.donatorId}`} className="font-medium text-brand-green underline">
                    deschide profilul
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
              Exportă datele (JSON)
            </button>
            <button
              type="button"
              onClick={sterge}
              disabled={pending || total === 0}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Șterge / anonimizează
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
