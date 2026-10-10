"use client";

import { BookOpen, ExternalLink, FileText, MapPin, Globe, Sparkles } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { PLATFORME, VERIFICAT_LA, VOLUME, type Platforma, type Volum } from "@/lib/newsletter-platforme";

type Tip = "pf" | "pj";
type Filtru = "toate" | "ro" | "intl";

// Pagina unui generator de newsletter: o filă cu generatorul și o filă cu ghidul (ce e un newsletter, platforme, ce se potrivește la ce volum).
// Generatorul rămâne montat când ghidul e deschis, ca să nu se piardă ce ai scris.
export function NewsletterPagina({ tip, children }: { tip: Tip; children: ReactNode }) {
  const [fila, setFila] = useState<"generator" | "ghid">("generator");
  const id = useId();
  const file = [
    { cheie: "generator" as const, eticheta: "Generator", Icon: FileText },
    { cheie: "ghid" as const, eticheta: "Ghid: ce e un newsletter și unde îl trimiți", Icon: BookOpen },
  ];
  return (
    <div className="flex h-full flex-col bg-[var(--ci-bg)]">
      <div role="tablist" aria-label="Newsletter" className="ci-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 pt-2">
        {file.map(({ cheie, eticheta, Icon }) => (
          <button
            key={cheie}
            id={`${id}-${cheie}`}
            type="button"
            role="tab"
            aria-selected={fila === cheie}
            aria-controls={`${id}-${cheie}-p`}
            onClick={() => setFila(cheie)}
            className={`relative inline-flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${fila === cheie ? "text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
          >
            <Icon className="size-4" aria-hidden /> {eticheta}
            {fila === cheie && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-t bg-[var(--ci-primary)]" />}
          </button>
        ))}
      </div>
      <div id={`${id}-generator-p`} role="tabpanel" aria-labelledby={`${id}-generator`} hidden={fila !== "generator"} className="relative min-h-0 flex-1">
        <div className="absolute inset-0">{children}</div>
      </div>
      <div id={`${id}-ghid-p`} role="tabpanel" aria-labelledby={`${id}-ghid`} hidden={fila !== "ghid"} className="min-h-0 flex-1 overflow-y-auto">
        <Ghid tip={tip} />
      </div>
    </div>
  );
}

function Ghid({ tip }: { tip: Tip }) {
  const pj = tip === "pj";
  const [volum, setVolum] = useState<Volum | null>(null);
  const [filtru, setFiltru] = useState<Filtru>("toate");
  const selectat = VOLUME.find((v) => v.id === volum) ?? null;
  const lista = PLATFORME.filter((p) => filtru === "toate" || p.origine === filtru);

  const idei = pj
    ? [
        { titlu: "Ce este", text: "Un email trimis regulat unei liste de oameni care ți-au cerut să-i ții la curent. Spre deosebire de rețelele sociale, lista este a ta și nu depinde de un algoritm." },
        { titlu: "De ce contează pentru companii", text: "Ține vie relația cu partenerii între întâlniri: rezultate, repere ale parteneriatului, invitații la evenimente și oportunități de implicare. Costă puțin și arată seriozitate." },
        { titlu: "Ce pui în el", text: "Rezultate măsurabile (sume, proiecte, beneficiari), o poveste scurtă, următorul eveniment și un singur pas clar: o întâlnire, o ofertă sau raportul de impact." },
        { titlu: "Reguli de bază", text: "Păstrează un link de dezabonare vizibil și dovada că ai fost abordat legitim, chiar și pentru adrese de companii. Trimite la un ritm pe care îl poți ține: lunar sau trimestrial." },
      ]
    : [
        { titlu: "Ce este", text: "Un email trimis regulat unei liste de oameni care ți-au cerut să-i ții la curent. Spre deosebire de rețelele sociale, lista este a ta și nu depinde de un algoritm." },
        { titlu: "De ce contează pentru donatori", text: "Transformă o donație într-o relație: mulțumești, arăți ce s-a făcut cu banii și ceri, la momentul potrivit, următorul pas. Donatorii care primesc vești rămân și donează din nou." },
        { titlu: "Ce pui în el", text: "O poveste de impact, cât s-a strâns și cât a mai rămas, mulțumiri și un singur buton clar (donează, redirecționează, distribuie). Un subiect scurt și onest se deschide mai des." },
        { titlu: "Reguli de bază", text: "Cere acord explicit pentru emailuri (GDPR și legea comunicațiilor electronice), păstrează dovada lui, pune un link de dezabonare vizibil și trimite constant, de exemplu o dată pe lună." },
      ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-6 sm:px-6">
      <header>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{pj ? "Newsletter pentru companii: ghid" : "Newsletter pentru donatori: ghid"}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          Generezi newsletterul în fila „Generator”, apoi îl trimiți dintr-o platformă de email marketing. Aici găsești ce înseamnă un newsletter și ce platformă se potrivește, după câți abonați ai și cât vrei să plătești.
        </p>
      </header>

      <section aria-labelledby="g-ce-e">
        <h2 id="g-ce-e" className="mb-3 text-[15px] font-bold text-[var(--ci-text)]">Ce este un newsletter</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {idei.map((i) => (
            <div key={i.titlu} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
              <p className="text-[12px] font-bold tracking-wide text-[var(--ci-primary)] uppercase">{i.titlu}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ci-text)]">{i.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="g-volum">
        <h2 id="g-volum" className="mb-1 text-[15px] font-bold text-[var(--ci-text)]">Câți abonați ai?</h2>
        <p className="mb-3 text-[13px] text-[var(--ci-text-muted)]">Alege intervalul și vezi ce se potrivește și cât costă, orientativ.</p>
        <div role="group" aria-label="Număr de abonați" className="flex flex-wrap gap-2">
          {VOLUME.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={volum === v.id}
              onClick={() => setVolum(volum === v.id ? null : v.id)}
              className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${volum === v.id ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"}`}
            >
              {v.eticheta}
            </button>
          ))}
        </div>
        {selectat && (
          <div role="status" className="mt-3 grid grid-cols-1 gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-primary)]/30 bg-[var(--ci-primary-soft)] p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">Buget orientativ</p>
              <p className="ci-display text-xl font-bold text-[var(--ci-primary)]">{selectat.buget}</p>
            </div>
            <div className="min-w-0 text-[13px] leading-relaxed text-[var(--ci-text)]">
              <p>{selectat.sfat}</p>
              {pj && selectat.id === "s0" && <p className="mt-1.5 text-[var(--ci-text-muted)]">Listele de companii sunt de obicei mici (zeci sau sute de adrese), deci un plan gratuit sau cel mai mic plan plătit ajunge, iar personalizarea (numele firmei, ce au susținut) contează mai mult decât volumul.</p>}
              <p className="mt-1.5 font-medium">Se potrivesc: {PLATFORME.filter((p) => p.volume.includes(selectat.id)).map((p) => p.nume).join(", ")}.</p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="g-platforme">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="g-platforme" className="text-[15px] font-bold text-[var(--ci-text)]">Platforme din România și din lume</h2>
            <p className="text-[13px] text-[var(--ci-text-muted)]">Apasă pe un logo sau pe „Deschide site-ul” ca să vezi prețurile actuale.</p>
          </div>
          <div role="group" aria-label="Filtru după origine" className="flex rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-0.5">
            {([["toate", "Toate"], ["ro", "România"], ["intl", "Internațional"]] as const).map(([k, e]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filtru === k}
                onClick={() => setFiltru(k)}
                className={`rounded-[calc(var(--ci-radius-btn)-2px)] px-3 py-1.5 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${filtru === k ? "bg-[var(--ci-surface-2)] text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => (
            <Card key={p.id} p={p} potrivit={!volum || p.volume.includes(volum)} evidentiat={!!volum && p.volume.includes(volum)} />
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-bold text-[var(--ci-text)]"><Sparkles className="size-4 text-[var(--ci-primary)]" aria-hidden /> Cum alegi, pe scurt</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[var(--ci-text)]">
          <li>Dacă plătești <strong>pe abonat</strong> (MailerLite, Mailchimp, Kit), curăță periodic lista de inactivi. Dacă plătești <strong>pe emailuri trimise</strong> (Brevo, Sendmachine), ai avantaj când trimiți rar către o listă mare.</li>
          <li>Verifică să poți <strong>lipi propriul HTML</strong> sau un șablon cod, ca să folosești newsletterul făcut aici. Majoritatea platformelor permit asta, dar nu toate pe planul gratuit.</li>
          <li>Cere <strong>reducerea pentru ONG înainte de prima plată</strong>: la mai multe platforme nu se aplică retroactiv și cere dovada statutului (certificat de înregistrare).</li>
          <li>Pentru date personale, preferă un furnizor cu servere în UE sau cu acord de prelucrare a datelor (DPA) și păstrează dovada acordului abonaților.</li>
        </ul>
      </section>

      <p className="pb-4 text-[12px] text-[var(--ci-text-muted)]">
        Prețurile și reducerile sunt orientative, verificate în {VERIFICAT_LA} pe paginile furnizorilor sau în articole comparative, și se schimbă des. Confirmă-le la furnizor înainte să plătești. Logo-urile aparțin proprietarilor lor și sunt afișate doar pentru identificarea platformelor.
      </p>
    </div>
  );
}

// Logoul e un fișier local (public/logos-platforme): nu se trimit cereri către terți. Dacă nu se încarcă, rămâne litera platformei.
function Logo({ p }: { p: Platforma }) {
  const [eroare, setEroare] = useState(false);
  const lat = p.logoTip === "wordmark";
  if (eroare)
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ci-primary-soft)] text-base font-bold text-[var(--ci-primary)]" aria-hidden>
        {p.nume.slice(0, 1).toUpperCase()}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.logo}
      alt=""
      onError={() => setEroare(true)}
      className={lat ? "h-11 w-auto max-w-[9.5rem] shrink-0 rounded-lg border border-[var(--ci-border)] bg-white object-contain object-left px-2.5 py-2" : "size-11 shrink-0 rounded-xl border border-[var(--ci-border)] bg-white object-contain p-1.5"}
    />
  );
}

function Rand({ eticheta, text }: { eticheta: string; text: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 border-t border-[var(--ci-border)] py-1.5 text-[12.5px] first:border-t-0">
      <dt className="text-[var(--ci-text-muted)]">{eticheta}</dt>
      <dd className="text-[var(--ci-text)]">{text}</dd>
    </div>
  );
}

function Card({ p, potrivit, evidentiat }: { p: Platforma; potrivit: boolean; evidentiat: boolean }) {
  return (
    <li className={`flex min-w-0 flex-col rounded-[var(--ci-radius-card)] border bg-[var(--ci-surface)] p-4 transition-opacity ${evidentiat ? "border-[var(--ci-primary)] shadow-[var(--ci-card-shadow)]" : "border-[var(--ci-border)]"} ${potrivit ? "" : "opacity-55"}`}>
      <div className="flex items-start gap-3">
        <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Deschide site-ul ${p.nume}`} className="rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          <Logo p={p} />
        </a>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold text-[var(--ci-text)]">{p.nume}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ci-text-muted)]">
              {p.origine === "ro" ? <MapPin className="size-3" aria-hidden /> : <Globe className="size-3" aria-hidden />}
              {p.origine === "ro" ? "România" : "Internațional"}
            </span>
            {evidentiat && <span className="rounded-full bg-[var(--ci-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ci-primary)]">Se potrivește</span>}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--ci-text)]">{p.descriere}</p>
      <dl className="mt-3">
        <Rand eticheta="Gratuit" text={p.gratuit} />
        <Rand eticheta="Plătit" text={p.deLa} />
        <Rand eticheta="Se plătește" text={`după ${p.model}`} />
        <Rand eticheta="Reducere ONG" text={p.ong ?? "Nu am găsit o reducere publică"} />
      </dl>
      <p className="mt-3 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--ci-text)]">
        <span className="font-semibold">Potrivit pentru:</span> {p.potrivit}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1" aria-label="Volume potrivite">
          {VOLUME.map((v) => (
            <span key={v.id} className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${p.volume.includes(v.id) ? "bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-faint)] line-through"}`}>
              {v.eticheta}
            </span>
          ))}
        </div>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--ci-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          Deschide site-ul <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </li>
  );
}
