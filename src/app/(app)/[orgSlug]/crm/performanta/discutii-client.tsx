"use client";

import { Lock, Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI4_DICT } from "@/lib/i18n/dictionaries/performanta-ui-4";
import { STATUS_DEZVOLTARE, TIPURI_INTRARE, type Continut, type TipIntrare } from "@/lib/performanta-evaluari-reguli";
import type { DateDiscutii, IntrareDto } from "@/lib/performanta-evaluari";
import { trimestruDin } from "@/lib/performanta-masurare";

import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { salveazaIntrareAction, stergeIntrareAction } from "./evaluari-actions";
import { StareBadge, dataCompleta, etichetaPerioada, procent } from "./ui-comune";
import type { StareRitm } from "@/lib/performanta-masurare";

type Camp = { cheie: string; eticheta: string; tip: "text" | "textarea" | "data" | "select" | "checkbox"; optiuni?: { v: string; e: string }[]; ajutor?: string; placeholder?: string };
type CampBaza = { cheie: string; tip: Camp["tip"]; optiuni?: { v: string; e: string }[] };

const trimestre = (azi: string, locale: Locale) => [0, -1, -2, -3].map((d) => trimestruDin(azi, d)).map((t) => ({ v: t.cod, e: etichetaPerioada(t, locale) }));

// Structura câmpurilor (cheile se salvează în baza de date și nu se schimbă); etichetele, exemplele și ajutorul vin din dicționar, în limba curentă.
function campuri(tip: TipIntrare, azi: string, locale: Locale): Camp[] {
  const dict = PERFORMANTA_UI4_DICT[locale].discutii;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const baza = ((): CampBaza[] => {
    switch (tip) {
      case "checkin":
        return [
          { cheie: "realizari", tip: "textarea" },
          { cheie: "blocaje", tip: "textarea" },
          { cheie: "prioritate", tip: "textarea" },
        ];
      case "1la1":
        return [
          { cheie: "subiecte", tip: "textarea" },
          { cheie: "decizii", tip: "textarea" },
          { cheie: "actiuni", tip: "textarea" },
          { cheie: "urmatoarea", tip: "data" },
        ];
      case "review_trimestrial":
        return [
          { cheie: "perioada", tip: "select", optiuni: trimestre(azi, locale) },
          { cheie: "rezumat", tip: "textarea" },
          { cheie: "puncteTari", tip: "textarea" },
          { cheie: "deDezvoltat", tip: "textarea" },
          { cheie: "partajat", tip: "checkbox" },
        ];
      case "autoevaluare":
        return [
          { cheie: "perioada", tip: "select", optiuni: trimestre(azi, locale) },
          { cheie: "ceaIesit", tip: "textarea" },
          { cheie: "ceamInvatat", tip: "textarea" },
          { cheie: "nevoieSprijin", tip: "textarea" },
        ];
      case "feedback":
        return [
          { cheie: "tipFeedback", tip: "select", optiuni: dict.tipFeedbackOpt },
          { cheie: "text", tip: "textarea" },
          { cheie: "context", tip: "text" },
        ];
      case "obiectiv_dezvoltare":
        return [
          { cheie: "titlu", tip: "text" },
          { cheie: "descriere", tip: "textarea" },
          { cheie: "termen", tip: "data" },
          { cheie: "status", tip: "select", optiuni: Object.keys(STATUS_DEZVOLTARE).map((v) => ({ v, e: comune.statusDezvoltare[v] ?? v })) },
          { cheie: "comentariu", tip: "textarea" },
        ];
    }
  })();
  return baza.map((c) => ({ ...c, ...dict.campuri[c.cheie] }));
}

export function DiscutiiClient({ orgSlug, d }: { orgSlug: string; d: DateDiscutii }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI4_DICT[locale].discutii;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const tip = (TIPURI_INTRARE.includes(sp.get("tip") as TipIntrare) ? sp.get("tip") : "checkin") as TipIntrare;
  const seteaza = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    router.replace(n.toString() ? `${pathname}?${n.toString()}` : pathname, { scroll: false });
  };
  const [mesaj, setMesaj] = useState<{ t: string; eroare: boolean } | null>(null);
  const [editat, setEditat] = useState<IntrareDto | null>(null);
  const [cheieForm, setCheieForm] = useState(0);
  const tabId = useId();

  if (!d.angajatId) {
    return <p className="rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border)] p-8 text-center text-[13px] text-[var(--ci-text-muted)]">{dict.faraProfil}</p>;
  }

  const ale = d.intrari.filter((i) => i.tip === tip);
  const dupa = (t: string, eroare = false) => {
    setMesaj({ t, eroare });
    if (!eroare) {
      setEditat(null);
      setCheieForm((x) => x + 1);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {d.echipa.length > 0 && (
        <Card>
          <CardHeader title={dict.echipaTa} subtitle={dict.echipaTaSub} />
          <div className="ci-scrollbar overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-[13px]">
              <thead className="text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
                <tr>
                  <th scope="col" className="py-1.5 pr-3">{dict.persoana}</th>
                  <th scope="col" className="px-3 py-1.5">{dict.actualizareSaptamana}</th>
                  <th scope="col" className="px-3 py-1.5">{dict.ultima1la1}</th>
                  <th scope="col" className="px-3 py-1.5">{dict.urmatoarea1la1}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ci-border)]">
                {d.echipa.map((p) => (
                  <tr key={p.id} className={p.id === d.angajatId ? "bg-[var(--ci-surface-2)]/60" : ""}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <button type="button" onClick={() => seteaza({ angajat: p.id })} className="font-semibold text-[var(--ci-text)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                        {p.nume}
                      </button>
                    </th>
                    <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.checkinSaptamana ? dict.trimisa : p.ultimulCheckin ? dict.ultima(dataCompleta(p.ultimulCheckin, locale)) : dict.incaNiciuna}</td>
                    <td className="px-3 py-2 text-[var(--ci-text-muted)]">
                      {p.ultima1la1 ? dataCompleta(p.ultima1la1, locale) : "—"}
                      {p.stare1la1 !== "la_zi" && <span className="ml-2 rounded-full bg-[var(--ci-amber-soft)] px-2 py-px text-[11px] font-medium text-[var(--ci-amber)]">{p.stare1la1 === "niciodata" ? dict.incaNiciunaMic : dict.deProgramat}</span>}
                    </td>
                    <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.urmatoarea1la1 ? dataCompleta(p.urmatoarea1la1, locale) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {d.persoane.length > 1 ? (
          <div>
            <Label htmlFor="dis-pers">{dict.persoanaLabel}</Label>
            <Select id="dis-pers" className="!w-auto min-w-52" value={d.angajatId} onChange={(e) => seteaza({ angajat: e.target.value === d.euAngajatId ? null : e.target.value })}>
              {d.persoane.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nume}
                  {p.id === d.euAngajatId ? dict.eu : ""}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <p className="text-[14px] font-semibold text-[var(--ci-text)]">{d.numeAngajat}</p>
        )}
        <p className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
          <Lock className="size-3.5" aria-hidden /> {dict.vizibilitate}
        </p>
      </div>

      <div role="tablist" aria-label={dict.tipuri} className="ci-scrollbar flex gap-1 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
        {TIPURI_INTRARE.map((t) => (
          <button
            key={t}
            role="tab"
            id={`${tabId}-${t}`}
            aria-selected={tip === t}
            aria-controls={`${tabId}-panou`}
            onClick={() => {
              setEditat(null);
              setMesaj(null);
              seteaza({ tip: t === "checkin" ? null : t });
            }}
            className={`shrink-0 rounded-[calc(var(--ci-radius-card)-4px)] px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${tip === t ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"}`}
          >
            {comune.intrare[t]}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${tabId}-panou`} aria-labelledby={`${tabId}-${tip}`} className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="min-w-0">
          <CardHeader title={editat ? dict.modifica(comune.intrare[tip].toLowerCase()) : comune.intrare[tip]} subtitle={dict.ajutor[tip]} />
          {d.poate[tip] ? (
            <Formular key={`${tip}-${editat?.id ?? "nou"}-${cheieForm}`} orgSlug={orgSlug} tip={tip} angajatId={d.angajatId} azi={d.azi} editat={editat} onGata={dupa} onAnuleaza={() => setEditat(null)} />
          ) : (
            <p className="text-[13px] text-[var(--ci-text-muted)]">{tip === "checkin" || tip === "autoevaluare" ? dict.doarPersoana : tip === "1la1" || tip === "review_trimestrial" ? dict.doarManager : dict.nuPoti}</p>
          )}
          <p role="status" aria-live="polite" className={mesaj ? `mt-3 rounded-[var(--ci-radius-btn)] px-3 py-2 text-[13px] ${mesaj.eroare ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
            {mesaj?.t ?? ""}
          </p>
        </Card>

        <Card className="min-w-0">
          <CardHeader title={dict.istoric} subtitle={dict.intrari(ale.length)} />
          {ale.length === 0 ? (
            <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.nimicInca}</p>
          ) : (
            <ul className="space-y-3">
              {ale.map((i) => (
                <li key={i.id}>
                  <Intrare i={i} azi={d.azi} onEdit={() => setEditat(i)} orgSlug={orgSlug} onSters={() => dupa(dict.intrareStearsa)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Formular({ orgSlug, tip, angajatId, azi, editat, onGata, onAnuleaza }: { orgSlug: string; tip: TipIntrare; angajatId: string; azi: string; editat: IntrareDto | null; onGata: (t: string, eroare?: boolean) => void; onAnuleaza: () => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI4_DICT[locale].discutii;
  const camps = campuri(tip, azi, locale);
  const implicit = (c: Camp): string | boolean => {
    const v = editat?.continut[c.cheie];
    if (c.tip === "checkbox") return v === true;
    if (v !== undefined && v !== null) return String(v);
    if (c.cheie === "perioada") return trimestruDin(azi, 0).cod;
    if (c.cheie === "tipFeedback") return "apreciere";
    if (c.cheie === "status") return "de_inceput";
    return "";
  };
  const [val, setVal] = useState<Record<string, string | boolean>>(() => Object.fromEntries(camps.map((c) => [c.cheie, implicit(c)])));
  const [data, setData] = useState(editat?.tip === "1la1" ? editat.data : azi);
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState<string | null>(null);

  function trimite() {
    setEroare(null);
    const continut: Continut = {};
    for (const c of camps) continut[c.cheie] = c.tip === "data" ? (val[c.cheie] ? String(val[c.cheie]) : null) : val[c.cheie];
    start(async () => {
      const r = await salveazaIntrareAction(orgSlug, { id: editat?.id, tip, angajatId, data: tip === "1la1" ? data : null, continut });
      if (!r.ok) return setEroare(r.eroare);
      onGata(editat ? dict.modificareSalvata : dict.salvat);
    });
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        trimite();
      }}
    >
      {tip === "1la1" && (
        <div>
          <Label htmlFor="f-data">{dict.dataDiscutiei}</Label>
          <Input id="f-data" type="date" max={azi} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      )}
      {camps.map((c) => {
        const id = `f-${c.cheie}`;
        return (
          <div key={c.cheie}>
            {c.tip === "checkbox" ? (
              <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[var(--ci-text)]">
                <input type="checkbox" className="mt-0.5 size-4" checked={val[c.cheie] === true} onChange={(e) => setVal((v) => ({ ...v, [c.cheie]: e.target.checked }))} />
                <span>
                  {c.eticheta}
                  {c.ajutor && <span className="block text-[12px] text-[var(--ci-text-muted)]">{c.ajutor}</span>}
                </span>
              </label>
            ) : (
              <>
                <Label htmlFor={id}>{c.eticheta}</Label>
                {c.tip === "textarea" ? (
                  <Textarea id={id} rows={3} maxLength={2000} placeholder={c.placeholder} value={String(val[c.cheie] ?? "")} onChange={(e) => setVal((v) => ({ ...v, [c.cheie]: e.target.value }))} />
                ) : c.tip === "select" ? (
                  <Select id={id} value={String(val[c.cheie] ?? "")} onChange={(e) => setVal((v) => ({ ...v, [c.cheie]: e.target.value }))}>
                    {c.optiuni?.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.e}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input id={id} type={c.tip === "data" ? "date" : "text"} placeholder={c.placeholder} maxLength={c.tip === "text" ? 300 : undefined} value={String(val[c.cheie] ?? "")} onChange={(e) => setVal((v) => ({ ...v, [c.cheie]: e.target.value }))} />
                )}
                {c.ajutor && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{c.ajutor}</p>}
              </>
            )}
          </div>
        );
      })}
      {eroare && (
        <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          {editat ? dict.salveazaModificarea : dict.salveaza}
        </Button>
        {editat && (
          <Button type="button" onClick={onAnuleaza}>
            {dict.renunta}
          </Button>
        )}
      </div>
    </form>
  );
}

function Intrare({ i, azi, orgSlug, onEdit, onSters }: { i: IntrareDto; azi: string; orgSlug: string; onEdit: () => void; onSters: () => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI4_DICT[locale].discutii;
  const [pending, start] = useTransition();
  const camps = campuri(i.tip, azi, locale).filter((c) => c.tip !== "checkbox" && c.cheie !== "perioada");
  const c = i.continut;
  const snap = (c.obiective as { titlu: string; progres: number | null; stare: string }[] | undefined) ?? [];
  const optEticheta = (cheie: string, v: unknown) => campuri(i.tip, azi, locale).find((x) => x.cheie === cheie)?.optiuni?.find((o) => o.v === v)?.e ?? String(v ?? "");
  return (
    <article className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[var(--ci-text)]">
          {dataCompleta(i.data, locale)}
          {typeof c.perioada === "string" && <span className="ml-2 font-normal text-[var(--ci-text-muted)]">· {dict.perioadaIntrare(c.perioada)}</span>}
        </p>
        <p className="flex items-center gap-2 text-[12px] text-[var(--ci-text-muted)]">
          {i.tip === "review_trimestrial" && <span className={`rounded-full px-2 py-px font-medium ${c.partajat === true ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]"}`}>{c.partajat === true ? dict.partajat : dict.privat}</span>}
          {i.autorNume ?? "—"}
        </p>
      </header>
      <dl className="mt-2 space-y-2 text-[13px]">
        {camps.map((cp) => {
          const v = c[cp.cheie];
          if (v === null || v === undefined || v === "") return null;
          return (
            <div key={cp.cheie}>
              <dt className="text-[12px] font-medium text-[var(--ci-text-muted)]">{cp.eticheta}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-[var(--ci-text)]">{cp.tip === "select" ? optEticheta(cp.cheie, v) : cp.tip === "data" ? dataCompleta(String(v), locale) : String(v)}</dd>
            </div>
          );
        })}
      </dl>
      {snap.length > 0 && (
        <div className="mt-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-2.5">
          <p className="text-[12px] font-medium text-[var(--ci-text-muted)]">{dict.obiectiveLaMoment}</p>
          <ul className="mt-1.5 space-y-1.5">
            {snap.map((o) => (
              <li key={o.titlu} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <span className="text-[var(--ci-text)]">{o.titlu}</span>
                <span className="flex items-center gap-2">
                  <span className="ci-tabular font-semibold text-[var(--ci-text)]">{procent(o.progres, 0, locale)}</span>
                  <StareBadge stare={o.stare as StareRitm} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(i.poateEdita || i.poateSterge) && (
        <div className="mt-2.5 flex gap-1.5">
          {i.poateEdita && (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-4" aria-hidden /> {dict.modificaBtn}
            </Button>
          )}
          {i.poateSterge && (
            <Button
              size="sm"
              variant="ghost"
              loading={pending}
              onClick={() => {
                if (!window.confirm(dict.confirmaSterge)) return;
                start(async () => {
                  const r = await stergeIntrareAction(orgSlug, i.id);
                  if (r.ok) onSters();
                  else window.alert(r.eroare);
                });
              }}
            >
              <Trash2 className="size-4" aria-hidden /> {dict.stergeBtn}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

