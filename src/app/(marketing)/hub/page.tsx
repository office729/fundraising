import Link from "next/link";

const HERO_STATS = [
  { v: "28M €", l: "strânși pentru cauze umanitare" },
  { v: "14+ ani", l: "experiență în fundraising" },
  { v: "100", l: "ONG-uri — obiectivul pe 2 ani" },
  { v: "690+", l: "campanii coordonate" },
];

type Plan = {
  nume: string;
  tag: string;
  pret: string;
  citat: string;
  desc: string;
  cta: string;
  popular?: boolean;
  items: string[];
};

const ABONAMENTE: Plan[] = [
  {
    nume: "START",
    tag: "Pentru ONG-uri aflate la început",
    pret: "49 lei",
    citat: "Pune ordine în activitatea de fundraising și începe să construiești relații cu donatorii și companiile.",
    desc: "Include CRM pentru persoane fizice și juridice, organizarea activității, șabloane de newsletter, One Pager și generarea documentelor de sponsorizare.",
    cta: "Începe acum",
    items: [
      "1 utilizator",
      "CRM persoane fizice — 1.000 contacte",
      "CRM persoane juridice — 50 companii",
      "Istoric donații și interacțiuni",
      "Program de lucru individual",
      "Generator One Pager — 1 activ",
      "3 rapoarte pentru companii / lună",
      "Bibliotecă standard de newsletter",
      "5 contracte sponsorizare 20% / lună",
      "5 documente D177 / lună",
      "Export PDF/Excel",
      "Personalizare de bază",
      "Suport prin e-mail",
    ],
  },
  {
    nume: "CREȘTERE",
    tag: "Recomandat pentru majoritatea ONG-urilor",
    pret: "149 lei",
    citat: "Transformă contactele în donatori, companiile în sponsori și activitatea organizației în rezultate măsurabile.",
    desc: "Include toate instrumentele Fundraising Academy, acces pentru trei membri ai echipei, baze de date mai mari, rapoarte pentru sponsori și documente nelimitate.",
    cta: "Alege pachetul recomandat",
    popular: true,
    items: [
      "3 utilizatori",
      "CRM persoane fizice — 10.000 contacte",
      "CRM persoane juridice — 2.000 companii",
      "Istoric donații și interacțiuni",
      "Program de lucru pentru echipă",
      "Generator One Pager — 5 active",
      "15 rapoarte pentru companii / lună",
      "Bibliotecă completă de newsletter",
      "Contracte sponsorizare 20% nelimitate",
      "Documente D177 nelimitate",
      "Export PDF/Excel",
      "Personalizare completă cu identitatea ONG-ului",
      "Suport prioritar",
    ],
  },
  {
    nume: "IMPACT",
    tag: "Pentru ONG-uri cu echipe și campanii multiple",
    pret: "299 lei",
    citat: "Coordonează întreaga activitate de fundraising dintr-un singur loc și dezvoltă organizația fără haos administrativ.",
    desc: "Include acces pentru zece utilizatori, baze extinse de donatori și companii, generări nelimitate, personalizare completă și suport prioritar.",
    cta: "Crește impactul organizației",
    items: [
      "10 utilizatori",
      "CRM persoane fizice — 50.000 contacte",
      "CRM persoane juridice — 10.000 companii",
      "Istoric donații și interacțiuni",
      "Program de lucru pentru echipă + roluri",
      "Generator One Pager nelimitat",
      "Rapoarte pentru companii nelimitate",
      "Newsletter complete și personalizabile",
      "Contracte sponsorizare 20% nelimitate",
      "Documente D177 nelimitate",
      "Export PDF/Excel",
      "Personalizare completă cu identitatea ONG-ului",
      "Suport prioritar + sesiune lunară",
    ],
  },
];

const COMPARATIE: { f: string; v0: string; v1: string; v2: string }[] = [
  { f: "Preț lunar", v0: "49 lei", v1: "149 lei", v2: "299 lei" },
  { f: "Utilizatori incluși", v0: "1", v1: "3", v2: "10" },
  { f: "CRM persoane fizice", v0: "1.000 contacte", v1: "10.000 contacte", v2: "50.000 contacte" },
  { f: "CRM persoane juridice", v0: "50 companii", v1: "2.000 companii", v2: "10.000 companii" },
  { f: "Istoric donații și interacțiuni", v0: "✓", v1: "✓", v2: "✓" },
  { f: "Program și plan de lucru", v0: "Individual", v1: "Pentru echipă", v2: "Pentru echipă + roluri" },
  { f: "Generator One Pager", v0: "1 activ", v1: "5 active", v2: "Nelimitat" },
  { f: "Rapoarte pentru companii", v0: "3/lună", v1: "15/lună", v2: "Nelimitat" },
  { f: "Șabloane newsletter PF și PJ", v0: "Bibliotecă standard", v1: "Bibliotecă completă", v2: "Complete + personalizabile" },
  { f: "Contract sponsorizare 20%", v0: "5/lună", v1: "Nelimitat", v2: "Nelimitat" },
  { f: "Contract și documente D177", v0: "5/lună", v1: "Nelimitat", v2: "Nelimitat" },
  { f: "Export PDF/Excel", v0: "✓", v1: "✓", v2: "✓" },
  { f: "Personalizare cu identitatea ONG-ului", v0: "De bază", v1: "Completă", v2: "Completă" },
  { f: "Suport", v0: "E-mail", v1: "Prioritar", v2: "Prioritar + sesiune lunară" },
];

// Prețuri de pornire publicate de furnizori (SUA), convertite în lei la
// cursul BNR aproximativ din august 2026 (~4,50 RON/USD), rotunjite. Sursă
// pentru fiecare preț: pagina proprie de pricing a furnizorului.
const COMPARATIE_INTERNATIONALA: { nume: string; pretUsd: string; pretRon: string; nota: string }[] = [
  { nume: "NationBuilder", pretUsd: "$34/lună", pretRon: "~155 lei/lună", nota: "până la 5.000 contacte" },
  { nume: "Little Green Light", pretUsd: "$45/lună", pretRon: "~205 lei/lună", nota: "până la 2.500 contacte" },
  { nume: "Neon CRM", pretUsd: "$99/lună", pretRon: "~445 lei/lună", nota: "plan de bază" },
  { nume: "Bloomerang", pretUsd: "$125/lună", pretRon: "~565 lei/lună", nota: "+ module separate (fundraising, voluntari)" },
  { nume: "Virtuous", pretUsd: "de la $199/lună", pretRon: "de la ~900 lei/lună", nota: "+ 2,9% comision pe donații" },
  { nume: "Salesforce Nonprofit Cloud", pretUsd: "1.000$+/lună", pretRon: "4.500+ lei/lună", nota: "+ implementare 10.000–50.000 $" },
];

const CONSULTANTA = [
  "60 de minute, online, 1 la 1 cu Vlad Plăcintă",
  "Audit al campaniilor și canalelor tale actuale",
  "Plan de acțiune concret, primit în scris după sesiune",
];

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative flex flex-col gap-3.5 rounded-2xl border bg-panel p-7 ${
        plan.popular ? "border-2 border-brand-green shadow-[0_12px_32px_rgba(63,168,92,0.16)]" : "border-line"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-4 py-1 text-xs font-extrabold tracking-wide whitespace-nowrap text-white">
          CEL MAI POPULAR
        </div>
      )}
      <div className="text-[12.5px] font-extrabold tracking-wide text-brand-green uppercase">{plan.tag}</div>
      <h3 className="font-display text-[22px] font-bold text-ink">
        {plan.nume} — {plan.pret}/lună
      </h3>
      <p className="text-[15px] leading-relaxed text-ink italic">&bdquo;{plan.citat}&rdquo;</p>
      <p className="text-[14.5px] leading-relaxed text-muted">{plan.desc}</p>
      <div className="flex flex-1 flex-col gap-2 border-t border-line pt-3.5">
        {plan.items.map((item) => (
          <div key={item} className="flex gap-2 text-[13.5px] leading-relaxed text-body">
            <span className="flex-none font-extrabold text-brand-green">✓</span>
            {item}
          </div>
        ))}
      </div>
      <Link
        href="/signup"
        className={`rounded-md py-3 text-center font-bold transition ${
          plan.popular
            ? "bg-brand-green text-white hover:bg-brand-green-hover"
            : "border border-brand-blue text-brand-blue hover:border-brand-blue-hover hover:text-brand-blue-hover"
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

export default function HubPage() {
  return (
    <main>
      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-12 bg-brand-blue px-[6%] py-20 text-white md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:py-24">
        <div>
          <span className="inline-block rounded-full border border-brand-green/50 bg-brand-green/20 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#9ce2af] uppercase">
            Nou · Instrumente contra cost
          </span>
          <h1 className="font-display mt-5 text-4xl leading-tight font-bold text-balance sm:text-[46px]">
            Hub Fundraising — instrumentele care îți cresc campaniile
          </h1>
          <p className="mt-[18px] max-w-xl text-lg leading-relaxed text-white/75">
            Ghiduri, template-uri, calculatoare interactive și o comunitate privată — construite pe experiența a peste
            22 de milioane de euro strânși pentru cauze reale.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3.5">
            <a
              href="#abonamente"
              className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
            >
              Vezi pachetele
            </a>
            <Link
              href="/portofoliu-clienti"
              className="rounded-md border-[1.5px] border-[#2e639b] px-7 py-3.5 font-bold text-white transition hover:border-white"
            >
              Portofoliu clienți
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {HERO_STATS.map((s) => (
            <div key={s.l} className="rounded-[10px] border border-white/10 bg-white/5 p-[22px]">
              <div className="font-display text-[28px] font-extrabold">{s.v}</div>
              <div className="mt-1 text-sm text-white/75">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Abonamente */}
      <section id="abonamente" className="px-[6%] py-[70px]">
        <div className="mx-auto mb-5 max-w-[760px] text-center">
          <h2 className="font-display text-[32px] font-bold text-ink">Abonamente Fundraising Academy</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Instrumentele esențiale sunt incluse în toate pachetele. Diferența se face prin numărul de utilizatori,
            dimensiunea bazelor de date și nivelul de automatizare — niciun ONG nu cumpără un abonament „incomplet&rdquo;.
          </p>
          <p className="mt-2 text-base leading-relaxed text-muted">
            Pornim de la 49 lei/lună — mai puțin decât un abonament de streaming — ca orice ONG din România, indiferent
            de mărime sau vechime, să-și poată permite instrumentele potrivite din prima zi.
          </p>
        </div>

        <div className="mx-auto mb-11 grid max-w-[1200px] grid-cols-1 items-stretch gap-[22px] md:grid-cols-3">
          {ABONAMENTE.map((plan) => (
            <PricingCard key={plan.nume} plan={plan} />
          ))}
        </div>

        <div className="mx-auto mb-5 max-w-[1200px] overflow-auto rounded-xl border border-line bg-panel">
          <div className="grid min-w-[700px] grid-cols-[1.6fr_1fr_1fr_1fr] bg-brand-blue">
            <div className="font-display p-4 text-[13.5px] font-bold text-white">Funcționalitate</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">START</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">CREȘTERE</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">IMPACT</div>
          </div>
          {COMPARATIE.map((row) => (
            <div key={row.f} className="grid min-w-[700px] grid-cols-[1.6fr_1fr_1fr_1fr] border-t border-line text-[13.5px]">
              <div className="p-3 px-4 font-semibold text-brand-blue">{row.f}</div>
              <div className="p-3 px-4 text-center text-body">{row.v0}</div>
              <div className="p-3 px-4 text-center text-body">{row.v1}</div>
              <div className="p-3 px-4 text-center text-body">{row.v2}</div>
            </div>
          ))}
        </div>

        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-[22px] sm:grid-cols-2">
          <div className="rounded-xl border border-line p-[26px]">
            <h3 className="font-display mb-3 text-[17px] font-bold text-ink">Abonamente anuale — 2 luni gratuite</h3>
            <div className="flex flex-col gap-2 text-[14.5px] text-body">
              <div>
                START: <strong>490 lei/an</strong>
              </div>
              <div>
                CREȘTERE: <strong>1.490 lei/an</strong>
              </div>
              <div>
                IMPACT: <strong>2.990 lei/an</strong>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-line p-[26px]">
            <h3 className="font-display mb-3 text-[17px] font-bold text-ink">Opțiuni suplimentare</h3>
            <div className="flex flex-col gap-2 text-[14.5px] text-body">
              <div>
                Utilizator suplimentar: <strong>29 lei/lună</strong>
              </div>
              <div>
                10.000 contacte PF suplimentare: <strong>25 lei/lună</strong>
              </div>
              <div>
                Migrare asistată a bazei de date: <strong>490 lei</strong>, o singură dată
              </div>
              <div>
                Configurare și instruire personalizată: <strong>590 lei</strong>
              </div>
              <div>
                Probă gratuită: <strong>14 zile</strong>, fără card
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-[1200px]">
          <h3 className="font-display text-xl font-bold text-ink">Cum ne raportăm la piața internațională</h3>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">
            Platformele CRM specializate pentru ONG-uri, folosite în SUA și Marea Britanie, pornesc frecvent de la
            câteva sute de lei pe lună și pot ajunge la mii — fără să acopere realitatea fiscală românească.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPARATIE_INTERNATIONALA.map((c) => (
              <div key={c.nume} className="rounded-xl border border-line bg-panel p-4">
                <p className="font-display text-sm font-bold text-ink">{c.nume}</p>
                <p className="mt-1 text-lg font-extrabold text-muted-2">{c.pretRon}</p>
                <p className="text-[12.5px] text-muted-2">
                  {c.pretUsd} · {c.nota}
                </p>
              </div>
            ))}
            <div className="rounded-xl border-2 border-brand-green bg-brand-green-soft p-4">
              <p className="font-display text-sm font-bold text-brand-green">Fundraising Academy</p>
              <p className="mt-1 text-lg font-extrabold text-ink">de la 49 lei/lună</p>
              <p className="text-[12.5px] text-ink/70">CRM complet, în română, adaptat pe D177 și sponsorizare 20%</p>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-2">
            Prețuri de pornire publicate de fiecare furnizor, convertite la cursul RON/USD din august 2026 (~4,50
            lei) — verifică oricând pagina proprie de prețuri a fiecărui furnizor pentru cifrele actualizate.
            Avantajul Fundraising Academy nu e doar prețul: e adaptarea completă la realitatea ONG-urilor din
            România — sponsorizarea prin 20%, Declarația 177, relația cu firmele și documentele în limba română.
          </p>
        </div>
      </section>

      {/* Consultanță */}
      <section id="consultanta" className="grid grid-cols-1 items-center gap-12 px-[6%] py-20 md:grid-cols-2 md:gap-[60px]">
        <div>
          <h2 className="font-display mb-4 text-[32px] font-bold text-ink">Consultanță premium 1 la 1</h2>
          <p className="mb-6 text-base leading-relaxed text-muted">
            Sesiuni individuale cu Vlad Plăcintă: audit al strategiei tale de fundraising, plan de campanie
            personalizat și acces direct la experiența acumulată în sute de campanii reale.
          </p>
          <div className="mb-7 flex flex-col gap-3">
            {CONSULTANTA.map((c) => (
              <div key={c} className="flex gap-3 text-[15px] leading-relaxed text-body">
                <span className="font-extrabold text-brand-green">✓</span>
                {c}
              </div>
            ))}
          </div>
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="inline-block rounded-md bg-brand-blue px-7 py-3.5 font-bold text-white transition hover:bg-brand-green"
          >
            Programează o sesiune — 5.000 lei (fără TVA)
          </a>
        </div>
        <div className="rounded-2xl border border-line bg-panel-2 p-[34px]">
          <p className="mb-5 text-[17px] leading-[1.7] text-body italic">
            &bdquo;Am primit sprijin și încurajare din partea domnului Vlad Plăcintă pe tot parcursul colaborării
            noastre, dar mai ales în momentele cele mai complicate.&rdquo;
          </p>
          <div className="font-extrabold text-ink">Alexandra Nadane</div>
          <div className="text-sm text-muted-2">Președinte — Centrele ROUA</div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-panel-2 px-[6%] py-16 text-center">
        <h2 className="font-display mb-3 text-[28px] font-bold text-ink">Nu știi de unde să începi?</h2>
        <p className="mx-auto mb-[26px] max-w-[480px] text-base text-muted">
          Scrie-ne și îți recomandăm instrumentele potrivite pentru etapa în care se află ONG-ul tău.
        </p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
          >
            vlad.placinta@fundrasingacademy.ro
          </a>
          <a
            href="tel:0752753540"
            className="rounded-md border-[1.5px] border-line px-7 py-3.5 font-bold text-brand-blue transition hover:border-brand-blue"
          >
            0752 753 540
          </a>
        </div>
      </section>
    </main>
  );
}
