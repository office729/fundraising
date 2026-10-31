"use client";

import { Bell, Check, ExternalLink, Phone, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DONATORI_UI_DICT } from "@/lib/i18n/dictionaries/donatori-ui";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, Textarea } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";
import { useLocale } from "../lib/locale-context";

import { formatariPf } from "./pf-format";
import { getPanouDonator, seteazaStareDonator, type PanouDonator, type StarePatch } from "./pf-actions";
import { adaugaNotitaDonator } from "./reali/actions";

// Panoul lateral al unui donator: detalii și acțiuni, fără să părăsești lista.
export function PanouDonatorView({ orgSlug, id, onClose, onSchimbat }: { orgSlug: string; id: string | null; onClose: () => void; onSchimbat: () => void }) {
  const locale = useLocale();
  const ui = DONATORI_UI_DICT[locale];
  const t = ui.panou;
  const { data: dataRo, dataOra, lei } = formatariPf(locale);
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
    <SidePanel open={id !== null} onClose={onClose} title={r?.nume ?? t.donator} subtitle={r?.email}>
      {seIncarca && !date ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">{t.seIncarca}</p>
      ) : !r ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">{t.nuMaiExista}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-3">
            <Stat eticheta={t.totalDonat} valoare={lei(r.total)} />
            <Stat eticheta={t.donatii} valoare={String(r.nr)} />
            <Stat eticheta={t.primaDonatie} valoare={dataRo(r.prima)} />
            <Stat eticheta={t.ultimaDonatie} valoare={`${dataRo(r.ultima)}${r.ultima_suma !== null ? ` · ${lei(r.ultima_suma)}` : ""}`} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {r.lunar && <Badge tone="green" icon={false}>{t.donatorLunar}</Badge>}
            {r.nr >= 2 && !r.lunar && <Badge tone="blue" icon={false}>{t.recurent}</Badge>}
            {r.dezabonat_email_la && <Badge tone="amber" icon={false}>{t.dezabonatEmail}</Badge>}
            {r.consimtamant_email === true && !r.dezabonat_email_la && <Badge tone="green" icon={false}>{t.consimtamantEmail}</Badge>}
            {r.wb_stage && <Badge tone="purple" icon={false}>{t.winback(ui.wbStage[r.wb_stage] ?? r.wb_stage)}</Badge>}
          </div>

          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{t.contact}</h3>
            <p className="mt-1.5 text-[13px] text-[var(--ci-text)]">{r.telefon ?? <span className="text-[var(--ci-text-muted)]">{t.faraTelefon}</span>}</p>
            <p className="text-[13px] text-[var(--ci-text-muted)]">{[r.localitate, r.judet].filter(Boolean).join(", ") || t.faraLocatie}</p>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{t.stareLucru}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {comutator(r.sunat_la !== null, r.sunat_la ? t.sunatLa(dataRo(r.sunat_la)) : t.sunat, () => seteaza({ sunat: r.sunat_la === null }), <Phone className="size-3.5" aria-hidden />)}
              {comutator(r.multumit_la !== null, r.multumit_la ? t.multumitLa(dataRo(r.multumit_la)) : t.multumit, () => seteaza({ multumit: r.multumit_la === null }), <ThumbsUp className="size-3.5" aria-hidden />)}
              {comutator(r.a_raspuns, t.aRaspuns, () => seteaza({ aRaspuns: !r.a_raspuns }), null)}
              {comutator(r.nu_contactat, t.nuContactat, () => seteaza({ nuContactat: !r.nu_contactat }), null)}
            </div>
            <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">{t.nuContactatNota}</p>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[12px] font-medium text-[var(--ci-text-muted)]">
                  <Bell className="size-3.5" aria-hidden /> {t.reapelPanaLa}
                </span>
                <input type="date" value={reapel} onChange={(e) => setReapel(e.target.value)} className="h-9 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[13px] text-[var(--ci-text)]" />
              </label>
              <Button size="sm" disabled={!reapel} onClick={() => seteaza({ reapelLa: reapel })}>
                {t.programeaza}
              </Button>
              {r.reapel_la && (
                <Button size="sm" variant="ghost" onClick={() => seteaza({ reapelLa: null })}>
                  {t.scoate}
                </Button>
              )}
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-medium text-[var(--ci-text-muted)]">{t.etapaWinback}</span>
              <Select value={r.wb_stage ?? ""} onChange={(e) => seteaza({ wbStage: (e.target.value || null) as StarePatch["wbStage"] })}>
                <option value="">{t.niciuna}</option>
                <option value="reactivare">{ui.wbStage.reactivare}</option>
                <option value="reactivat">{ui.wbStage.reactivat}</option>
                <option value="pierdut">{ui.wbStage.pierdut}</option>
              </Select>
            </label>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{t.notite(date.notite.length)}</h3>
            <div className="mt-2 flex gap-2">
              <Textarea rows={2} value={notita} onChange={(e) => setNotita(e.target.value)} placeholder={t.adaugaNotita} aria-label={t.notitaNoua} className="min-h-0" />
              <Button size="sm" disabled={!notita.trim()} onClick={adaugaNotita}>
                {t.adauga}
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
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{t.donatiiTitlu}</h3>
            <ul className="mt-2 divide-y divide-[var(--ci-border)]">
              {date.donatii.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--ci-text)]">{d.proiect ?? t.fataProiect}</span>
                    <span className="text-[12px] text-[var(--ci-text-muted)]">
                      {dataRo(d.data)}
                      {d.recurenta ? t.lunar : ""}
                    </span>
                  </span>
                  <span className="ci-tabular shrink-0 font-semibold text-[var(--ci-text)]">{lei(d.suma)}</span>
                </li>
              ))}
            </ul>
          </section>

          {date.activitate.length > 0 && (
            <section>
              <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{t.activitate}</h3>
              <ul className="mt-2 space-y-1">
                {date.activitate.map((a, i) => (
                  <li key={i} className="text-[12.5px] text-[var(--ci-text-muted)]">
                    {dataOra(a.la)} · {t.actiuni[a.actiune] ?? a.actiune}
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
            {t.fisaCompleta} <ExternalLink className="size-3.5" aria-hidden />
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

