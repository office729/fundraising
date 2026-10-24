"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  corpHtml,
  FEREASTRA_CONVERSIE_ZILE,
  formatLei,
  LIMITE_PARCURS,
  PLAFON_ZI_ORGANIZATIE,
  procentConversie,
  subiectRandat,
  VARIABILE_PARCURS,
  type EroareParcurs,
  type PasParcurs,
} from "@/lib/parcursuri-donatori";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input, Label, Textarea } from "../../components/ui/input";

import { salveazaParcurs, trimiteTestParcurs, type DateParcursuri, type ParcursDate } from "./actions";

const nr = (n: number) => n.toLocaleString("ro-RO");
const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });
const zileText = (n: number) => `${n} ${n === 1 ? "zi" : "zile"}`;

// Cât de târziu e „zile”: la primul pas se numără de la eveniment, la următorii de la trimiterea pasului anterior.
function etichetaZile(cheie: string, index: number, zile: number): string {
  if ((cheie === "upgrade" || cheie === "reactivare") && index === 0) return "imediat ce donatorul devine eligibil";
  if (index === 0) {
    const eveniment = cheie === "welcome" ? "prima donație" : cheie === "a_doua_donatie" ? "a doua donație" : "ultima plată lunară";
    return `${zileText(zile)} după ${eveniment}`;
  }
  return `${zileText(zile)} după pasul anterior`;
}

const ONLY_SUMAR = { prenume: "Ana", suma: formatLei(100), total: formatLei(350), campanie: "Campania ta", link: "https://exemplu.ro/campania-ta" };

function Parcurs({ p, orgSlug, poateEdita, emailOk, organizatie }: { p: ParcursDate; orgSlug: string; poateEdita: boolean; emailOk: boolean; organizatie: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pasi, setPasi] = useState<PasParcurs[]>(p.pasi);
  const [deschisCard, setDeschisCard] = useState(false);
  const [deschis, setDeschis] = useState(0);
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);
  const [mesajTest, setMesajTest] = useState<{ pas: number; tip: "ok" | "eroare"; text: string } | null>(null);
  const [erori, setErori] = useState<EroareParcurs[]>([]);
  const [confirma, setConfirma] = useState<null | "porneste" | "opreste" | "restaureaza">(null);
  const [acord, setAcord] = useState(false);
  const [stergePas, setStergePas] = useState<number | null>(null);
  const modificat = JSON.stringify(pasi) !== JSON.stringify(p.pasi);
  const valoriExemplu = { ...ONLY_SUMAR, organizatie };

  // Textele modificate și nesalvate se pierd la închiderea paginii: întrebăm înainte.
  useEffect(() => {
    if (!modificat) return;
    const avertizeaza = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avertizeaza);
    return () => window.removeEventListener("beforeunload", avertizeaza);
  }, [modificat]);

  const schimba = (i: number, parte: Partial<PasParcurs>) => setPasi((v) => v.map((x, j) => (j === i ? { ...x, ...parte } : x)));

  const insereaza = (i: number, variabila: string) => {
    const camp = document.getElementById(`corp-${p.cheie}-${i}`) as HTMLTextAreaElement | null;
    const text = `{${variabila}}`;
    const inceput = camp?.selectionStart ?? pasi[i].corp.length;
    const sfarsit = camp?.selectionEnd ?? inceput;
    schimba(i, { corp: pasi[i].corp.slice(0, inceput) + text + pasi[i].corp.slice(sfarsit) });
    requestAnimationFrame(() => {
      camp?.focus();
      camp?.setSelectionRange(inceput + text.length, inceput + text.length);
    });
  };

  const salveaza = (activ: boolean, confirmaAcord = false) =>
    startTransition(async () => {
      setMesaj(null);
      setErori([]);
      const r = await salveazaParcurs(orgSlug, p.cheie, pasi, activ, confirmaAcord);
      if (!r.ok) {
        setErori(r.erori ?? []);
        setMesaj({ tip: "eroare", text: r.erori && r.erori.length > 0 ? "Verifică câmpurile marcate mai jos." : r.eroare });
        const primulPas = r.erori?.find((e) => e.pas !== null)?.pas;
        if (typeof primulPas === "number") {
          setDeschisCard(true);
          setDeschis(primulPas);
        }
        return;
      }
      setConfirma(null);
      setAcord(false);
      setMesaj({ tip: "ok", text: r.activ ? "Salvat. Parcursul este activ." : "Salvat. Parcursul este oprit." });
      router.refresh();
    });

  const test = (i: number) =>
    startTransition(async () => {
      setMesajTest(null);
      const r = await trimiteTestParcurs(orgSlug, p.cheie, pasi, i);
      setMesajTest({ pas: i, ...(r.ok ? { tip: "ok" as const, text: `Am trimis un e-mail de test la ${r.catre}.` } : { tip: "eroare" as const, text: r.eroare }) });
    });

  const r = p.rezultate;
  const trimiseTotal = p.statistici.reduce((s, x) => s + x.trimiseTotal, 0);

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
          <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">
            {pasi.length} {pasi.length === 1 ? "pas" : "pași"} · {nr(trimiseTotal)} trimise
            {r && r.inscrisi > 0 ? ` · ${nr(r.convertiti)} au donat după (${procentConversie(r.convertiti, r.inscrisi) ?? 0}%)` : ""}
            {p.activ && p.activDin ? ` · activ din ${dataRo(p.activDin)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" aria-expanded={deschisCard} onClick={() => setDeschisCard(!deschisCard)}>
            {deschisCard ? "Ascunde detaliile" : poateEdita ? "Vezi și editează" : "Vezi detaliile"}
          </Button>
          {poateEdita &&
            (p.activ ? (
              <Button className="min-h-11" disabled={pending} onClick={() => setConfirma("opreste")}>
                Oprește
              </Button>
            ) : (
              <Button variant="primary" className="min-h-11" disabled={pending || !emailOk} onClick={() => setConfirma("porneste")}>
                Pornește
              </Button>
            ))}
        </div>
      </div>

      {confirma === "opreste" && (
        <div role="group" aria-label="Confirmă oprirea" className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
          <p className="font-semibold">Oprești „{p.nume}”?</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
            <li>Nu mai pleacă niciun e-mail din acest parcurs, de mâine.</li>
            <li>Donatorii care au primit deja un pas nu îl mai primesc. Dacă repornești, seria continuă de unde a rămas; un pas deja trimis nu se retrimite.</li>
            <li>Rezultatele de până acum rămân vizibile.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" className="min-h-11" loading={pending} onClick={() => salveaza(false)}>
              Oprește parcursul
            </Button>
            <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(null)}>
              Renunță
            </Button>
          </div>
        </div>
      )}

      {confirma === "porneste" && !p.activ && (
        <div role="group" aria-label="Confirmă pornirea" className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
          <p className="font-semibold">Pornești „{p.nume}”?</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
            {p.cheie === "welcome" || p.cheie === "a_doua_donatie" ? (
              <li>Primesc doar donatorii care ajung în această situație de acum înainte, nu cei din trecut.</li>
            ) : (
              <li>
                {p.eligibiliPas1 === null ? "Nu putem estima câți donatori ar primi acum primul e-mail." : `Acum, ${nr(p.eligibiliPas1)} donatori ar primi primul e-mail.`} Trimiterea se face treptat: cel mult {PLAFON_ZI_ORGANIZATIE} de e-mailuri pe zi pentru toate parcursurile (mai puțin în primele 30 de zile ale contului).
              </li>
            )}
            <li>Primesc doar donatorii care au bifat singuri acordul pentru e-mailuri, nedezabonați și care nu au primit alt e-mail de parcurs în ultimele 7 zile.</li>
            <li>
              {modificat ? "Ai modificări nesalvate: se vor salva acum, iar textele așa cum sunt acum sunt cele care vor pleca." : "Textele salvate acum sunt cele care vor pleca."} Trimite-ți un test înainte, dacă nu ai făcut-o.
            </li>
          </ul>
          <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 text-[13px]">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={acord} onChange={(e) => setAcord(e.target.checked)} />
            <span>Confirm că donatorii cărora li se trimit aceste mesaje au acceptat să le primească. Confirmarea se păstrează în jurnal, cu data și numele meu.</span>
          </label>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="min-h-11" loading={pending} disabled={!acord} onClick={() => salveaza(true, acord)}>
              Pornește parcursul
            </Button>
            <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(null)}>
              Renunță
            </Button>
          </div>
        </div>
      )}

      {mesaj && !deschisCard && (
        <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
          {mesaj.text}
        </p>
      )}

      {deschisCard && (
        <div className="mt-4">
          {p.activ && poateEdita && <p className="mb-3 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[#7a3e00]">Parcurs activ: modificările salvate se aplică de la următorul e-mail trimis. Nu se retrimite nimic.</p>}

          {r && r.inscrisi > 0 ? (
            <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ci-text-muted)]">Ce a adus până acum</p>
              <dl className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">Au primit e-mailuri</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(r.inscrisi)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">Au donat după</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">
                    {nr(r.convertiti)} <span className="text-[13px] font-semibold text-[var(--ci-text-muted)]">({procentConversie(r.convertiti, r.inscrisi) ?? 0}%)</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">De obicei au donat după</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{r.medianaZile === null ? "—" : `${r.medianaZile.toLocaleString("ro-RO")} zile`}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">Donat în total</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(r.venit)} lei</dd>
                </div>
              </dl>
              {r.control && r.control.inscrisi > 0 && (
                <p className="mt-2 text-[12.5px] text-[var(--ci-text)]">
                  Grup de control: din {nr(r.control.inscrisi)} donatori care n-au primit mesajul, {nr(r.control.convertiti)} ({procentConversie(r.control.convertiti, r.control.inscrisi) ?? 0}%) au donat oricum în aceeași perioadă. Diferența dintre procente arată ce aduce, de fapt, e-mailul.
                </p>
              )}
              <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
                Reușită = {p.obiectiv}, în cel mult {FEREASTRA_CONVERSIE_ZILE} de zile de la primul e-mail. Se numără donațiile online reușite, nu importurile. Pe pași:{" "}
                {r.pasi.map((x) => `pasul ${x.pas}: ${nr(x.trimise)} trimise, ${nr(x.convertiti)} au donat după el`).join("; ")}.
              </p>
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--ci-text-muted)]">Rezultatele (câți donatori au donat după e-mailuri, cât și după cât timp) apar aici după primele e-mailuri trimise.</p>
          )}

          <ol className="mt-4 space-y-3">
            {pasi.map((pas, i) => {
              const stat = p.statistici[i];
              const deschisAcum = deschis === i;
              const eroriPas = erori.filter((e) => e.pas === i);
              return (
                <li key={i} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
                  <button type="button" className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none" aria-expanded={deschisAcum} onClick={() => setDeschis(deschisAcum ? -1 : i)}>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-[var(--ci-text)]">
                        Pasul {i + 1}: {subiectRandat(pas.subiect, valoriExemplu) || "(fără subiect)"}
                        {eroriPas.length > 0 && <span className="ml-2 text-[12px] font-semibold text-[#9b1c1c]">de corectat</span>}
                      </span>
                      <span className="block text-[12.5px] text-[var(--ci-text-muted)]">{etichetaZile(p.cheie, i, pas.zile)}</span>
                    </span>
                    {stat && <span className="text-[12.5px] text-[var(--ci-text-muted)]">{nr(stat.trimiseTotal)} trimise ({nr(stat.trimiseUltimele30Zile)} în ultimele 30 de zile)</span>}
                  </button>
                  {deschisAcum && (
                    <div className="grid gap-4 border-t border-[var(--ci-border)] p-3 md:grid-cols-2">
                      {poateEdita ? (
                        <div className="space-y-3">
                          {eroriPas.length > 0 && (
                            <ul role="alert" className="list-disc space-y-1 rounded-lg bg-[var(--ci-red-soft)] py-2 pr-3 pl-7 text-[12.5px] text-[#9b1c1c]">
                              {eroriPas.map((e, k) => (
                                <li key={k}>{e.mesaj}</li>
                              ))}
                            </ul>
                          )}
                          {!((p.cheie === "upgrade" || p.cheie === "reactivare") && i === 0) && (
                            <div>
                              <Label htmlFor={`zile-${p.cheie}-${i}`}>Trimite după (zile)</Label>
                              <Input id={`zile-${p.cheie}-${i}`} type="number" min={1} max={LIMITE_PARCURS.maxZile} value={Number.isFinite(pas.zile) ? pas.zile : ""} onChange={(e) => schimba(i, { zile: e.target.value === "" ? Number.NaN : Number(e.target.value) })} className="max-w-28" aria-describedby={`zile-ajutor-${p.cheie}-${i}`} />
                              <p id={`zile-ajutor-${p.cheie}-${i}`} className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
                                Se trimite {Number.isFinite(pas.zile) ? etichetaZile(p.cheie, i, pas.zile) : "după numărul de zile ales"}.
                              </p>
                            </div>
                          )}
                          <div>
                            <Label htmlFor={`subiect-${p.cheie}-${i}`}>Subiect</Label>
                            <Input id={`subiect-${p.cheie}-${i}`} value={pas.subiect} maxLength={LIMITE_PARCURS.maxSubiect} onChange={(e) => schimba(i, { subiect: e.target.value })} aria-invalid={eroriPas.some((e) => /subiect/i.test(e.mesaj))} />
                            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Fără sume sau numele campaniei în subiect: se vede pe ecranul blocat al telefonului.</p>
                          </div>
                          <div>
                            <Label htmlFor={`corp-${p.cheie}-${i}`}>Mesaj</Label>
                            <Textarea id={`corp-${p.cheie}-${i}`} rows={9} value={pas.corp} maxLength={LIMITE_PARCURS.maxCorp} onChange={(e) => schimba(i, { corp: e.target.value })} />
                            <div className="mt-1 flex flex-wrap items-center gap-1.5" role="group" aria-label="Inserează o variabilă în mesaj">
                              <span className="text-[12px] text-[var(--ci-text-muted)]">Inserează:</span>
                              {VARIABILE_PARCURS.map((v) => (
                                <button key={v} type="button" onClick={() => insereaza(i, v)} className="min-h-8 rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-2.5 text-[12px] font-semibold text-[var(--ci-text)] hover:border-[var(--ci-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                                  {v}
                                </button>
                              ))}
                            </div>
                            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Paragrafele se despart printr-un rând gol. Nu pune adrese web: linkul de donație vine din buton.</p>
                          </div>
                          <div>
                            <Label htmlFor={`buton-${p.cheie}-${i}`}>Text buton (opțional, duce la pagina de donație)</Label>
                            <Input id={`buton-${p.cheie}-${i}`} value={pas.buton ?? ""} maxLength={LIMITE_PARCURS.maxButon} onChange={(e) => schimba(i, { buton: e.target.value })} />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button className="min-h-11" disabled={pending || !emailOk} onClick={() => test(i)}>
                              Trimite-mi un test
                            </Button>
                            {pasi.length > 1 && stergePas !== i && (
                              <Button className="min-h-11" disabled={pending} onClick={() => setStergePas(i)}>
                                Șterge pasul
                              </Button>
                            )}
                          </div>
                          <p className="text-[12px] text-[var(--ci-text-muted)]">Testul pleacă la adresa contului tău, cu valori de exemplu, și include și textele nesalvate.</p>
                          {mesajTest && mesajTest.pas === i && (
                            <p role={mesajTest.tip === "eroare" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${mesajTest.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
                              {mesajTest.text}
                            </p>
                          )}
                          {stergePas === i && (
                            <div role="group" aria-label="Confirmă ștergerea pasului" className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[12.5px]">
                              <p className="font-semibold">Ștergi pasul {i + 1}?</p>
                              <p className="mt-1">Textul lui se pierde (până la salvare poți reveni cu „Renunță la modificări”). Donatorii care au primit deja acest pas nu îl mai primesc.</p>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  variant="danger"
                                  className="min-h-11"
                                  onClick={() => {
                                    setPasi((v) => v.filter((_, j) => j !== i));
                                    setStergePas(null);
                                    setDeschis(0);
                                  }}
                                >
                                  Șterge pasul
                                </Button>
                                <Button className="min-h-11" onClick={() => setStergePas(null)}>
                                  Renunță
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[12.5px] text-[var(--ci-text-muted)]">Doar un administrator poate modifica textele.</p>
                      )}
                      <div>
                        <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--ci-text-muted)]">Previzualizare (valori de exemplu, doar o machetă)</p>
                        <div className="rounded-lg border border-[var(--ci-border)] bg-white p-4 text-[#14213d]" dangerouslySetInnerHTML={{ __html: corpHtml(pas.corp, valoriExemplu) }} />
                        {pas.buton && (
                          <p className="mt-2 text-center">
                            <span className="inline-block rounded-lg bg-[#154a85] px-5 py-2.5 text-[13px] font-semibold text-white">{pas.buton}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {poateEdita && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" className="min-h-11" loading={pending} disabled={!modificat && p.esteSalvat} onClick={() => salveaza(p.activ)}>
                Salvează textele
              </Button>
              {pasi.length < LIMITE_PARCURS.maxPasi && (
                <Button
                  className="min-h-11"
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
                <Button
                  className="min-h-11"
                  disabled={pending}
                  onClick={() => {
                    setPasi(p.pasi);
                    setErori([]);
                    setMesaj(null);
                  }}
                >
                  Renunță la modificări
                </Button>
              )}
              {confirma !== "restaureaza" && JSON.stringify(p.pasi) !== JSON.stringify(p.pasiImplicit) && (
                <Button className="min-h-11" disabled={pending} onClick={() => setConfirma("restaureaza")}>
                  Restaurează textul original
                </Button>
              )}
            </div>
          )}
          {confirma === "restaureaza" && (
            <div role="group" aria-label="Confirmă restaurarea" className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[12.5px]">
              <p className="font-semibold">Revii la textele originale ale platformei?</p>
              <p className="mt-1">Toți pașii acestui parcurs (zile, subiecte, mesaje, butoane) se înlocuiesc cu cei originali, în ecran. Se aplică abia după „Salvează textele”.</p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="danger"
                  className="min-h-11"
                  onClick={() => {
                    setPasi(p.pasiImplicit);
                    setErori([]);
                    setConfirma(null);
                    setDeschis(0);
                  }}
                >
                  Restaurează
                </Button>
                <Button className="min-h-11" onClick={() => setConfirma(null)}>
                  Renunță
                </Button>
              </div>
            </div>
          )}
          {mesaj && (
            <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
              {mesaj.text}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function ParcursuriClient({ orgSlug, date }: { orgSlug: string; date: DateParcursuri }) {
  const active = date.parcursuri.filter((p) => p.activ).length;
  const c = date.contactabili;
  return (
    <div className="space-y-4">
      {!date.emailConfigurat && (
        <p role="alert" className="rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[#7a3e00]">
          Trimiterea de e-mailuri nu este configurată pe platformă, deci parcursurile nu pot porni.
        </p>
      )}
      <Card>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <dt className="text-[12px] text-[var(--ci-text-muted)]">Parcursuri active</dt>
            <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">
              {active} <span className="text-[13px] font-semibold text-[var(--ci-text-muted)]">din {date.parcursuri.length}</span>
            </dd>
          </div>
          {c && (
            <>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">Donatori care pot primi parcursuri</dt>
                <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">
                  {nr(c.pot)} <span className="text-[13px] font-semibold text-[var(--ci-text-muted)]">din {nr(c.total)}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">Fără acord pentru e-mail</dt>
                <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(c.faraAcord + c.refuz)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">Dezabonați</dt>
                <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(c.dezabonati)}</dd>
              </div>
            </>
          )}
        </dl>
        {c && c.pot < c.total && (
          <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">
            Parcursurile ajung doar la donatorii care au bifat singuri acordul pentru e-mailuri în formularul de donație ({nr(c.faraAcord)} nu au fost întrebați, {nr(c.refuz)} au refuzat
            {c.acordDeclarat > 0 ? `, ${nr(c.acordDeclarat)} au acordul doar declarat de echipă` : ""}). Donatorii importați nu intră până nu donează online și nu bifează.
          </p>
        )}
        {c && c.adreseProblematice > 0 && (
          <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">
            {nr(c.adreseProblematice)} {c.adreseProblematice === 1 ? "adresă respinsă sau reclamată nu primește" : "adrese respinse sau reclamate nu primesc"} mesaje. Le vezi și le poți repara în fișa fiecărui donator.
          </p>
        )}
        <details className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">
          <summary className="min-h-9 cursor-pointer font-semibold text-[var(--ci-text)]">Cum funcționează</summary>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Mesajele pleacă o dată pe zi, între 9:00 și 19:00 (ora României), treptat: cel mult {PLAFON_ZI_ORGANIZATIE} pe zi pentru toate parcursurile.</li>
            <li>Un donator nu primește mai mult de un e-mail de parcurs la 7 zile și cel mult 3 la 30 de zile. Fiecare pas pleacă o singură dată către aceeași adresă.</li>
            <li>Seria se oprește când donatorul donează din nou (la Welcome și Save), răspunde sau se dezabonează.</li>
            <li>La Upgrade și Reactivare, 10% dintre donatori nu primesc mesajul (grup de control), ca să vezi ce aduce el cu adevărat.</li>
          </ul>
        </details>
      </Card>
      {date.parcursuri.map((p) => (
        <Parcurs key={p.cheie} p={p} orgSlug={orgSlug} poateEdita={date.poateEdita} emailOk={date.emailConfigurat} organizatie={date.organizatie} />
      ))}
      <p className="text-[12.5px] text-[var(--ci-text-muted)]">Fiecare e-mail are linkul „Nu mai vreau e-mailuri” și numele organizației în subsol.</p>
    </div>
  );
}
