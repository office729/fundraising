"use client";

import { ArrowDown, ArrowUp, Bell, BookmarkPlus, Download, Filter, Mail, MailX, Phone, Repeat, Search, ThumbsUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import {
  CAMPURI_DATA,
  ETICHETE_CAMP_DATA,
  filtruLaParametri,
  numarFiltreActive,
  parseFiltruPf,
  SEGMENTE_META,
  type CampData,
  type Sortare,
} from "@/lib/donatori-pf-filtre";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { DropdownItem, DropdownMenu } from "../components/ui/dropdown-menu";
import { Input, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";

import { PanouDonatorView } from "./panou-donator";
import { salveazaRaportPf, seteazaStareDonator } from "./pf-actions";
import type { ListaPf, RandPf } from "./queries-pf";

const dataRo = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const lei = (n: number | null) => (n === null ? "—" : `${Math.round(n).toLocaleString("ro-RO")} lei`);
const nr = (n: number) => n.toLocaleString("ro-RO");

const COLOANE: { key: Sortare; label: string; clasa?: string }[] = [
  { key: "email", label: "Email" },
  { key: "nume", label: "Nume" },
  { key: "localitate", label: "Localitate" },
  { key: "total", label: "Total", clasa: "text-right" },
  { key: "nr", label: "Nr.", clasa: "text-right" },
  { key: "ultima_suma", label: "Ultima", clasa: "text-right" },
  { key: "ultima", label: "Ultima donație" },
  { key: "primul_proiect", label: "Primul proiect" },
  { key: "ultimul_proiect", label: "Ultimul proiect" },
  { key: "an", label: "An", clasa: "text-right" },
];

const GRUPE: { grup: string; titlu: string }[] = [
  { grup: "donatii", titlu: "Donații" },
  { grup: "lucru", titlu: "Contactare" },
  { grup: "recurenta", titlu: "Recurență și risc" },
  { grup: "email", titlu: "Email" },
];

export function ListaPfClient({ orgSlug, lista }: { orgSlug: string; lista: ListaPf }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const f = parseFiltruPf(searchParams);
  const [, start] = useTransition();
  const [q, setQ] = useState(f.q);
  const [extins, setExtins] = useState(numarFiltreActive(f) > 0);
  const [v, setV] = useState({
    an: f.an ? String(f.an) : "",
    proiect: f.proiect,
    primProiect: f.primProiect,
    judet: f.judet,
    localitate: f.localitate,
    sumaMin: f.sumaMin !== null ? String(f.sumaMin) : "",
    sumaMax: f.sumaMax !== null ? String(f.sumaMax) : "",
    ultimaMin: f.ultimaMin !== null ? String(f.ultimaMin) : "",
    campData: f.campData as CampData,
    dataDe: f.dataDe,
    dataPana: f.dataPana,
    primaDe: f.primaDe,
    primaPana: f.primaPana,
  });
  const [sunatLocal, setSunatLocal] = useState<Record<string, boolean>>({});
  const [panou, setPanou] = useState<string | null>(null);
  const [salveaza, setSalveaza] = useState(false);
  const [numeRaport, setNumeRaport] = useState("");
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);

  function push(next: Record<string, string | null>, pastreazaPagina = false) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, val] of Object.entries(next)) {
      if (val === null || val === "") sp.delete(k);
      else sp.set(k, val);
    }
    if (!pastreazaPagina) sp.delete("pagina");
    router.push(`${pathname}${sp.size ? `?${sp.toString()}` : ""}`);
  }

  const aplica = () => push({ q: q.trim() || null, ...Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim() || null])), campData: v.campData === "activitate" ? null : v.campData });
  const reseteaza = () => {
    setQ("");
    setV({ an: "", proiect: "", primProiect: "", judet: "", localitate: "", sumaMin: "", sumaMax: "", ultimaMin: "", campData: "activitate", dataDe: "", dataPana: "", primaDe: "", primaPana: "" });
    router.push(pathname);
  };
  const setCamp = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  const comutaSegment = (cheie: string) => {
    const curent = new Set(f.seg);
    if (curent.has(cheie)) curent.delete(cheie);
    else curent.add(cheie);
    push({ seg: [...curent].join(",") || null });
  };

  const sorteaza = (col: Sortare) => push({ sort: col === "ultima" && f.sort !== "ultima" ? null : col, dir: f.sort === col && f.dir === "desc" ? "asc" : "desc" }, true);

  function comutaSunat(r: RandPf, valoare: boolean) {
    setSunatLocal((p) => ({ ...p, [r.id]: valoare }));
    start(async () => {
      const rez = await seteazaStareDonator(orgSlug, r.id, { sunat: valoare });
      if (!rez.ok) {
        setSunatLocal((p) => ({ ...p, [r.id]: !valoare }));
        setMesaj({ tip: "eroare", text: rez.eroare });
      } else router.refresh();
    });
  }

  const qsExport = (() => {
    const sp = filtruLaParametri(parseFiltruPf(searchParams));
    return sp.toString();
  })();
  const exporta = (canal: "toate" | "email" | "telefon") => {
    const a = document.createElement("a");
    a.href = `/api/${orgSlug}/donatori-export?${qsExport}${qsExport ? "&" : ""}canal=${canal}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  async function salveazaRaport() {
    const rez = await salveazaRaportPf(orgSlug, numeRaport, qsExport);
    setMesaj(rez.ok ? { tip: "ok", text: "Raportul a fost salvat. Îl găsești în „Rapoarte”." } : { tip: "eroare", text: rez.eroare });
    if (rez.ok) {
      setSalveaza(false);
      setNumeRaport("");
    }
  }

  const campInput = "h-9 w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[13px] text-[var(--ci-text)]";
  const de = (lista.pagina - 1) * lista.pageSize + 1;
  const pana = Math.min(lista.total, de + lista.rows.length - 1);
  const nrFiltre = numarFiltreActive(f);

  return (
    <div className="space-y-4">
      {/* Segmente */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">Segmente</h2>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Alege mai multe: se combină cu „ȘI”. Contorul arată câți donatori are fiecare, după filtrele de mai jos.</p>
        </div>
        <div className="mt-3 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Chip activ={f.seg.length === 0} onClick={() => push({ seg: null })} eticheta="Toți" contor={lista.toti} titlu="Fără segment" />
          </div>
          {GRUPE.map((g) => (
            <div key={g.grup} className="flex flex-wrap items-center gap-1.5">
              <span className="w-[118px] shrink-0 text-[11.5px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{g.titlu}</span>
              {SEGMENTE_META.filter((s) => s.grup === g.grup).map((s) => (
                <Chip key={s.key} activ={f.seg.includes(s.key)} onClick={() => comutaSegment(s.key)} eticheta={s.label} contor={lista.contoare[s.key] ?? 0} titlu={s.hint} />
              ))}
            </div>
          ))}
        </div>
        {lista.importNouId && <p className="mt-3 text-[12px] text-[var(--ci-text-muted)]">„Noi” = donatorii apăruți la ultimul import.</p>}
      </Card>

      {/* Căutare și filtre */}
      <form
        className="space-y-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          aplica();
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[240px] flex-1">
            <Input icon={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută: email, nume, proiect, localitate…" aria-label="Căutare" />
          </div>
          <Button type="submit" variant="primary">
            Caută
          </Button>
          <Button type="button" onClick={() => setExtins((x) => !x)} aria-expanded={extins}>
            <Filter className="size-4" aria-hidden /> Filtre{nrFiltre > 0 ? ` (${nrFiltre})` : ""}
          </Button>
          {(nrFiltre > 0 || f.q || f.seg.length > 0) && (
            <Button type="button" variant="ghost" onClick={reseteaza}>
              Resetează
            </Button>
          )}
        </div>
        {extins && (
          <div className="grid gap-3 border-t border-[var(--ci-border)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <Cmp eticheta="An cohortă (prima donație)">
              <Select value={v.an} onChange={(e) => setCamp("an", e.target.value)}>
                <option value="">Toți anii</option>
                {lista.ani.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Cmp>
            <Cmp eticheta="A donat pentru proiectul">
              <Select value={v.proiect} onChange={(e) => setCamp("proiect", e.target.value)}>
                <option value="">Oricare</option>
                {lista.proiecte.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Cmp>
            <Cmp eticheta="Primul proiect">
              <Select value={v.primProiect} onChange={(e) => setCamp("primProiect", e.target.value)}>
                <option value="">Oricare</option>
                {lista.proiecte.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Cmp>
            <Cmp eticheta="Județ">
              <Input value={v.judet} onChange={(e) => setCamp("judet", e.target.value)} placeholder="ex. Cluj" />
            </Cmp>
            <Cmp eticheta="Localitate">
              <Input value={v.localitate} onChange={(e) => setCamp("localitate", e.target.value)} />
            </Cmp>
            <Cmp eticheta="Suma totală minimă (lei)">
              <Input inputMode="decimal" value={v.sumaMin} onChange={(e) => setCamp("sumaMin", e.target.value)} />
            </Cmp>
            <Cmp eticheta="Suma totală maximă (lei)">
              <Input inputMode="decimal" value={v.sumaMax} onChange={(e) => setCamp("sumaMax", e.target.value)} />
            </Cmp>
            <Cmp eticheta="Ultima donație minimă (lei)">
              <Input inputMode="decimal" value={v.ultimaMin} onChange={(e) => setCamp("ultimaMin", e.target.value)} />
            </Cmp>
            <Cmp eticheta="Interval de date pe câmpul">
              <Select value={v.campData} onChange={(e) => setCamp("campData", e.target.value)}>
                {CAMPURI_DATA.map((c) => (
                  <option key={c} value={c}>
                    {ETICHETE_CAMP_DATA[c]}
                  </option>
                ))}
              </Select>
            </Cmp>
            <Cmp eticheta="Din data">
              <input type="date" className={campInput} value={v.dataDe} onChange={(e) => setCamp("dataDe", e.target.value)} />
            </Cmp>
            <Cmp eticheta="Până la data">
              <input type="date" className={campInput} value={v.dataPana} onChange={(e) => setCamp("dataPana", e.target.value)} />
            </Cmp>
            <div />
            <Cmp eticheta="Prima donație: din">
              <input type="date" className={campInput} value={v.primaDe} onChange={(e) => setCamp("primaDe", e.target.value)} />
            </Cmp>
            <Cmp eticheta="Prima donație: până la">
              <input type="date" className={campInput} value={v.primaPana} onChange={(e) => setCamp("primaPana", e.target.value)} />
            </Cmp>
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" variant="primary">
                Aplică filtrele
              </Button>
            </div>
          </div>
        )}
      </form>

      {mesaj && (
        <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-green-soft)] text-[var(--ci-green)]"}`}>
          {mesaj.text}
        </p>
      )}

      {/* Tabel */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ci-border)] px-4 py-3">
          <p className="ci-tabular text-[13px] text-[var(--ci-text)]">
            {lista.total === 0 ? (
              "Niciun donator"
            ) : (
              <>
                <strong>
                  {nr(de)}–{nr(pana)}
                </strong>{" "}
                din <strong>{nr(lista.total)}</strong> · {lei(lista.suma)} · {nr(lista.donatii)} donații
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {salveaza ? (
              <div className="flex items-center gap-1.5">
                <Input value={numeRaport} onChange={(e) => setNumeRaport(e.target.value)} placeholder="Numele raportului" aria-label="Numele raportului" className="h-8 w-48" maxLength={80} />
                <Button size="sm" variant="primary" disabled={numeRaport.trim().length < 2} onClick={salveazaRaport}>
                  Salvează
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSalveaza(false)}>
                  Renunță
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setSalveaza(true)}>
                <BookmarkPlus className="size-4" aria-hidden /> Salvează raport
              </Button>
            )}
            <DropdownMenu
              align="end"
              trigger={
                <Button size="sm">
                  <Download className="size-4" aria-hidden /> Export Excel
                </Button>
              }
            >
              {(inchide) => (
                <>
                  <DropdownItem onClick={() => { inchide(); exporta("toate"); }}>Toți din vederea curentă</DropdownItem>
                  <DropdownItem onClick={() => { inchide(); exporta("email"); }}>Doar cu email contactabil</DropdownItem>
                  <DropdownItem onClick={() => { inchide(); exporta("telefon"); }}>Doar cu telefon de sunat</DropdownItem>
                </>
              )}
            </DropdownMenu>
          </div>
        </div>

        {!lista.areDonatori ? (
          <div className="p-5">
            <EmptyState title="Niciun donator încă" description="Donatorii apar din paginile de donații, din „Donator nou” sau dintr-un import de donații (fila Importuri)." />
          </div>
        ) : lista.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Niciun donator nu se potrivește" description="Încearcă mai puține segmente sau filtre." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                  <th scope="col" className="w-10 px-3 py-2 text-center font-semibold" title="Sunat">
                    <Phone className="mx-auto size-3.5" aria-label="Sunat" />
                  </th>
                  {COLOANE.map((c) => {
                    const activ = f.sort === c.key;
                    return (
                      <th key={c.key} scope="col" aria-sort={activ ? (f.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-2 font-semibold ${c.clasa ?? "text-left"}`}>
                        <button type="button" onClick={() => sorteaza(c.key)} className={`inline-flex items-center gap-1 hover:text-[var(--ci-text)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${activ ? "text-[var(--ci-text)]" : ""}`}>
                          {c.label}
                          {activ && (f.dir === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {lista.rows.map((r) => (
                  <Rand key={r.id} r={r} sunat={sunatLocal[r.id] ?? r.sunat_la !== null} onSunat={(val) => comutaSunat(r, val)} onDeschide={() => setPanou(r.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lista.pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--ci-border)] px-4 py-3">
            <p className="text-[13px] text-[var(--ci-text-muted)]">
              Pagina {lista.pagina} din {nr(lista.pageCount)}
            </p>
            <div className="flex gap-1.5">
              <Button size="sm" disabled={lista.pagina <= 1} onClick={() => push({ pagina: lista.pagina - 1 <= 1 ? null : String(lista.pagina - 1) }, true)}>
                Înapoi
              </Button>
              <Button size="sm" disabled={lista.pagina >= lista.pageCount} onClick={() => push({ pagina: String(lista.pagina + 1) }, true)}>
                Înainte
              </Button>
            </div>
          </div>
        )}
      </Card>

      <PanouDonatorView orgSlug={orgSlug} id={panou} onClose={() => setPanou(null)} onSchimbat={() => router.refresh()} />
    </div>
  );
}

function Chip({ activ, onClick, eticheta, contor, titlu }: { activ: boolean; onClick: () => void; eticheta: string; contor: number; titlu: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titlu}
      aria-pressed={activ}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
        activ ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
      }`}
    >
      {eticheta}
      <span className={`ci-tabular rounded-full px-1.5 text-[11px] ${activ ? "bg-white/25" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}>{contor.toLocaleString("ro-RO")}</span>
    </button>
  );
}

function Cmp({ eticheta, children }: { eticheta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[var(--ci-text-muted)]">{eticheta}</span>
      {children}
    </label>
  );
}

function Rand({ r, sunat, onSunat, onDeschide }: { r: RandPf; sunat: boolean; onSunat: (v: boolean) => void; onDeschide: () => void }) {
  const tip = r.lunar ? { c: "var(--ci-green)", t: "Donator lunar" } : r.nr >= 2 ? { c: "var(--ci-blue)", t: "Recurent" } : { c: "var(--ci-text-faint)", t: "O singură donație" };
  const abonat = r.consimtamant_email !== false && !r.dezabonat_email_la;
  return (
    <tr onClick={onDeschide} className="cursor-pointer border-b border-[var(--ci-border)] transition-colors last:border-0 hover:bg-[var(--ci-surface-2)]">
      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={sunat} onChange={(e) => onSunat(e.target.checked)} aria-label={`Sunat: ${r.nume}`} className="size-4 cursor-pointer accent-[var(--ci-primary)]" />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ background: tip.c }} title={tip.t} aria-label={tip.t} />
          <span className="max-w-[230px] truncate font-medium text-[var(--ci-text)]">{r.email}</span>
          <span className="flex shrink-0 items-center gap-1 text-[var(--ci-text-muted)]">
            {r.lunar && <Repeat className="size-3.5 text-[var(--ci-green)]" aria-label="Donator lunar" />}
            {r.telefon && <Phone className="size-3.5" aria-label="Are telefon" />}
            {r.multumit_la && <ThumbsUp className="size-3.5 text-[var(--ci-blue)]" aria-label="Mulțumit" />}
            {abonat ? <Mail className="size-3.5" aria-label="Abonat newsletter" /> : <MailX className="size-3.5 text-[var(--ci-amber)]" aria-label="Dezabonat sau fără consimțământ" />}
            {r.reapel_la && <Bell className="size-3.5 text-[var(--ci-amber)]" aria-label={`Reapel până la ${dataRo(r.reapel_la)}`} />}
          </span>
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="text-[var(--ci-text)]">{r.nume}</span>
        {r.nr_notite > 0 && <span className="ml-1.5 text-[11.5px] text-[var(--ci-text-muted)]">· {r.nr_notite} notițe</span>}
      </td>
      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.localitate ?? "—"}</td>
      <td className="ci-tabular px-3 py-2 text-right font-semibold whitespace-nowrap text-[var(--ci-text)]">{lei(r.total)}</td>
      <td className="ci-tabular px-3 py-2 text-right">{r.nr}</td>
      <td className="ci-tabular px-3 py-2 text-right whitespace-nowrap">{lei(r.ultima_suma)}</td>
      <td className="ci-tabular px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">{dataRo(r.ultima)}</td>
      <td className="max-w-[170px] truncate px-3 py-2 text-[var(--ci-text-muted)]">{r.primul_proiect ?? "—"}</td>
      <td className="max-w-[170px] truncate px-3 py-2 text-[var(--ci-text-muted)]">{r.ultimul_proiect ?? "—"}</td>
      <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text-muted)]">{r.an ?? "—"}</td>
    </tr>
  );
}

