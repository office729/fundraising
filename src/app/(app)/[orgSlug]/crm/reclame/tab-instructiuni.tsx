"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { FEREASTRA_IMPLICITA_ZILE, MODEL_ATRIBUIRE } from "@/lib/reclame/atribuire";
import { DICTIONAR_METRICI, NOTE_LIMITE } from "@/lib/reclame/dictionar";
import { PARAMETRI_META } from "@/lib/reclame/utm";

import { Card } from "../components/ui/card";

function Cod({ text, limba }: { text: string; limba?: string }) {
  const [copiat, setCopiat] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-[var(--ci-surface-2)] p-3 pr-20 font-mono text-[12px] leading-relaxed text-[var(--ci-text)]" data-limba={limba}>
        {text}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopiat(true);
            setTimeout(() => setCopiat(false), 1800);
          } catch {
            // clipboard indisponibil: textul rămâne selectabil
          }
        }}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 py-1 text-[11.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
      >
        {copiat ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copiat ? "Copiat" : "Copiază"}
      </button>
    </div>
  );
}

function Pas({ n, titlu, children }: { n: number; titlu: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ci-primary)] text-[12px] font-bold text-white" aria-hidden>
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[14px] font-semibold text-[var(--ci-text)]">{titlu}</p>
        <div className="space-y-2 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{children}</div>
      </div>
    </li>
  );
}

const SQL_VERIFICARE = `-- ultimele donații, cu contextul de atribuire fixat la creare
select d.created_at, d.status, d.suma, a.clasa, a.platforma,
       a.utm_source, a.utm_medium, a.utm_campaign, a.utm_content,
       a.click_la, a.consimtamant, a.model
from fundraising_donations d
join donatie_atribuiri a on a.donatie_id = d.id
order by d.created_at desc
limit 10;`;

const FORMA_COST = `// Un rând = cheltuiala unei reclame într-o zi. Cheile goale înseamnă „nespecificat la această sursă”.
type RandCost = {
  ziua: string;            // "2026-10-05", în fusul contului publicitar
  cont: string;
  campanieCheie: string;   // id-ul de la platformă (altfel numele)
  campanieNume: string;
  setCheie: string;  setNume: string;
  reclamaCheie: string;  reclamaNume: string;
  plasament: string;       // ex. "facebook" / "instagram", dacă sursa îl dă
  cheltuialaMinor: number; // în bani, în moneda originală
  afisari: number | null;
  clicuri: number | null;  // clicuri pe link, nu toate clicurile
};
// Upsert idempotent pe (org, platformă, zi, cont, campanie, set, reclamă, plasament): vezi confirmaImportAction.`;

export function TabInstructiuni({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Cum funcționează măsurarea</h2>
        <ol className="grid gap-2.5 text-[13px] text-[var(--ci-text)] sm:grid-cols-5">
          {[
            ["Link cu coduri", "Fiecare reclamă duce la pagina de campanie printr-un link cu utm_source, utm_medium, utm_campaign."],
            ["Vizita", "Pagina numără vizita fără cookie-uri. Cu acordul pentru statistici, păstrează în browser ultimul clic eligibil, până la 30 de zile."],
            ["Donația începe", "La crearea donației (înainte de procesator) se fixează contextul: ultimul clic eligibil, nedirect."],
            ["Plata se confirmă", "Donația se numără doar după confirmarea procesatorului (webhook). Clicul pe „Donează” nu contează."],
            ["Raportul", "Costurile importate se compară cu donațiile atribuite, la nivel de platformă și campanie."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-2.5">
              <p className="text-[12px] font-bold text-[var(--ci-primary)]">{i + 1}. {t}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{d}</p>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-[var(--ci-text-muted)]">
          Model de atribuire: <strong className="text-[var(--ci-text)]">ultimul clic eligibil, nedirect</strong> ({MODEL_ATRIBUIRE}), fereastră implicită de {FEREASTRA_IMPLICITA_ZILE} zile. Traficul direct nu suprascrie un clic eligibil, iar un clic ulterior din email sau social organic ia locul unei reclame mai vechi. O donație are o singură sursă câștigătoare, deci totalul nu se dublează.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Pentru echipa de fundraising: de la zero la primul raport</h2>
        <ol className="space-y-5">
          <Pas n={1} titlu="Fă un link pentru fiecare reclamă">
            <p>În fila „Linkuri UTM” alege „Facebook, reclamă” (sau Instagram, TikTok, LinkedIn), lipește adresa paginii de donație și copiază linkul. Codul campaniei (cmp_026) și al materialului (cr_014) sunt neutre: nu scrie numele cazului sau al beneficiarului.</p>
          </Pas>
          <Pas n={2} titlu="Pune parametrii în reclamă (Meta)">
            <p>În Ads Manager, la nivelul reclamei, la „Destinație” (Website URL), completează câmpul „URL parameters” cu textul de mai jos. {"{{site_source_name}}"} e completat de Meta (fb, ig etc.), deci Facebook și Instagram rămân separate. După publicarea primei reclame, deschide linkul din reclamă și verifică în bara de adrese că parametrii sunt completați.</p>
            <Cod text={PARAMETRI_META("cmp_026", "cr_014")} />
          </Pas>
          <Pas n={3} titlu="Exportă costurile din Ads Manager">
            <p>Rapoarte → alege perioada → „Defalcare: Timp → Zi” → coloanele: Numele campaniei, Numele setului de reclame, Numele reclamei, Suma cheltuită, Afișări, Clicuri pe link → Exportă ca CSV. Reia exportul periodic (de exemplu săptămânal); reimportul aceleiași perioade înlocuiește rândurile, nu le dublează.</p>
          </Pas>
          <Pas n={4} titlu="Importă și leagă campaniile de coduri">
            <p>În fila „Import costuri” alege platforma și fișierul, verifică coloanele recunoscute și moneda, apoi scrie în dreptul fiecărei campanii codul UTM din linkuri (cmp_026). Fără cod, costul apare ca „nealocat”: intră în total, dar nu poate fi comparat cu donații.</p>
          </Pas>
          <Pas n={5} titlu="Verifică o donație de test">
            <p>Deschide linkul generat (cu codul cmp_test), fă o donație în contul Stripe al organizației aflat în mod test (card 4242 4242 4242 4242) și așteaptă confirmarea plății. În „Rezumat” apare la „Donații confirmate atribuite reclamelor” după webhook, chiar dacă codul nu e încă legat de o cheltuială (atunci rândul cere legarea). Dacă nu apare: vezi interogarea de mai jos și secțiunea „Calitatea datelor”.</p>
            <Cod limba="sql" text={SQL_VERIFICARE} />
          </Pas>
        </ol>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Pentru dezvoltatori: ce există în cod</h2>
        <div className="overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Parte</th>
                <th className="px-3 py-2 font-semibold">Unde</th>
              </tr>
            </thead>
            <tbody className="align-top text-[var(--ci-text)]">
              {[
                ["Tabele (RLS pe organizație)", "documentation/reclame.sql · src/lib/db/schema/reclame.ts: reclame_costuri, reclame_campanii, reclame_importuri, donatie_atribuiri, reclame_linkuri"],
                ["Aplicarea migrării", "node --env-file=.env.local scripts/aplica-reclame.mjs (idempotentă, rol migrator); politicile sunt și în scripts/restore-rls.mjs"],
                ["Captarea clicului (browser)", "src/lib/reclame/touch-client.ts: memoreazaTouch() la încărcarea paginii de campanie, touchPentruDonatie() pentru câmpul ascuns «atribuire» din formularul de donație"],
                ["Fixarea atribuirii (server)", "src/lib/reclame/inregistreaza-atribuire.ts, apelat după fiecare inserare de donație: strangere-fonduri/…/actions.ts (Checkout) și express-checkout-actions.ts (Apple/Google Pay, PayPal, Revolut; unic și recurent)"],
                ["Reguli de atribuire", "src/lib/reclame/atribuire.ts: curățarea codurilor, clasa traficului, platforma din sursă, fereastra; browserul nu e de încredere, clasa se recalculează pe server"],
                ["Confirmarea donațiilor", "Neschimbată: webhook-ul Stripe al fiecărei organizații (api/stripe/webhook/[orgSlug]) pune donația pe «reusita»; rapoartele numără doar reusita și rambursata"],
                ["Calcule și agregare", "src/lib/reclame/calcule.ts · raport.ts · csv-costuri.ts · export-csv.ts · dictionar.ts (toate pure, testate în tests/reclame.test.mjs)"],
                ["Interogări și acțiuni", `src/app/(app)/[orgSlug]/crm/reclame/{queries,actions}.ts; pagina: /${orgSlug}/crm/reclame (doar owner/admin, pachet IMPACT sau probă)`],
              ].map(([a, b]) => (
                <tr key={a} className="border-t border-[var(--ci-border)]">
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{a}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">Comenzi</p>
          <Cod limba="bash" text={`node --env-file=.env.local scripts/aplica-reclame.mjs   # creează tabelele și politicile RLS\nnpm test                                              # include tests/reclame.test.mjs\nnpx tsc --noEmit && npx eslint src tests --quiet`} />
        </div>

        <div className="space-y-2">
          <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">Cum adaugi o sursă de costuri (API sau alt export)</p>
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            Orice sursă produce rânduri în forma de mai jos și le scrie cu același upsert idempotent ca importul CSV (sursa = «api»). Raportul nu depinde de platformă: citește doar din reclame_costuri. Conexiunile sunt doar pentru citire; modulul nu modifică bugete și nu pornește sau oprește reclame.
          </p>
          <Cod limba="ts" text={FORMA_COST} />
        </div>

        <div className="space-y-1.5">
          <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">Variabile de mediu</p>
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            Modulul curent nu cere variabile noi. Folosește ORG_SECRETS_KEY (deja necesară pentru amprenta zilnică a traficului). NEXT_PUBLIC_META_PIXEL_ID rămâne opțională și independentă: Pixelul nu e sursa cheltuielilor, iar încărcarea lui cere acordul separat pentru publicitate.
          </p>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Consimțământ și date sensibile</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-[var(--ci-text-muted)]">
          <li>Fără acord pentru statistici nu se scrie nimic în browser. Atribuirea folosește doar parametrii UTM din adresa paginii în momentul donației, iar contextul se salvează ca «fara-stocare».</li>
          <li>Cu acord, ultimul clic eligibil se păstrează în browser (cheia fa_touch_v1): doar coduri UTM și momentul clicului, fără identificatori. Retragerea acordului îl șterge la următoarea vizită.</li>
          <li>Refuzul nu blochează donația. Nimic din acest modul nu trimite date către platformele de reclame: datele rămân în Alexandrit.</li>
          <li>Codurile din link nu trebuie să conțină nume de persoane, diagnostice sau alte date medicale; generatorul respinge orice în afara literelor mici, cifrelor și . _ : -.</li>
          <li>Dacă mai târziu se adaugă conversii trimise către Meta sau alte platforme, paginile medicale nu trebuie să trimită evenimente, iar numele și textul campaniilor nu trebuie să ajungă în URL, titluri sau parametri. Nu redenumi evenimentele și nu crea pagini neutre pentru a ocoli restricțiile.</li>
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Cum se calculează indicatorii</h2>
        <dl className="divide-y divide-[var(--ci-border)]">
          {DICTIONAR_METRICI.map((d) => (
            <div key={d.cheie} className="py-2.5">
              <dt className="text-[13.5px] font-semibold text-[var(--ci-text)]">{d.nume}</dt>
              <dd className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
                {d.formula}
                {d.nota && <span className="mt-0.5 block text-[12.5px]">{d.nota}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">Limite de știut și ce urmează</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-[var(--ci-text-muted)]">
          {NOTE_LIMITE.map((n) => (
            <li key={n}>{n}</li>
          ))}
          <li>
            Costurile intră acum prin import CSV. Citirea automată a costurilor și a conversiilor raportate (Meta Marketing API, TikTok, LinkedIn) nu e conectată în această versiune și cere conturi și permisiuni de citire pe care organizația le configurează; verifică versiunile și permisiunile în documentația oficială a fiecărei platforme înainte de conectare.
          </li>
          <li>Comparația cu primul contact și raportarea nativă a platformelor, prezentate separat de modelul intern, nu sunt implementate încă.</li>
        </ul>
      </Card>
    </div>
  );
}
