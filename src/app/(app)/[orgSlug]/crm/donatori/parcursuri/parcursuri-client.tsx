"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { corpHtml, FEREASTRA_CONVERSIE_ZILE, LIMITE_PARCURS, procentConversie, subiectRandat, VARIABILE_PARCURS, type PasParcurs } from "@/lib/parcursuri-donatori";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input, Label, Textarea } from "../../components/ui/input";

import { salveazaParcurs, trimiteTestParcurs, type DateParcursuri, type ParcursDate } from "./actions";

const nr = (n: number) => n.toLocaleString("ro-RO");
const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });

// Cât de târziu e „zile”: la primul pas se numără de la eveniment, la următorii de la trimiterea pasului anterior.
function etichetaZile(cheie: string, index: number, zile: number): string {
  if ((cheie === "upgrade" || cheie === "reactivare") && index === 0) return "imediat ce donatorul devine eligibil";
  if (index === 0) return `${zile} zile după ${cheie === "welcome" ? "prima donație" : "ultima plată lunară"}`;
  return `${zile} zile după pasul anterior`;
}

function Parcurs({ p, orgSlug, poateEdita, emailOk, organizatie }: { p: ParcursDate; orgSlug: string; poateEdita: boolean; emailOk: boolean; organizatie: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pasi, setPasi] = useState<PasParcurs[]>(p.pasi);
  const [deschis, setDeschis] = useState(0);
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);
  const [confirmaPornire, setConfirmaPornire] = useState(false);
  const modificat = JSON.stringify(pasi) !== JSON.stringify(p.pasi);

  const schimba = (i: number, parte: Partial<PasParcurs>) => setPasi((v) => v.map((x, j) => (j === i ? { ...x, ...parte } : x)));

  const salveaza = (activ: boolean) =>
    startTransition(async () => {
      setMesaj(null);
      const r = await salveazaParcurs(orgSlug, p.cheie, pasi, activ);
      if (!r.ok) {
        setMesaj({ tip: "eroare", text: r.erori && r.erori.length > 1 ? r.erori.map((e) => (e.pas === null ? e.mesaj : `Pasul ${e.pas + 1}: ${e.mesaj}`)).join(" ") : r.eroare });
        return;
      }
      setConfirmaPornire(false);
      setMesaj({ tip: "ok", text: r.activ ? "Salvat. Parcursul este activ." : "Salvat. Parcursul este oprit." });
      router.refresh();
    });

  const test = (i: number) =>
    startTransition(async () => {
      setMesaj(null);
      const r = await trimiteTestParcurs(orgSlug, p.cheie, pasi, i);
      setMesaj(r.ok ? { tip: "ok", text: `Am trimis un e-mail de test la ${r.catre}.` } : { tip: "eroare", text: r.eroare });
    });

  const valoriExemplu = { prenume: "Ana", organizatie, suma: "100", total: "350", campanie: "Campania ta", link: "https://exemplu.ro/campania-ta" };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--ci-text)]">{p.nume}</h2>
            <Badge tone={p.activ ? "green" : "neutral"} icon={false}>
              {p.activ ? "Activ" : "Oprit"}
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">{p.descriere}</p>
          {p.activ && p.activDin && <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">Activ din {dataRo(p.activDin)}.</p>}
        </div>
        {poateEdita && (
          <div className="flex flex-wrap gap-2">
            {p.activ ? (
              <Button className="min-h-10" disabled={pending} onClick={() => salveaza(false)}>
                Oprește
              </Button>
            ) : (
              <Button variant="primary" className="min-h-10" disabled={pending || !emailOk} onClick={() => setConfirmaPornire(true)}>
                Pornește
              </Button>
            )}
          </div>
        )}
      </div>

      {p.rezultate && p.rezultate.inscrisi > 0 ? (
        <div className="mt-4 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ci-text-muted)]">Ce a adus până acum</p>
          <dl className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <dt className="text-[12px] text-[var(--ci-text-muted)]">Au primit e-mailuri</dt>
              <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(p.rezultate.inscrisi)}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-[var(--ci-text-muted)]">Au donat după</dt>
              <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">
                {nr(p.rezultate.convertiti)} <span className="text-[13px] font-semibold text-[var(--ci-text-muted)]">({procentConversie(p.rezultate.convertiti, p.rezultate.inscrisi) ?? 0}%)</span>
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-[var(--ci-text-muted)]">Zile până la donație (mediană)</dt>
              <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{p.rezultate.medianaZile === null ? "—" : p.rezultate.medianaZile.toLocaleString("ro-RO")}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-[var(--ci-text-muted)]">Donat în total</dt>
              <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(p.rezultate.venit)} lei</dd>
            </div>
          </dl>
          <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
            Reușită = {p.obiectiv}, în cel mult {FEREASTRA_CONVERSIE_ZILE} de zile de la primul e-mail. Se numără donațiile online reușite, nu importurile. Pe pași:{" "}
            {p.rezultate.pasi.map((x) => `pasul ${x.pas}: ${nr(x.trimise)} trimise, ${nr(x.convertiti)} au donat după el`).join("; ")}.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">Rezultatele (câți donatori au donat după e-mailuri, cât și după cât timp) apar aici după primele e-mailuri trimise.</p>
      )}

      {confirmaPornire && !p.activ && (
        <div role="alertdialog" aria-label="Confirmă pornirea" className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
          <p className="font-semibold">Pornești „{p.nume}”?</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
            {p.cheie === "welcome" ? (
              <li>Primesc doar donatorii care donează prima dată de acum înainte, nu cei din trecut.</li>
            ) : (
              <li>
                {p.eligibiliPas1 === null ? "Nu putem estima câți donatori sunt eligibili acum." : `Acum sunt ${nr(p.eligibiliPas1)} donatori eligibili pentru primul pas.`} Trimiterea se face treptat, cel mult 150 de e-mailuri pe zi pentru toate parcursurile.
              </li>
            )}
            <li>Primesc doar donatorii cu acord pentru e-mailuri, nedezabonați și care nu au primit alt e-mail de parcurs în ultimele 7 zile.</li>
            <li>Textele salvate acum sunt cele care vor pleca. Trimite-ți un test înainte, dacă nu ai făcut-o.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="min-h-10" loading={pending} onClick={() => salveaza(true)}>
              Pornește parcursul
            </Button>
            <Button className="min-h-10" disabled={pending} onClick={() => setConfirmaPornire(false)}>
              Renunță
            </Button>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-3">
        {pasi.map((pas, i) => {
          const stat = p.statistici[i];
          const deschisAcum = deschis === i;
          return (
            <li key={i} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
              <button type="button" className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none" aria-expanded={deschisAcum} onClick={() => setDeschis(deschisAcum ? -1 : i)}>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-[var(--ci-text)]">
                    Pasul {i + 1}: {subiectRandat(pas.subiect, valoriExemplu) || "(fără subiect)"}
                  </span>
                  <span className="block text-[12.5px] text-[var(--ci-text-muted)]">{etichetaZile(p.cheie, i, pas.zile)}</span>
                </span>
                {stat && <span className="text-[12.5px] text-[var(--ci-text-muted)]">{nr(stat.trimiseTotal)} trimise ({nr(stat.trimiseUltimele30Zile)} în ultimele 30 de zile)</span>}
              </button>
              {deschisAcum && (
                <div className="grid gap-4 border-t border-[var(--ci-border)] p-3 md:grid-cols-2">
                  {poateEdita ? (
                    <div className="space-y-3">
                      {!((p.cheie === "upgrade" || p.cheie === "reactivare") && i === 0) && (
                        <div>
                          <Label htmlFor={`zile-${p.cheie}-${i}`}>Trimite după (zile)</Label>
                          <Input id={`zile-${p.cheie}-${i}`} type="number" min={1} max={LIMITE_PARCURS.maxZile} value={Number.isFinite(pas.zile) ? pas.zile : ""} onChange={(e) => schimba(i, { zile: e.target.value === "" ? Number.NaN : Number(e.target.value) })} className="max-w-28" />
                        </div>
                      )}
                      <div>
                        <Label htmlFor={`subiect-${p.cheie}-${i}`}>Subiect</Label>
                        <Input id={`subiect-${p.cheie}-${i}`} value={pas.subiect} maxLength={LIMITE_PARCURS.maxSubiect} onChange={(e) => schimba(i, { subiect: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`corp-${p.cheie}-${i}`}>Mesaj</Label>
                        <Textarea id={`corp-${p.cheie}-${i}`} rows={9} value={pas.corp} maxLength={LIMITE_PARCURS.maxCorp} onChange={(e) => schimba(i, { corp: e.target.value })} />
                        <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Paragrafele se despart printr-un rând gol. Poți folosi: {VARIABILE_PARCURS.map((v) => `{${v}}`).join(", ")}.</p>
                      </div>
                      <div>
                        <Label htmlFor={`buton-${p.cheie}-${i}`}>Text buton (opțional, duce la pagina de donație)</Label>
                        <Input id={`buton-${p.cheie}-${i}`} value={pas.buton ?? ""} maxLength={LIMITE_PARCURS.maxButon} onChange={(e) => schimba(i, { buton: e.target.value })} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button className="min-h-10" disabled={pending || !emailOk} onClick={() => test(i)}>
                          Trimite-mi un test
                        </Button>
                        {pasi.length > 1 && (
                          <Button
                            className="min-h-10"
                            disabled={pending}
                            onClick={() => {
                              setPasi((v) => v.filter((_, j) => j !== i));
                              setDeschis(0);
                            }}
                          >
                            Șterge pasul
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-[var(--ci-text-muted)]">Doar un administrator poate modifica textele.</p>
                  )}
                  <div>
                    <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--ci-text-muted)]">Previzualizare (valori de exemplu)</p>
                    <div className="rounded-lg border border-[var(--ci-border)] bg-white p-4 text-[#14213d]" dangerouslySetInnerHTML={{ __html: corpHtml(pas.corp, valoriExemplu) }} />
                    {pas.buton && <p className="mt-2 text-center"><span className="inline-block rounded-lg bg-[#154a85] px-5 py-2.5 text-[13px] font-semibold text-white">{pas.buton}</span></p>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {poateEdita && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="primary" className="min-h-10" loading={pending} disabled={!modificat && p.esteSalvat} onClick={() => salveaza(p.activ)}>
            Salvează textele
          </Button>
          {pasi.length < LIMITE_PARCURS.maxPasi && (
            <Button
              className="min-h-10"
              disabled={pending}
              onClick={() => {
                setPasi((v) => [...v, { zile: 7, subiect: "", corp: "" }]);
                setDeschis(pasi.length);
              }}
            >
              Adaugă un pas
            </Button>
          )}
          {modificat && (
            <Button className="min-h-10" disabled={pending} onClick={() => setPasi(p.pasiImplicit)}>
              Revino la textul implicit
            </Button>
          )}
        </div>
      )}
      {mesaj && (
        <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
          {mesaj.text}
        </p>
      )}
    </Card>
  );
}

export function ParcursuriClient({ orgSlug, date }: { orgSlug: string; date: DateParcursuri }) {
  return (
    <div className="space-y-4">
      {!date.emailConfigurat && (
        <p role="alert" className="rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[#7a3e00]">
          Trimiterea de e-mailuri nu este configurată pe platformă, deci parcursurile nu pot porni.
        </p>
      )}
      {date.parcursuri.map((p) => (
        <Parcurs key={p.cheie} p={p} orgSlug={orgSlug} poateEdita={date.poateEdita} emailOk={date.emailConfigurat} organizatie={date.organizatie} />
      ))}
      <p className="text-[12.5px] text-[var(--ci-text-muted)]">
        Fiecare e-mail are linkul „Nu mai vreau e-mailuri”. Un donator nu primește mai mult de un e-mail de parcurs la 7 zile și fiecare pas pleacă o singură dată către aceeași adresă.
      </p>
    </div>
  );
}
