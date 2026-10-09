"use client";

import { Bell, Check, ExternalLink, Phone, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, Textarea } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";

import { getPanouDonator, seteazaStareDonator, type PanouDonator, type StarePatch } from "./pf-actions";
import { adaugaNotitaDonator } from "./reali/actions";

const dataRo = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const dataOra = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const lei = (n: number | null) => (n === null ? "—" : `${Math.round(n).toLocaleString("ro-RO")} lei`);

const ACTIUNI: Record<string, string> = {
  donator_sunat: "marcat ca sunat",
  donator_sunat_anulat: "sunat anulat",
  donator_multumit: "marcat ca mulțumit",
  donator_multumit_anulat: "mulțumire anulată",
  donator_a_raspuns: "a răspuns",
  donator_a_raspuns_anulat: "răspuns anulat",
  donator_nu_contactat: "marcat „nu contactat”",
  donator_contactare_permisa: "contactare permisă din nou",
  donator_reapel_programat: "reapel programat",
  donator_reapel_scos: "reapel scos",
  donator_winback_reactivare: "intrat în reactivare",
  donator_winback_reactivat: "marcat reactivat",
  donator_winback_pierdut: "marcat pierdut",
  donator_winback_scos: "scos din win-back",
};

// Panoul lateral al unui donator: detalii și acțiuni, fără să părăsești lista.
export function PanouDonatorView({ orgSlug, id, onClose, onSchimbat }: { orgSlug: string; id: string | null; onClose: () => void; onSchimbat: () => void }) {
  const [date, setDate] = useState<PanouDonator | null>(null);
  const [seIncarca, setSeIncarca] = useState(false);
  const [eroare, setEroare] = useState("");
  const [reapel, setReapel] = useState("");
  const [notita, setNotita] = useState("");

  // Reîncarcă datele panoului (și la deschidere, și după fiecare acțiune).
  async function reincarca(idCurent: string) {
    const d = await getPanouDonator(orgSlug, idCurent);
    setDate(d);
    setReapel(d?.rand.reapel_la ?? "");
    setSeIncarca(false);
  }

  useEffect(() => {
    if (!id) return;
    let activ = true;
    setTimeout(() => {
      if (!activ) return;
      setSeIncarca(true);
      setEroare("");
      void reincarca(id);
    }, 0);
    return () => {
      activ = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function seteaza(patch: StarePatch) {
    if (!id) return;
    setEroare("");
    const r = await seteazaStareDonator(orgSlug, id, patch);
    if (!r.ok) return setEroare(r.eroare);
    await reincarca(id);
    onSchimbat();
  }

  async function adaugaNotita() {
    if (!id || !notita.trim()) return;
    const r = await adaugaNotitaDonator(orgSlug, id, notita);
    if (r.error) return setEroare(r.error);
    setNotita("");
    await reincarca(id);
    onSchimbat();
  }

  const r = date?.rand;
  const comutator = (activ: boolean, eticheta: string, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activ}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
        activ ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
      }`}
    >
      {activ ? <Check className="size-3.5" aria-hidden /> : icon}
      {eticheta}
    </button>
  );

  return (
    <SidePanel open={id !== null} onClose={onClose} title={r?.nume ?? "Donator"} subtitle={r?.email}>
      {seIncarca && !date ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">Se încarcă…</p>
      ) : !r ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">Donatorul nu mai există.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-3">
            <Stat eticheta="Total donat" valoare={lei(r.total)} />
            <Stat eticheta="Donații" valoare={String(r.nr)} />
            <Stat eticheta="Prima donație" valoare={dataRo(r.prima)} />
            <Stat eticheta="Ultima donație" valoare={`${dataRo(r.ultima)}${r.ultima_suma !== null ? ` · ${lei(r.ultima_suma)}` : ""}`} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {r.lunar && <Badge tone="green" icon={false}>Donator lunar</Badge>}
            {r.nr >= 2 && !r.lunar && <Badge tone="blue" icon={false}>Recurent</Badge>}
            {r.dezabonat_email_la && <Badge tone="amber" icon={false}>Dezabonat de la email</Badge>}
            {r.consimtamant_email === true && !r.dezabonat_email_la && <Badge tone="green" icon={false}>Consimțământ email</Badge>}
            {r.wb_stage && <Badge tone="purple" icon={false}>Win-back: {r.wb_stage}</Badge>}
          </div>

          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Contact</h3>
            <p className="mt-1.5 text-[13px] text-[var(--ci-text)]">{r.telefon ?? <span className="text-[var(--ci-text-muted)]">Fără telefon</span>}</p>
            <p className="text-[13px] text-[var(--ci-text-muted)]">{[r.localitate, r.judet].filter(Boolean).join(", ") || "Fără locație"}</p>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Stare de lucru</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {comutator(r.sunat_la !== null, r.sunat_la ? `Sunat ${dataRo(r.sunat_la)}` : "Sunat", () => seteaza({ sunat: r.sunat_la === null }), <Phone className="size-3.5" aria-hidden />)}
              {comutator(r.multumit_la !== null, r.multumit_la ? `Mulțumit ${dataRo(r.multumit_la)}` : "Mulțumit", () => seteaza({ multumit: r.multumit_la === null }), <ThumbsUp className="size-3.5" aria-hidden />)}
              {comutator(r.a_raspuns, "A răspuns", () => seteaza({ aRaspuns: !r.a_raspuns }), null)}
              {comutator(r.nu_contactat, "Nu contactat", () => seteaza({ nuContactat: !r.nu_contactat }), null)}
            </div>
            <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">„Nu contactat” scoate donatorul din „De sunat” și din exporturile pe canal.</p>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[12px] font-medium text-[var(--ci-text-muted)]">
                  <Bell className="size-3.5" aria-hidden /> Reapel până la
                </span>
                <input type="date" value={reapel} onChange={(e) => setReapel(e.target.value)} className="h-9 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[13px] text-[var(--ci-text)]" />
              </label>
              <Button size="sm" disabled={!reapel} onClick={() => seteaza({ reapelLa: reapel })}>
                Programează
              </Button>
              {r.reapel_la && (
                <Button size="sm" variant="ghost" onClick={() => seteaza({ reapelLa: null })}>
                  Scoate
                </Button>
              )}
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-medium text-[var(--ci-text-muted)]">Etapă win-back</span>
              <Select value={r.wb_stage ?? ""} onChange={(e) => seteaza({ wbStage: (e.target.value || null) as StarePatch["wbStage"] })}>
                <option value="">Niciuna</option>
                <option value="reactivare">În reactivare</option>
                <option value="reactivat">Reactivat</option>
                <option value="pierdut">Pierdut</option>
              </Select>
            </label>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Notițe ({date.notite.length})</h3>
            <div className="mt-2 flex gap-2">
              <Textarea rows={2} value={notita} onChange={(e) => setNotita(e.target.value)} placeholder="Adaugă o notiță…" aria-label="Notiță nouă" className="min-h-0" />
              <Button size="sm" disabled={!notita.trim()} onClick={adaugaNotita}>
                Adaugă
              </Button>
            </div>
            <ul className="mt-2 space-y-2">
              {date.notite.map((n) => (
                <li key={n.id} className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
                  <p className="whitespace-pre-line">{n.text}</p>
                  <p className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">
                    {n.autor ?? "—"} · {dataOra(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Donații</h3>
            <ul className="mt-2 divide-y divide-[var(--ci-border)]">
              {date.donatii.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--ci-text)]">{d.proiect ?? "Fără proiect"}</span>
                    <span className="text-[12px] text-[var(--ci-text-muted)]">
                      {dataRo(d.data)}
                      {d.recurenta ? " · lunar" : ""}
                    </span>
                  </span>
                  <span className="ci-tabular shrink-0 font-semibold text-[var(--ci-text)]">{lei(d.suma)}</span>
                </li>
              ))}
            </ul>
          </section>

          {date.activitate.length > 0 && (
            <section>
              <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Activitate</h3>
              <ul className="mt-2 space-y-1">
                {date.activitate.map((a, i) => (
                  <li key={i} className="text-[12.5px] text-[var(--ci-text-muted)]">
                    {dataOra(a.la)} · {ACTIUNI[a.actiune] ?? a.actiune}
                    {a.autor ? ` · ${a.autor}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {eroare && (
            <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
              {eroare}
            </p>
          )}

          <Link href={`/${orgSlug}/crm/donatori/reali/${r.id}`} prefetch={false} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
            Fișa completă <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </SidePanel>
  );
}

function Stat({ eticheta, valoare }: { eticheta: string; valoare: string }) {
  return (
    <div>
      <p className="text-[11.5px] text-[var(--ci-text-muted)]">{eticheta}</p>
      <p className="ci-tabular mt-0.5 text-[13.5px] font-semibold text-[var(--ci-text)]">{valoare}</p>
    </div>
  );
}

