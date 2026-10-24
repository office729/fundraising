"use client";

import { AlertTriangle, CheckCircle2, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { CAMPURI_IMPORT, ETICHETE_IMPORT, OBLIGATORII_IMPORT, type CampImport, type Mapare } from "@/lib/donatori-import";
import type { Previzualizare } from "@/lib/donatori-import-server";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Select } from "../../components/ui/input";

import { stergeImportAction, type ImportListat } from "./actions";

const dataRo = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const nr = (n: number) => n.toLocaleString("ro-RO");

type Raspuns = { ok?: boolean; error?: string; previzualizare?: Previzualizare; rezultat?: { importate: number; duplicate: number; donatoriNoi: number } };

export function ImporturiClient({ orgSlug, importuri, poateImporta }: { orgSlug: string; importuri: ImportListat[]; poateImporta: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fisier, setFisier] = useState<File | null>(null);
  const [nume, setNume] = useState("");
  const [prev, setPrev] = useState<Previzualizare | null>(null);
  const [mapare, setMapare] = useState<Mapare>({});
  const [corecteaza, setCorecteaza] = useState(true); // corectarea adreselor de e-mail evidente (gmial.com → gmail.com)
  const [lucreaza, setLucreaza] = useState<"" | "analiza" | "import">("");
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);
  const [deSters, setDeSters] = useState<ImportListat | null>(null); // importul pentru care se cere confirmarea ștergerii
  const [stergeActiv, setSterge] = useState(false);

  async function trimite(mod: "previzualizare" | "importa", mapareFolosita?: Mapare, corectarePrimita?: boolean) {
    if (!fisier) return null;
    const form = new FormData();
    form.set("fisier", fisier);
    form.set("mod", mod);
    form.set("corecteaza", (corectarePrimita ?? corecteaza) ? "1" : "0");
    form.set("nume", nume.trim());
    if (mapareFolosita) form.set("mapare", JSON.stringify(mapareFolosita));
    const r = await fetch(`/api/${orgSlug}/donatori-import`, { method: "POST", body: form });
    return (await r.json().catch(() => ({ error: "Răspuns neașteptat de la server." }))) as Raspuns;
  }

  async function analizeaza(mapareFolosita?: Mapare, corectarePrimita?: boolean) {
    setMesaj(null);
    setLucreaza("analiza");
    try {
      const r = await trimite("previzualizare", mapareFolosita, corectarePrimita);
      if (!r || r.error || !r.previzualizare) {
        setMesaj({ tip: "eroare", text: r?.error ?? "Nu am putut analiza fișierul." });
      } else {
        setPrev(r.previzualizare);
        setMapare(r.previzualizare.mapare);
      }
    } finally {
      setLucreaza("");
    }
  }

  async function importa() {
    if (!prev) return;
    setMesaj(null);
    setLucreaza("import");
    try {
      const r = await trimite("importa", mapare);
      if (!r || r.error || !r.rezultat) setMesaj({ tip: "eroare", text: r?.error ?? "Importul a eșuat." });
      else {
        setMesaj({ tip: "ok", text: `Import terminat: ${nr(r.rezultat.importate)} donații, ${nr(r.rezultat.donatoriNoi)} donatori noi, ${nr(r.rezultat.duplicate)} duplicate sărite.` });
        setPrev(null);
        setFisier(null);
        setNume("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    } finally {
      setLucreaza("");
    }
  }

  async function sterge(i: ImportListat) {
    setSterge(true);
    try {
      const r = await stergeImportAction(orgSlug, i.id);
      setMesaj(r.ok ? { tip: "ok", text: `Import șters: ${nr(r.donatiiSterse)} ${r.donatiiSterse === 1 ? "donație ștearsă" : "donații șterse"}, ${nr(r.donatoriStersi)} ${r.donatoriStersi === 1 ? "donator scos" : "donatori scoși"}.` } : { tip: "eroare", text: r.eroare });
      setDeSters(null);
      if (r.ok) router.refresh();
    } finally {
      setSterge(false);
    }
  }

  const lipsa = prev ? OBLIGATORII_IMPORT.filter((c) => mapare[c] === undefined) : [];
  const gataDeImport = prev && lipsa.length === 0 && prev.deImportat > 0;

  return (
    <div className="space-y-5">
      {mesaj && (
        <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
          {mesaj.text}
        </p>
      )}

      {poateImporta ? (
        <Card>
          <CardHeader title="Import nou" subtitle="CSV (cu „;” sau „,”) sau Excel. Primul rând trebuie să fie antetul. Coloanele se recunosc automat după nume." />
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-[var(--ci-text)]">Fișier</span>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.xlsm"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFisier(f);
                  setPrev(null);
                  setMesaj(null);
                  if (f && !nume) setNume(f.name.replace(/\.[^.]+$/, ""));
                }}
                className="block w-full cursor-pointer text-[13px] text-[var(--ci-text)] file:mr-3 file:cursor-pointer file:rounded-[var(--ci-radius-btn)] file:border file:border-[var(--ci-border)] file:bg-[var(--ci-surface)] file:px-3 file:py-2 file:text-[13px] file:font-medium hover:file:bg-[var(--ci-surface-2)]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-[var(--ci-text)]">Numele sursei</span>
              <Input value={nume} onChange={(e) => setNume(e.target.value)} placeholder="ex. Donații Stripe 2025" maxLength={200} />
            </label>
            <Button variant="primary" disabled={!fisier} loading={lucreaza === "analiza"} onClick={() => analizeaza()}>
              <Upload className="size-4" aria-hidden /> Analizează
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-[13px] text-[var(--ci-text-muted)]">Doar un administrator poate importa donații. Poți vedea istoricul importurilor mai jos.</p>
        </Card>
      )}

      {prev && (
        <Card>
          <CardHeader title="Ce se va întâmpla" subtitle="Nimic nu s-a salvat încă. Verifică și confirmă." />
          <dl aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra eticheta="Rânduri în fișier" valoare={nr(prev.randuri)} />
            <Cifra eticheta="Donații de importat" valoare={nr(prev.deImportat)} tona="green" />
            <Cifra eticheta="Donații deja existente (sărite)" valoare={nr(prev.duplicate)} />
            <Cifra eticheta="Rânduri respinse" valoare={nr(prev.invalide)} tona={prev.invalide > 0 ? "amber" : undefined} />
            <Cifra eticheta="Donatori noi" valoare={nr(prev.donatoriNoi)} />
            <Cifra eticheta="Donatori existenți" valoare={nr(prev.donatoriExistenti)} />
            <Cifra eticheta="Suma importată" valoare={`${nr(prev.suma)} lei`} />
            <Cifra eticheta="Interval" valoare={prev.de ? `${dataRo(prev.de)} – ${dataRo(prev.pana)}` : "—"} />
          </dl>
          {prev.curs && <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">Sumele în EUR se convertesc în lei la cursul zilei ({prev.curs.toFixed(4)}).</p>}

          <h3 className="mt-5 text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Curățarea datelor</h3>
          <div className="mt-2 space-y-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3 text-[13px] text-[var(--ci-text)]">
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-5"
                checked={corecteaza}
                disabled={lucreaza !== ""}
                onChange={(e) => {
                  setCorecteaza(e.target.checked);
                  void analizeaza(mapare, e.target.checked);
                }}
              />
              <span>
                <strong>Corectează adresele de e-mail evidente</strong> (gmial.com → gmail.com, spații, semne în plus). Fără corectare, o adresă greșită ajunge ca donator separat și nu primește niciodată mesaje.
              </span>
            </label>
            {prev.curatare.emailuriCorectate > 0 ? (
              <div>
                <p className="font-medium">
                  {prev.curatare.corecteaza ? `${nr(prev.curatare.emailuriCorectate)} adrese corectate` : `${nr(prev.curatare.emailuriCorectate)} adrese par greșite (nu se corectează, ai oprit opțiunea)`}
                </p>
                <ul className="mt-1.5 space-y-1 text-[12.5px] text-[var(--ci-text-muted)]">
                  {prev.curatare.exempleCorectate.map((x) => (
                    <li key={x.de} className="break-all">
                      rândul {x.rand}: <span className="line-through">{x.de}</span> → <strong className="text-[var(--ci-text)]">{x.la}</strong> <span>({x.motiv})</span>
                    </li>
                  ))}
                </ul>
                {prev.curatare.emailuriCorectate > prev.curatare.exempleCorectate.length && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">… și încă {nr(prev.curatare.emailuriCorectate - prev.curatare.exempleCorectate.length)}.</p>}
              </div>
            ) : (
              <p className="text-[var(--ci-text-muted)]">Nicio adresă de e-mail nu a avut nevoie de corectare.</p>
            )}
            {prev.curatare.generice > 0 && (
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                {nr(prev.curatare.generice)} rânduri au adrese de birou (info@, office@, contact@…): sunt păstrate, dar nu sunt ale unei persoane, deci mesajele personale nu ajung la un donator anume.
              </p>
            )}
            {prev.curatare.totalPosibileDubluri > 0 && (
              <div>
                <p className="font-medium text-[#7a3e00]">
                  {nr(prev.curatare.totalPosibileDubluri)} {prev.curatare.totalPosibileDubluri === 1 ? "posibil donator dublu" : "posibili donatori dubli"}
                </p>
                <p className="text-[12.5px] text-[var(--ci-text-muted)]">Aceeași persoană pare să apară cu adrese diferite. Importul nu îi unește singur; după import îi poți verifica și uni din pagina{" "}
                  <Link href={`/${orgSlug}/crm/donatori/dubluri`} className="font-semibold text-[var(--ci-primary)] underline">
                    Donatori dubli
                  </Link>
                  .
                </p>
                <ul className="mt-2 space-y-2">
                  {prev.curatare.posibileDubluri.map((g, i) => (
                    <li key={i} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-2.5 py-2 text-[12.5px]">
                      <span className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge tone={g.incredere === "mare" ? "amber" : "neutral"} icon={false}>
                          {g.incredere === "mare" ? "probabil aceeași persoană" : "posibil aceeași persoană"}
                        </Badge>
                        <span className="text-[var(--ci-text-muted)]">după {g.motive.map((m) => (m === "email" ? "e-mail" : m === "telefon" ? "telefon" : "nume și localitate")).join(", ")}</span>
                      </span>
                      {g.persoane.map((x, j) => (
                        <span key={j} className="block break-all text-[var(--ci-text)]">
                          {x.sursa === "fisier" ? "din fișier" : "existent"}: {x.nume} · {x.email}
                          {x.telefon ? ` · ${x.telefon}` : ""}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
                {prev.curatare.totalPosibileDubluri > prev.curatare.posibileDubluri.length && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">… și încă {nr(prev.curatare.totalPosibileDubluri - prev.curatare.posibileDubluri.length)}.</p>}
              </div>
            )}
          </div>

          <h3 className="mt-5 text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Coloanele fișierului</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPURI_IMPORT.map((c) => (
              <label key={c} className="block">
                <span className="mb-1 block text-[12px] font-medium text-[var(--ci-text-muted)]">
                  {ETICHETE_IMPORT[c]}
                  {OBLIGATORII_IMPORT.includes(c) && <span className="text-[#9b1c1c]"> *</span>}
                </span>
                <Select
                  value={mapare[c] === undefined ? "" : String(mapare[c])}
                  onChange={(e) => {
                    const urm = { ...mapare };
                    if (e.target.value === "") delete urm[c as CampImport];
                    else urm[c as CampImport] = Number(e.target.value);
                    setMapare(urm);
                  }}
                >
                  <option value="">— nu există —</option>
                  {prev.antet.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Coloana ${i + 1}`}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
          </div>
          <div className="mt-3">
            <Button size="sm" loading={lucreaza === "analiza"} onClick={() => analizeaza(mapare)}>
              Reanalizează cu aceste coloane
            </Button>
          </div>
          {lipsa.length > 0 && (
            <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
              <AlertTriangle className="size-4 text-[var(--ci-amber)]" aria-hidden /> Alege coloanele obligatorii: {lipsa.map((c) => ETICHETE_IMPORT[c]).join(", ")}.
            </p>
          )}

          {prev.esantion.length > 0 && (
            <>
              <h3 className="mt-5 text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Primele rânduri</h3>
              <div className="mt-2 overflow-x-auto rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)]">
                <table className="w-full min-w-[600px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[var(--ci-text-muted)]">
                      {prev.antet.map((h, i) => (
                        <th key={i} className="px-2.5 py-1.5 font-semibold">
                          {h || `Coloana ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prev.esantion.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--ci-border)] last:border-0">
                        {r.map((c, j) => (
                          <td key={j} className="max-w-[180px] truncate px-2.5 py-1.5 text-[var(--ci-text)]">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {prev.proiecte.length > 0 && (
            <>
              <h3 className="mt-5 text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Proiecte din fișier ({prev.proiecte.length})</h3>
              <ul className="mt-2 divide-y divide-[var(--ci-border)] rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)]">
                {prev.proiecte.map((p) => (
                  <li key={p.nume} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[13px]">
                    <span className="min-w-0 truncate font-medium text-[var(--ci-text)]">{p.nume}</span>
                    <span className="flex items-center gap-2 text-[var(--ci-text-muted)]">
                      {nr(p.nr)} donații
                      {p.campanie ? <Badge tone="green" icon={false}>Legat de campania din platformă</Badge> : <Badge tone="neutral" icon={false}>Doar nume de proiect</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {prev.exemple.length > 0 && (
            <>
              <h3 className="mt-5 text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Rânduri respinse (exemple)</h3>
              <ul className="mt-2 space-y-1 text-[12.5px] text-[var(--ci-text-muted)]">
                {prev.exemple.map((e) => (
                  <li key={e.rand}>
                    Rândul {e.rand}: {e.motiv}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--ci-border)] pt-4">
            <Button variant="primary" disabled={!gataDeImport} loading={lucreaza === "import"} onClick={importa}>
              <FileSpreadsheet className="size-4" aria-hidden /> Importă {prev.deImportat > 0 ? `${nr(prev.deImportat)} donații` : ""}
            </Button>
            {prev.deImportat === 0 && lipsa.length === 0 && <span className="text-[13px] text-[var(--ci-text-muted)]">Nu există nimic nou de importat.</span>}
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="border-b border-[var(--ci-border)] px-5 py-4">
          <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">Istoricul importurilor</h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Fiecare import e o sursă: poți vedea ce a adus și îl poți șterge dacă a fost greșit.</p>
        </div>
        {deSters && (
          <div role="group" aria-label="Confirmă ștergerea importului" className="mx-5 mt-4 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
            <p className="font-semibold">Nu se poate anula. Ștergi importul „{deSters.nume}”?</p>
            <p className="mt-1 text-[12.5px]">
              Se șterg {nr(deSters.nrImportate)} donații importate și donatorii creați doar de acest import (fără alte donații, notițe sau stare de lucru).
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="danger" className="min-h-11" loading={stergeActiv} onClick={() => sterge(deSters)}>
                Șterge importul
              </Button>
              <Button className="min-h-11" disabled={stergeActiv} onClick={() => setDeSters(null)}>
                Renunță
              </Button>
            </div>
          </div>
        )}
        {importuri.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[var(--ci-text-muted)]">Niciun import încă.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
                  <th className="px-5 py-2 font-semibold">Sursă</th>
                  <th className="px-3 py-2 font-semibold">Interval</th>
                  <th className="px-3 py-2 text-right font-semibold">Donații</th>
                  <th className="px-3 py-2 text-right font-semibold">Donatori noi</th>
                  <th className="px-3 py-2 text-right font-semibold">Deja existente</th>
                  <th className="px-3 py-2 font-semibold">Importat</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {importuri.map((i) => (
                  <tr key={i.id} className="border-b border-[var(--ci-border)] last:border-0">
                    <td className="px-5 py-2.5 font-medium text-[var(--ci-text)]">{i.nume}</td>
                    <td className="ci-tabular px-3 py-2.5 whitespace-nowrap text-[var(--ci-text-muted)]">{i.de ? `${dataRo(i.de)} – ${dataRo(i.pana)}` : "—"}</td>
                    <td className="ci-tabular px-3 py-2.5 text-right">{nr(i.nrImportate)}</td>
                    <td className="ci-tabular px-3 py-2.5 text-right">{nr(i.nrDonatoriNoi)}</td>
                    <td className="ci-tabular px-3 py-2.5 text-right">{nr(i.nrDuplicate)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[var(--ci-text-muted)]">
                      {dataRo(i.creatLa)}
                      {i.autor ? ` · ${i.autor}` : ""}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {poateImporta && (
                        <Button size="sm" variant="ghost" aria-label={`Șterge importul ${i.nume}`} onClick={() => setDeSters(i)}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Cifra({ eticheta, valoare, tona }: { eticheta: string; valoare: string; tona?: "green" | "amber" }) {
  return (
    <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2.5">
      <dt className="text-[11.5px] text-[var(--ci-text-muted)]">{eticheta}</dt>
      <dd className={`ci-tabular mt-0.5 flex items-center gap-1 text-[15px] font-bold ${tona === "green" ? "text-[#17602f]" : tona === "amber" ? "text-[#7a3e00]" : "text-[var(--ci-text)]"}`}>
        {tona === "green" && <CheckCircle2 className="size-4" aria-hidden />}
        {valoare}
      </dd>
    </div>
  );
}
