"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { METODE } from "@/lib/performanta-masurare";
import { METRICA_PE_ID } from "@/lib/performanta-metrici";
import { SABLON_PE_ID, type KrSablon, type SablonEfectiv, type TintaOrg } from "@/lib/performanta-sabloane";
import type { ReferintaCrm } from "@/lib/performanta-sabloane-setari";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label } from "../components/ui/input";
import { resetSablonAction, salveazaSablonAction } from "./sabloane-actions";

type Camp = { tinta: string; tintaMax: string; nivelInitial: string };
const text = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));
const numar = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const fmt = (v: number | null, unitate: string | undefined) => (v === null ? "fără date" : `${v.toLocaleString("ro-RO", { maximumFractionDigits: 1 })}${unitate ? ` ${unitate}` : ""}`);

export function SabloaneClient({ orgSlug, sabloane, referinte, admin }: { orgSlug: string; sabloane: SablonEfectiv[]; referinte: Record<string, ReferintaCrm>; admin: boolean }) {
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
        Șabloanele pornesc cu ținte-exemplu. Aici stabilești țintele reale, odată agreate cu echipa: introdu valorile și apoi confirmă șablonul. Obiectivele create din el ulterior folosesc țintele tale și nu mai poartă nota „țintă de exemplu”. Obiectivele deja create nu se modifică.
        {!admin && " Țintele le stabilește un administrator; tu le poți doar vedea."}
      </p>
      <ul className="space-y-4">
        {sabloane.map((s) => (
          <li key={`${s.id}-${JSON.stringify(s.tinteOrg)}-${s.confirmat}`}>
            <Sablon orgSlug={orgSlug} s={s} referinte={referinte} admin={admin} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sablon({ orgSlug, s, referinte, admin }: { orgSlug: string; s: SablonEfectiv; referinte: Record<string, ReferintaCrm>; admin: boolean }) {
  const router = useRouter();
  const exemplu = SABLON_PE_ID.get(s.id)!;
  const krs = s.obiective.flatMap((o) => o.rezultate);
  const krExemplu = new Map(exemplu.obiective.flatMap((o) => o.rezultate).map((r) => [r.titlu, r]));
  const [val, setVal] = useState<Record<string, Camp>>(() =>
    Object.fromEntries(krs.filter((r) => r.metoda !== "binar").map((r) => {
      const o = s.tinteOrg[r.titlu];
      return [r.titlu, { tinta: text(o?.tinta), tintaMax: text(o?.tintaMax), nivelInitial: text(o?.nivelInitial) }];
    })),
  );
  const [confirmat, setConfirmat] = useState(s.confirmat);
  const [mesaj, setMesaj] = useState<{ t: string; eroare: boolean } | null>(null);
  const [pending, tr] = useTransition();
  const completate = Object.values(val).filter((c) => numar(c.tinta) !== null).length;
  const masurabile = krs.filter((r) => r.metoda !== "binar").length;

  function salveaza(reset = false) {
    setMesaj(null);
    tr(async () => {
      if (reset) {
        const r = await resetSablonAction(orgSlug, s.id);
        if (!r.ok) return setMesaj({ t: r.eroare, eroare: true });
        router.refresh();
        return;
      }
      const tinte: Record<string, TintaOrg> = {};
      for (const kr of krs) {
        if (kr.metoda === "binar") continue;
        const c = val[kr.titlu];
        if (!c || numar(c.tinta) === null) continue;
        tinte[kr.titlu] = { tinta: numar(c.tinta), tintaMax: kr.metoda === "interval" ? numar(c.tintaMax) : null, nivelInitial: kr.metoda === "interval" ? null : numar(c.nivelInitial) };
      }
      const r = await salveazaSablonAction(orgSlug, s.id, tinte, confirmat);
      if (!r.ok) return setMesaj({ t: r.eroare, eroare: true });
      setMesaj({ t: confirmat ? "Țintele au fost salvate și șablonul e confirmat." : "Țintele au fost salvate.", eroare: false });
      router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{s.rol}</h3>
          <p className="text-[13px] text-[var(--ci-text-muted)]">{s.rezumat}</p>
        </div>
        {s.confirmat ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ci-green-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--ci-green)]">
            <CheckCircle2 className="size-3.5" aria-hidden /> Ținte confirmate{s.confirmatLa ? ` · ${s.confirmatLa.split("-").reverse().join(".")}` : ""}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--ci-amber-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--ci-amber)]">Ținte de exemplu · {completate} din {masurabile} stabilite</span>
        )}
      </div>

      <div className="mt-3 space-y-4">
        {s.obiective.map((o) => (
          <section key={o.titlu} aria-label={o.titlu}>
            <h4 className="text-[13.5px] font-semibold text-[var(--ci-text)]">{o.titlu}</h4>
            <ul className="mt-2 space-y-2.5">
              {o.rezultate.map((r) => (
                <li key={r.titlu} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3">
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">
                    {r.titlu} <span className="font-normal text-[var(--ci-text-muted)]">· {METODE.find((m) => m.id === r.metoda)?.eticheta.toLowerCase()}{r.unitate ? ` · ${r.unitate}` : ""}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                    {r.sursa === "crm" ? `Sursă: CRM, ${METRICA_PE_ID.get(r.metrica ?? "")?.eticheta ?? r.metrica}` : "Sursă: introdusă manual"}
                  </p>
                  {r.metoda === "binar" ? (
                    <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">Realizat / nerealizat: nu are țintă numerică.</p>
                  ) : (
                    <Camp r={r} ex={krExemplu.get(r.titlu)!} c={val[r.titlu]} admin={admin} onChange={(c) => setVal((v) => ({ ...v, [r.titlu]: c }))} id={`${s.id}-${r.titlu}`} />
                  )}
                  {r.sursa === "crm" && r.metrica && referinte[r.metrica] && (
                    <p className="mt-1.5 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-2.5 py-1.5 text-[12px] text-[var(--ci-text-muted)]">
                      <strong className="font-medium text-[var(--ci-text)]">Punct de plecare din CRM:</strong> {referinte[r.metrica].etichetaAnterior}: {fmt(referinte[r.metrica].trimestruAnterior, r.unitate)} · {referinte[r.metrica].etichetaAnTrecut}: {fmt(referinte[r.metrica].acelasiAnTrecut, r.unitate)}
                      {METRICA_PE_ID.get(r.metrica)?.snapshot && " (valoare de moment, aceeași pentru ambele)"}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {admin && (
        <div className="mt-4 space-y-3 border-t border-[var(--ci-border)] pt-3">
          <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[var(--ci-text)]">
            <input type="checkbox" className="mt-0.5 size-4" checked={confirmat} onChange={(e) => setConfirmat(e.target.checked)} />
            <span>
              Țintele au fost stabilite cu echipa
              <span className="block text-[12px] text-[var(--ci-text-muted)]">Se poate confirma doar când toate rezultatele-cheie măsurabile au o țintă introdusă de tine.</span>
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" loading={pending} onClick={() => salveaza()}>
              Salvează țintele
            </Button>
            {s.personalizat && (
              <Button loading={pending} onClick={() => window.confirm("Revii la țintele-exemplu? Țintele introduse pentru acest șablon se șterg.") && salveaza(true)}>
                Revino la exemple
              </Button>
            )}
            <p role="status" aria-live="polite" className={mesaj ? `text-[13px] ${mesaj.eroare ? "rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
              {mesaj?.t ?? ""}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function Camp({ r, ex, c, admin, onChange, id }: { r: KrSablon; ex: KrSablon; c: Camp; admin: boolean; onChange: (c: Camp) => void; id: string }) {
  const interval = r.metoda === "interval";
  return (
    <div className={`mt-2 grid gap-2 ${interval ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
      {!interval && (
        <div>
          <Label htmlFor={`${id}-ni`}>Nivel de pornire</Label>
          <Input id={`${id}-ni`} inputMode="decimal" disabled={!admin} value={c.nivelInitial} placeholder={text(ex.nivelInitial) || "0"} onChange={(e) => onChange({ ...c, nivelInitial: e.target.value })} />
        </div>
      )}
      <div>
        <Label htmlFor={`${id}-t`}>{interval ? "Limita de jos" : r.metoda === "descrescator" ? "Cel mult" : "Țintă"}</Label>
        <Input id={`${id}-t`} inputMode="decimal" disabled={!admin} value={c.tinta} placeholder={`exemplu: ${text(ex.tinta)}`} onChange={(e) => onChange({ ...c, tinta: e.target.value })} />
      </div>
      {interval && (
        <div>
          <Label htmlFor={`${id}-x`}>Limita de sus</Label>
          <Input id={`${id}-x`} inputMode="decimal" disabled={!admin} value={c.tintaMax} placeholder={`exemplu: ${text(ex.tintaMax)}`} onChange={(e) => onChange({ ...c, tintaMax: e.target.value })} />
        </div>
      )}
    </div>
  );
}
