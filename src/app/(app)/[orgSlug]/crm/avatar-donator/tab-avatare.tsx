"use client";

import { Check, ChevronDown, Copy, ExternalLink, FlaskConical, Info, Lightbulb, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ETICHETA_INCREDERE, textFisa, type Avatar, type Incredere, type RezultatAvatare, type SursaDate } from "@/lib/avatar-donator/avatare-reale";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";

type Filtru = "toate" | "sigure" | "devalidat";

const TON_INCREDERE: Record<Incredere, "green" | "amber" | "orange"> = { ridicat: "green", mediu: "amber", scazut: "orange" };
const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;

// Avatarele donatorilor din datele reale ale organizației: grupuri comportamentale, nu persoane. Fiecare fișă separă faptele observate
// de interpretare și de ipoteze, spune cât de sigure sunt concluziile și ce date lipsesc.
export function TabAvatare({ rezultat, mergiLa }: { rezultat: RezultatAvatare | null; mergiLa: (tab: "simplu" | "buget") => void }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [filtru, setFiltru] = useState<Filtru>("toate");
  const [deschis, setDeschis] = useState<string | null>(null);

  if (!rezultat) {
    return (
      <Card>
        <EmptyState title="Avatarele nu s-au putut calcula acum" description="Datele donatorilor nu au putut fi citite. Reîncarcă pagina; dacă problema continuă, scrie-ne." />
      </Card>
    );
  }

  const { baza, avatare } = rezultat;
  const vizibile = avatare.filter((a) => (filtru === "toate" ? true : filtru === "sigure" ? a.incredere !== "scazut" : a.incredere === "scazut"));

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-[13.5px] leading-relaxed text-[var(--ci-text-muted)]">
        Grupuri de donatori care se comportă asemănător, construite doar din donațiile din CRM. Nu descriem persoane și nu ghicim motive: cifrele sunt separate de interpretări și de ipoteze, ca echipa să știe ce e dovedit și ce trebuie verificat.
      </p>

      <DateDeBaza rezultat={rezultat} />

      {!rezultat.suficient ? (
        <Card>
          <EmptyState
            title={baza.donatori === 0 ? "Nu există încă donatori cu donații" : "Încă nu sunt destule date pentru avatare"}
            description={
              baza.donatori === 0
                ? "După primele donații (online, introduse manual sau importate), aici apar grupuri de donatori cu recomandări."
                : `Avem ${baza.donatori.toLocaleString("ro-RO")} donatori cu donații; pentru grupuri cu concluzii utile e nevoie de cel puțin 20 în total și 10 în fiecare grup. Importă istoricul donațiilor sau continuă să înregistrezi donațiile.`
            }
          />
          {rezultat.grupuriMici.length > 0 && (
            <p className="mt-3 text-center text-[12.5px] text-[var(--ci-text-muted)]">Grupuri sub 10 donatori (nu se afișează detalii): {rezultat.grupuriMici.map((g) => g.nume).join(", ")}.</p>
          )}
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ci-border)] px-5 py-3.5">
              <div>
                <h3 className="ci-display text-[15px] font-semibold">Avatarele tale</h3>
                <p className="text-[12.5px] text-[var(--ci-text-muted)]">{avatare.length} {avatare.length === 1 ? "grup susținut" : "grupuri susținute"} de date</p>
              </div>
              <div role="group" aria-label="Filtrează după încredere" className="flex overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] text-[12.5px] font-medium">
                {([["toate", "Toate"], ["sigure", "Încredere medie sau ridicată"], ["devalidat", "De validat"]] as const).map(([k, e]) => (
                  <button key={k} aria-pressed={filtru === k} onClick={() => setFiltru(k)} className={`px-3 py-1.5 transition-colors ${filtru === k ? "bg-[var(--ci-primary)] text-white" : "hover:bg-[var(--ci-surface-2)]"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Avatar</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Donatori</th>
                    <th className="px-3 py-2.5 text-right font-semibold">% din bază</th>
                    <th className="px-3 py-2.5 text-right font-semibold">% din sumă</th>
                    <th className="px-3 py-2.5 font-semibold">Dovadă principală</th>
                    <th className="px-5 py-2.5 font-semibold">Încredere</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ci-border)]">
                  {vizibile.map((a) => (
                    <tr key={a.id} className="hover:bg-[var(--ci-surface-2)]">
                      <td className="px-5 py-3">
                        <button onClick={() => setDeschis(deschis === a.id ? null : a.id)} className="text-left font-semibold text-[var(--ci-primary)] hover:underline">{a.nume}</button>
                        <p className="text-[12px] text-[var(--ci-text-muted)]">{a.etapa}</p>
                      </td>
                      <td className="ci-tabular px-3 py-3 text-right font-semibold">{a.nr.toLocaleString("ro-RO")}</td>
                      <td className="ci-tabular px-3 py-3 text-right">{a.procentBaza}%</td>
                      <td className="ci-tabular px-3 py-3 text-right">{a.procentSuma}%</td>
                      <td className="max-w-[260px] px-3 py-3 text-[12.5px] text-[var(--ci-text-muted)]">{a.dovada}</td>
                      <td className="px-5 py-3"><Badge tone={TON_INCREDERE[a.incredere]} icon={false} className="whitespace-nowrap">{ETICHETA_INCREDERE[a.incredere]}</Badge></td>
                    </tr>
                  ))}
                  {vizibile.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-6 text-center text-[13px] text-[var(--ci-text-muted)]">Niciun avatar nu se potrivește filtrului.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {rezultat.grupuriMici.length > 0 && (
              <p className="border-t border-[var(--ci-border)] px-5 py-3 text-[12.5px] text-[var(--ci-text-muted)]">
                Nu se afișează detalii despre grupurile sub 10 donatori ({rezultat.grupuriMici.map((g) => g.nume).join(", ")}): cifrele ar putea indica persoane anume.
              </p>
            )}
          </Card>

          <div className="space-y-3">
            {vizibile.map((a) => (
              <FisaAvatar key={a.id} a={a} orgSlug={orgSlug} deschis={deschis === a.id} comuta={() => setDeschis(deschis === a.id ? null : a.id)} />
            ))}
          </div>
        </>
      )}

      <SurseSiLimite rezultat={rezultat} mergiLa={mergiLa} />
      <Protectie />
    </div>
  );
}

// ===== Cifrele de bază ale donatorilor (fapte) =====
function DateDeBaza({ rezultat }: { rezultat: RezultatAvatare }) {
  const { baza } = rezultat;
  if (baza.donatori === 0) return null;
  const celule: { eticheta: string; valoare: string; nota?: string }[] = [
    { eticheta: "Donatori cu donații", valoare: baza.donatori.toLocaleString("ro-RO") },
    { eticheta: "Total donat", valoare: lei(baza.suma) },
    { eticheta: "Donație mediană", valoare: lei(baza.medianaDonatie), nota: "mediana, nu media" },
    { eticheta: "Donatori lunari activi", valoare: `${baza.recurenti.toLocaleString("ro-RO")} (${Math.round((baza.recurenti / baza.donatori) * 100)}%)` },
    {
      eticheta: "Au donat din nou",
      valoare: baza.revenire.valoare == null ? "—" : `${baza.revenire.valoare}%`,
      nota: baza.revenire.valoare == null ? "prea puțini donatori mai vechi de 6 luni" : `din ${baza.revenire.eligibili.toLocaleString("ro-RO")} donatori cu prima donație acum >6 luni`,
    },
    {
      eticheta: "Păstrați după 12 luni",
      valoare: baza.retentie12.valoare == null ? "—" : `${baza.retentie12.valoare}%`,
      nota: baza.retentie12.valoare == null ? "prea puțini donatori activi acum 12–24 luni" : `din ${baza.retentie12.baza.toLocaleString("ro-RO")} activi acum 12–24 luni`,
    },
  ];
  return (
    <Card>
      <CardHeader title="Date de bază" subtitle="Fapte observate în donațiile din CRM (online, înregistrate manual și importate, nete de rambursări)" action={<Badge tone="blue" icon={false}>Fapt observat</Badge>} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {celule.map((c) => (
          <div key={c.eticheta} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2.5">
            <dt className="text-[11.5px] text-[var(--ci-text-muted)]">{c.eticheta}</dt>
            <dd className="ci-tabular mt-0.5 text-[16px] font-bold text-[var(--ci-text)]">{c.valoare}</dd>
            {c.nota && <p className="mt-0.5 text-[11px] leading-snug text-[var(--ci-text-muted)]">{c.nota}</p>}
          </div>
        ))}
      </dl>
      {baza.ani.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full max-w-lg min-w-[420px] text-left text-[12.5px]">
            <caption className="mb-1.5 text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">Evoluția pe ani</caption>
            <thead className="text-[11px] tracking-wide text-[var(--ci-text-muted)] uppercase">
              <tr><th className="py-1 pr-3 font-semibold">An</th><th className="px-3 py-1 text-right font-semibold">Donații</th><th className="px-3 py-1 text-right font-semibold">Donatori</th><th className="py-1 pl-3 text-right font-semibold">Sumă</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--ci-border)]">
              {baza.ani.map((a) => (
                <tr key={a.an}><td className="py-1.5 pr-3 font-medium">{a.an}</td><td className="ci-tabular px-3 py-1.5 text-right">{a.donatii.toLocaleString("ro-RO")}</td><td className="ci-tabular px-3 py-1.5 text-right">{a.donatori.toLocaleString("ro-RO")}</td><td className="ci-tabular py-1.5 pl-3 text-right">{lei(a.suma)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {baza.surse.length > 0 && (
        <p className="mt-3 text-[12px] text-[var(--ci-text-muted)]">
          Sursa înregistrării în CRM: {baza.surse.map((s) => `${s.sursa} (${s.nr.toLocaleString("ro-RO")})`).join(" · ")}. Nu este același lucru cu canalul prin care au aflat de organizație.
        </p>
      )}
    </Card>
  );
}

function Lista({ titlu, items, icon, ton }: { titlu: string; items: string[]; icon: React.ReactNode; ton?: "blue" | "amber" | "purple" | "neutral" }) {
  if (items.length === 0) return null;
  const eticheta = ton === "blue" ? "Fapt observat" : ton === "amber" ? "Interpretare" : ton === "purple" ? "Ipoteză" : null;
  return (
    <section>
      <div className="flex items-center gap-2">
        <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ci-text)]">{icon} {titlu}</h4>
        {eticheta && <Badge tone={ton ?? "neutral"} icon={false}>{eticheta}</Badge>}
      </div>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[var(--ci-text)]">
        {items.map((i) => (
          <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--ci-text-faint)]" /><span>{i}</span></li>
        ))}
      </ul>
    </section>
  );
}

function FisaAvatar({ a, orgSlug, deschis, comuta }: { a: Avatar; orgSlug: string; deschis: boolean; comuta: () => void }) {
  const [copiat, setCopiat] = useState(false);
  async function copiaza() {
    try {
      await navigator.clipboard.writeText(textFisa(a));
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      /* clipboard indisponibil */
    }
  }
  const idPanou = `fisa-${a.id}`;
  return (
    <Card padded={false}>
      <button onClick={comuta} aria-expanded={deschis} aria-controls={idPanou} className="flex w-full items-center gap-3 px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
        <div className="min-w-0 flex-1">
          <p className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{a.nume}</p>
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">{a.etapa}</p>
        </div>
        <Badge tone={TON_INCREDERE[a.incredere]} icon={false}>{ETICHETA_INCREDERE[a.incredere]}</Badge>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--ci-text-muted)] transition-transform ${deschis ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {deschis && (
        <div id={idPanou} className="space-y-5 border-t border-[var(--ci-border)] px-5 py-5">
          <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text-muted)]">{a.motivIncredere}</p>
          <div className="grid gap-5 lg:grid-cols-2">
            <Lista titlu="Ce arată datele" items={a.fapte} icon={<Info className="h-3.5 w-3.5" />} ton="blue" />
            <Lista titlu="Ce pare să însemne" items={a.interpretare} icon={<Lightbulb className="h-3.5 w-3.5" />} ton="amber" />
            <Lista titlu="De validat (nu se poate deduce din date)" items={a.ipoteze} icon={<FlaskConical className="h-3.5 w-3.5" />} ton="purple" />
            <Lista titlu="Campanii susținute de mai mulți din grup" items={a.campanii.map((c) => `${c.titlu} — ${c.donatori} donatori`)} icon={<Check className="h-3.5 w-3.5" />} ton="blue" />
          </div>
          {a.campanii.length === 0 && <p className="text-[12.5px] text-[var(--ci-text-muted)]">Nicio campanie nu a fost susținută de cel puțin 3 donatori din acest grup (sub acest prag nu afișăm alegerile).</p>}

          <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-primary-soft)] p-4">
            <h4 className="text-[13px] font-semibold text-[var(--ci-text)]">Recomandare de testat</h4>
            <dl className="mt-2 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
              {([["Mesaj", a.recomandari.mesaj], ["Apel la acțiune", a.recomandari.cta], ["Canal și format", a.recomandari.canal], ["Frecvență de testat", a.recomandari.frecventa]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-[11.5px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{k}</dt><dd className="mt-0.5">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-[13px]"><b>Următorul pas:</b> {a.recomandari.urmatorulPas}</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Lista titlu="Bariere posibile (de verificat)" items={a.bariere} icon={<FlaskConical className="h-3.5 w-3.5" />} ton="purple" />
            <Lista titlu="De evitat" items={a.recomandari.evitat} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
            <Lista titlu="Teste A/B prioritare" items={a.teste} icon={<FlaskConical className="h-3.5 w-3.5" />} />
            <Lista titlu="Indicatori de urmărit" items={a.indicatori} icon={<Check className="h-3.5 w-3.5" />} />
          </div>
          <Lista titlu="Date care ar confirma sau infirma avatarul" items={a.dateSuplimentare} icon={<Info className="h-3.5 w-3.5" />} />

          <div className="flex flex-wrap gap-2 border-t border-[var(--ci-border)] pt-4">
            <Link href={`/${orgSlug}/crm/rfm`} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium hover:bg-[var(--ci-surface-2)]">
              <ExternalLink className="h-3.5 w-3.5" /> Vezi segmentele donatorilor
            </Link>
            <Link href={`/${orgSlug}/crm/donatori`} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium hover:bg-[var(--ci-surface-2)]">
              <ExternalLink className="h-3.5 w-3.5" /> CRM persoane fizice
            </Link>
            <Link href={`/${orgSlug}/crm/comunicare`} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium hover:bg-[var(--ci-surface-2)]">
              <ExternalLink className="h-3.5 w-3.5" /> Pregătește comunicarea
            </Link>
            <Button variant="secondary" onClick={copiaza}>{copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiat ? "Copiat" : "Copiază fișa"}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

const TON_SURSA: Record<SursaDate["stare"], "green" | "amber" | "neutral"> = { conectat: "green", manual: "amber", lipsa: "neutral" };
const TEXT_SURSA: Record<SursaDate["stare"], string> = { conectat: "Conectat", manual: "Introdus manual", lipsa: "Lipsește" };

function SurseSiLimite({ rezultat, mergiLa }: { rezultat: RezultatAvatare; mergiLa: (tab: "simplu" | "buget") => void }) {
  return (
    <Card>
      <CardHeader title="Ce date am folosit și ce lipsește" subtitle="Nu pretindem că am analizat surse la care nu avem acces" />
      <ul className="divide-y divide-[var(--ci-border)]">
        {rezultat.surse.map((s) => (
          <li key={s.eticheta} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[var(--ci-text)]">{s.eticheta}</p>
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">{s.detaliu}</p>
            </div>
            <Badge tone={TON_SURSA[s.stare]} icon={false}>{TEXT_SURSA[s.stare]}</Badge>
          </li>
        ))}
      </ul>
      <button onClick={() => mergiLa("buget")} className="mt-2 text-[12.5px] font-semibold text-[var(--ci-primary)] hover:underline">Completează statisticile canalelor →</button>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section>
          <h4 className="text-[13px] font-semibold">Limite ale analizei</h4>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
            {rezultat.limitari.map((l) => <li key={l}>• {l}</li>)}
          </ul>
        </section>
        <section>
          <h4 className="text-[13px] font-semibold">Întrebări rămase</h4>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
            {rezultat.intrebari.map((l) => <li key={l}>• {l}</li>)}
          </ul>
        </section>
      </div>
    </Card>
  );
}

function Protectie() {
  return (
    <Card>
      <CardHeader title="Cum sunt protejate datele" />
      <ul className="grid gap-x-8 gap-y-1.5 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)] sm:grid-cols-2">
        <li>• Analiza este agregată: afișăm numărători și mediane, nu nume, emailuri sau donații ale unei persoane.</li>
        <li>• Grupurile sub 10 donatori nu se afișează, iar campaniile apar doar dacă au fost susținute de cel puțin 3 donatori din grup.</li>
        <li>• Nu deducem venitul, averea, sănătatea, religia sau alte informații sensibile și nu facem profiluri psihologice.</li>
        <li>• Cine vede pagina e stabilit de rolurile din organizație; lista donatorilor rămâne în CRM Persoane fizice, cu aceleași permisiuni.</li>
        <li>• Sunt folosite doar câmpurile necesare: suma, data, campania, acordul pentru email și starea abonamentului.</li>
        <li>• Respectăm dezabonările și acordurile: grupurile nu se contactează fără acord, indiferent de recomandare.</li>
      </ul>
    </Card>
  );
}
