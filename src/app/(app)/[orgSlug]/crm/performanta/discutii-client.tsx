"use client";

import { Lock, Pencil, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { ETICHETE_INTRARE, STATUS_DEZVOLTARE, TIPURI_INTRARE, type Continut, type TipIntrare } from "@/lib/performanta-evaluari-reguli";
import type { DateDiscutii, IntrareDto } from "@/lib/performanta-evaluari";
import { trimestruDin } from "@/lib/performanta-masurare";

import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { salveazaIntrareAction, stergeIntrareAction } from "./evaluari-actions";
import { StareBadge, dataCompleta, procent } from "./ui-comune";
import type { StareRitm } from "@/lib/performanta-masurare";

type Camp = { cheie: string; eticheta: string; tip: "text" | "textarea" | "data" | "select" | "checkbox"; optiuni?: { v: string; e: string }[]; ajutor?: string; placeholder?: string };

const trimestre = (azi: string) => [0, -1, -2, -3].map((d) => trimestruDin(azi, d)).map((t) => ({ v: t.cod, e: t.eticheta }));

function campuri(tip: TipIntrare, azi: string): Camp[] {
  switch (tip) {
    case "checkin":
      return [
        { cheie: "realizari", eticheta: "Ce ți-a ieșit săptămâna asta?", tip: "textarea", placeholder: "Ce a mers bine, ce ai terminat." },
        { cheie: "blocaje", eticheta: "Unde ai nevoie de ajutor?", tip: "textarea", placeholder: "Ce te încurcă sau ce ai vrea să știi mai repede." },
        { cheie: "prioritate", eticheta: "Ce urmează?", tip: "textarea", placeholder: "Lucrurile cele mai importante pentru săptămâna viitoare." },
      ];
    case "1la1":
      return [
        { cheie: "subiecte", eticheta: "Subiecte discutate", tip: "textarea" },
        { cheie: "decizii", eticheta: "Decizii luate", tip: "textarea" },
        { cheie: "actiuni", eticheta: "Acțiuni de urmat (cine, ce, până când)", tip: "textarea" },
        { cheie: "urmatoarea", eticheta: "Următoarea discuție", tip: "data" },
      ];
    case "review_trimestrial":
      return [
        { cheie: "perioada", eticheta: "Perioada", tip: "select", optiuni: trimestre(azi) },
        { cheie: "rezumat", eticheta: "Rezumat", tip: "textarea", placeholder: "Cum a fost trimestrul, pe scurt și cu fapte." },
        { cheie: "puncteTari", eticheta: "Puncte tari", tip: "textarea" },
        { cheie: "deDezvoltat", eticheta: "Ce merită dezvoltat", tip: "textarea", placeholder: "Formulat ca direcție de creștere, nu ca reproș." },
        { cheie: "partajat", eticheta: "Partajează cu persoana", tip: "checkbox", ajutor: "Până îl partajezi, reviewul îl vezi doar tu și administratorii. Progresul obiectivelor se salvează odată cu el, ca să rămână cifrele discutate." },
      ];
    case "autoevaluare":
      return [
        { cheie: "perioada", eticheta: "Perioada", tip: "select", optiuni: trimestre(azi) },
        { cheie: "ceaIesit", eticheta: "Ce mi-a ieșit bine", tip: "textarea" },
        { cheie: "ceamInvatat", eticheta: "Ce am învățat", tip: "textarea" },
        { cheie: "nevoieSprijin", eticheta: "Unde am nevoie de sprijin", tip: "textarea" },
      ];
    case "feedback":
      return [
        { cheie: "tipFeedback", eticheta: "Fel de feedback", tip: "select", optiuni: [{ v: "apreciere", e: "Apreciere" }, { v: "sugestie", e: "Sugestie de îmbunătățire" }] },
        { cheie: "text", eticheta: "Feedback", tip: "textarea", ajutor: "Concret, despre ce s-a întâmplat și ce efect a avut, nu despre persoană.", placeholder: "ex. La raportul de joi, structura pe proiecte a ușurat mult verificarea." },
        { cheie: "context", eticheta: "La ce se referă (opțional)", tip: "text" },
      ];
    case "obiectiv_dezvoltare":
      return [
        { cheie: "titlu", eticheta: "Ce vrei să dezvolți", tip: "text", placeholder: "ex. Scrierea de cereri de finanțare" },
        { cheie: "descriere", eticheta: "Cum, concret", tip: "textarea" },
        { cheie: "termen", eticheta: "Până când", tip: "data" },
        { cheie: "status", eticheta: "Stare", tip: "select", optiuni: Object.entries(STATUS_DEZVOLTARE).map(([v, e]) => ({ v, e })) },
        { cheie: "comentariu", eticheta: "Cum merge", tip: "textarea" },
      ];
  }
}

const AJUTOR: Record<TipIntrare, string> = {
  checkin: "Cinci minute, o dată pe săptămână. Îl vede managerul tău, ca să te poată ajuta la timp.",
  "1la1": "Notele unei discuții între manager și persoană. Le vede și persoana.",
  review_trimestrial: "O privire de ansamblu asupra trimestrului. Rămâne privat până îl partajează autorul.",
  autoevaluare: "Tu te uiți la propria perioadă, înainte sau în locul unui review. O văd managerul tău și administratorii.",
  feedback: "Apreciere sau sugestie dată unui coleg. O văd destinatarul, tu, managerul lui și administratorii.",
  obiectiv_dezvoltare: "Ce vrei să înveți sau să îmbunătățești, separat de obiectivele de muncă.",
};

export function DiscutiiClient({ orgSlug, d }: { orgSlug: string; d: DateDiscutii }) {
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
    return <p className="rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border)] p-8 text-center text-[13px] text-[var(--ci-text-muted)]">Nu ai un profil de angajat, iar nimeni nu e în echipa ta. Profilurile se creează în „Organizație & Echipă”.</p>;
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
          <CardHeader title="Echipa ta" subtitle="Ritmul actualizărilor și al discuțiilor. O reamintire, nu un verdict: „de programat” înseamnă că a trecut mult de la ultima discuție." />
          <div className="ci-scrollbar overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-[13px]">
              <thead className="text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
                <tr>
                  <th scope="col" className="py-1.5 pr-3">Persoană</th>
                  <th scope="col" className="px-3 py-1.5">Actualizare săptămâna asta</th>
                  <th scope="col" className="px-3 py-1.5">Ultima 1:1</th>
                  <th scope="col" className="px-3 py-1.5">Următoarea 1:1</th>
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
                    <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.checkinSaptamana ? "Trimisă" : p.ultimulCheckin ? `Ultima: ${dataCompleta(p.ultimulCheckin)}` : "Încă niciuna"}</td>
                    <td className="px-3 py-2 text-[var(--ci-text-muted)]">
                      {p.ultima1la1 ? dataCompleta(p.ultima1la1) : "—"}
                      {p.stare1la1 !== "la_zi" && <span className="ml-2 rounded-full bg-[var(--ci-amber-soft)] px-2 py-px text-[11px] font-medium text-[var(--ci-amber)]">{p.stare1la1 === "niciodata" ? "încă niciuna" : "de programat"}</span>}
                    </td>
                    <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.urmatoarea1la1 ? dataCompleta(p.urmatoarea1la1) : "—"}</td>
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
            <Label htmlFor="dis-pers">Persoana</Label>
            <Select id="dis-pers" className="!w-auto min-w-52" value={d.angajatId} onChange={(e) => seteaza({ angajat: e.target.value === d.euAngajatId ? null : e.target.value })}>
              {d.persoane.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nume}
                  {p.id === d.euAngajatId ? " (eu)" : ""}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <p className="text-[14px] font-semibold text-[var(--ci-text)]">{d.numeAngajat}</p>
        )}
        <p className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
          <Lock className="size-3.5" aria-hidden /> Vizibilitatea e arătată la fiecare tip. Colegii fără legătură cu persoana nu văd nimic.
        </p>
      </div>

      <div role="tablist" aria-label="Tipuri de discuții și evaluări" className="ci-scrollbar flex gap-1 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
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
            {ETICHETE_INTRARE[t]}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${tabId}-panou`} aria-labelledby={`${tabId}-${tip}`} className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="min-w-0">
          <CardHeader title={editat ? `Modifică: ${ETICHETE_INTRARE[tip].toLowerCase()}` : ETICHETE_INTRARE[tip]} subtitle={AJUTOR[tip]} />
          {d.poate[tip] ? (
            <Formular key={`${tip}-${editat?.id ?? "nou"}-${cheieForm}`} orgSlug={orgSlug} tip={tip} angajatId={d.angajatId} azi={d.azi} editat={editat} onGata={dupa} onAnuleaza={() => setEditat(null)} />
          ) : (
            <p className="text-[13px] text-[var(--ci-text-muted)]">{tip === "checkin" || tip === "autoevaluare" ? "Doar persoana însăși completează acest tip." : tip === "1la1" || tip === "review_trimestrial" ? "Acest tip îl scrie managerul persoanei sau un administrator." : "Nu poți adăuga acest tip aici."}</p>
          )}
          <p role="status" aria-live="polite" className={mesaj ? `mt-3 rounded-[var(--ci-radius-btn)] px-3 py-2 text-[13px] ${mesaj.eroare ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
            {mesaj?.t ?? ""}
          </p>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Istoric" subtitle={`${ale.length} ${ale.length === 1 ? "intrare" : "intrări"}`} />
          {ale.length === 0 ? (
            <p className="text-[13px] text-[var(--ci-text-muted)]">Nimic încă.</p>
          ) : (
            <ul className="space-y-3">
              {ale.map((i) => (
                <li key={i.id}>
                  <Intrare i={i} azi={d.azi} onEdit={() => setEditat(i)} orgSlug={orgSlug} onSters={() => dupa("Intrarea a fost ștearsă.")} />
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
  const camps = campuri(tip, azi);
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
      onGata(editat ? "Modificarea a fost salvată." : "Salvat.");
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
          <Label htmlFor="f-data">Data discuției</Label>
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
          {editat ? "Salvează modificarea" : "Salvează"}
        </Button>
        {editat && (
          <Button type="button" onClick={onAnuleaza}>
            Renunță
          </Button>
        )}
      </div>
    </form>
  );
}

function Intrare({ i, azi, orgSlug, onEdit, onSters }: { i: IntrareDto; azi: string; orgSlug: string; onEdit: () => void; onSters: () => void }) {
  const [pending, start] = useTransition();
  const camps = campuri(i.tip, azi).filter((c) => c.tip !== "checkbox" && c.cheie !== "perioada");
  const c = i.continut;
  const snap = (c.obiective as { titlu: string; progres: number | null; stare: string }[] | undefined) ?? [];
  const optEticheta = (cheie: string, v: unknown) => campuri(i.tip, azi).find((x) => x.cheie === cheie)?.optiuni?.find((o) => o.v === v)?.e ?? String(v ?? "");
  return (
    <article className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[var(--ci-text)]">
          {dataCompleta(i.data)}
          {typeof c.perioada === "string" && <span className="ml-2 font-normal text-[var(--ci-text-muted)]">· {c.perioada.replace("-T", " T")}</span>}
        </p>
        <p className="flex items-center gap-2 text-[12px] text-[var(--ci-text-muted)]">
          {i.tip === "review_trimestrial" && <span className={`rounded-full px-2 py-px font-medium ${c.partajat === true ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]"}`}>{c.partajat === true ? "Partajat" : "Privat"}</span>}
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
              <dd className="mt-0.5 whitespace-pre-wrap text-[var(--ci-text)]">{cp.tip === "select" ? optEticheta(cp.cheie, v) : cp.tip === "data" ? dataCompleta(String(v)) : String(v)}</dd>
            </div>
          );
        })}
      </dl>
      {snap.length > 0 && (
        <div className="mt-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-2.5">
          <p className="text-[12px] font-medium text-[var(--ci-text-muted)]">Obiectivele la momentul reviewului</p>
          <ul className="mt-1.5 space-y-1.5">
            {snap.map((o) => (
              <li key={o.titlu} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <span className="text-[var(--ci-text)]">{o.titlu}</span>
                <span className="flex items-center gap-2">
                  <span className="ci-tabular font-semibold text-[var(--ci-text)]">{procent(o.progres)}</span>
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
              <Pencil className="size-4" aria-hidden /> Modifică
            </Button>
          )}
          {i.poateSterge && (
            <Button
              size="sm"
              variant="ghost"
              loading={pending}
              onClick={() => {
                if (!window.confirm("Ștergi această intrare? Nu se poate anula.")) return;
                start(async () => {
                  const r = await stergeIntrareAction(orgSlug, i.id);
                  if (r.ok) onSters();
                  else window.alert(r.eroare);
                });
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Șterge
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

