"use client";

// Ilustrații ale panoului de administrare — patru ecrane desenate în HTML/CSS după designul real al platformei (meniu lateral,
// bară de sus cu „+ Adaugă”, carduri rotunjite, butoane tip pastilă), în culorile Alexandrit. Date DEMONSTRATIVE inventate:
// nu sunt capturi din contul vreunei organizații, deci nu expun nume de donatori sau firme reale.

import { useState, type ReactNode } from "react";

type Locale = "ro" | "en";
type Ecran = "acasa" | "companii" | "formular" | "echipa";

const ECRANE: { id: Ecran; ro: string; en: string; url: string }[] = [
  { id: "acasa", ro: "Acasă", en: "Home", url: "crm" },
  { id: "companii", ro: "Companii", en: "Companies", url: "crm/companii" },
  { id: "formular", ro: "Formular 230", en: "Form 230", url: "crm/donatori/formular-230" },
  { id: "echipa", ro: "Echipă și performanță", en: "Team & performance", url: "crm/performanta" },
];

const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-line bg-panel shadow-[0_1px_2px_rgba(20,33,61,0.05)] ${className}`}>{children}</div>
);

const Pill = ({ children, primary = false }: { children: ReactNode; primary?: boolean }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap ${
      primary ? "bg-brand-blue text-white" : "border border-line bg-panel text-ink"
    }`}
  >
    {children}
  </span>
);

const Tag = ({ children, tone }: { children: ReactNode; tone: "green" | "amber" | "blue" | "red" | "gray" }) => {
  const c = {
    green: "bg-brand-green/15 text-[#23743a]",
    amber: "bg-[#fef1d6] text-[#a35a05]",
    blue: "bg-brand-blue/10 text-brand-blue",
    red: "bg-[#fde4e4] text-[#b42323]",
    gray: "bg-panel-2 text-muted",
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${c}`}>{children}</span>;
};

const Bara = ({ v, tone = "blue" }: { v: number; tone?: "blue" | "green" | "amber" | "red" }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
    <div
      className={`h-full rounded-full ${{ blue: "bg-brand-blue", green: "bg-brand-green", amber: "bg-[#e49b1d]", red: "bg-[#d94a4a]" }[tone]}`}
      style={{ width: `${v}%` }}
    />
  </div>
);

const Titlu = ({ t, s }: { t: string; s?: string }) => (
  <div>
    <p className="font-display text-[16px] font-bold text-ink">{t}</p>
    {s && <p className="mt-0.5 text-[11.5px] text-muted-2">{s}</p>}
  </div>
);

function Acasa({ L }: { L: (ro: string, en: string) => string }) {
  const bare = [34, 48, 41, 57, 52, 69, 86];
  const luni = [L("Apr", "Apr"), L("Mai", "May"), L("Iun", "Jun"), L("Iul", "Jul"), L("Aug", "Aug"), L("Sep", "Sep"), L("Oct", "Oct")];
  return (
    <div className="space-y-3.5">
      <div className="rounded-3xl border border-line bg-gradient-to-r from-brand-blue/10 to-brand-green/10 px-5 py-4">
        <p className="font-display text-[20px] font-bold text-ink">{L("Bună ziua.", "Good morning.")}</p>
        <p className="mt-1 text-[12px] text-muted">
          {L("Astăzi ai ", "Today you have ")}
          <b className="text-ink">{L("5 acțiuni importante", "5 important actions")}</b>
          {L(" și ", " and ")}
          <b className="text-ink">{L("1 companie", "1 company")}</b>
          {L(" căreia trebuie să îi scrii sau să o suni din nou.", " you need to write to or call again.")}
        </p>
      </div>
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <Titlu t={L("Taskuri", "Tasks")} s={L("Sincronizate cu echipa", "Synced with the team")} />
          <span className="text-[11.5px] font-semibold text-brand-blue">{L("Vezi toate →", "View all →")}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            [L("Azi", "Today"), "1", "text-[#2563eb]"],
            [L("Întârziate", "Overdue"), "2", "text-[#dc2626]"],
            [L("Programate", "Scheduled"), "18", "text-ink"],
            [L("Închise", "Closed"), "1", "text-brand-green"],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-2xl border border-line px-3.5 py-3">
              <p className="text-[11px] text-muted-2">{l}</p>
              <p className={`font-display mt-1 text-[24px] leading-none font-extrabold ${c}`}>{v}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-3.5 md:grid-cols-5">
        <Card className="p-4 md:col-span-3">
          <Titlu t={L("Donații pe luni", "Donations by month")} s={L("Ultimele 7 luni", "Last 7 months")} />
          <div className="mt-3 flex h-28 items-end gap-2.5">
            {bare.map((h, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className={`w-full rounded-t-lg ${i === bare.length - 1 ? "bg-brand-green" : "bg-brand-blue/25"}`} style={{ height: `${h}%` }} />
                </div>
                <span className="text-[10px] text-muted-2">{luni[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 md:col-span-2">
          <Titlu t={L("Pipeline companii", "Company pipeline")} />
          <div className="mt-3 space-y-2.5">
            {[
              [L("Prima abordare", "First contact"), 84, "blue"],
              [L("În discuții", "In talks"), 52, "blue"],
              [L("Propunere trimisă", "Proposal sent"), 31, "amber"],
              [L("Sponsor", "Sponsor"), 17, "green"],
            ].map(([l, v, t]) => (
              <div key={String(l)}>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>{l}</span>
                  <b className="text-ink tabular-nums">{v}</b>
                </div>
                <Bara v={Number(v)} tone={t as "blue" | "amber" | "green"} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Companii({ L }: { L: (ro: string, en: string) => string }) {
  const stats: [string, string, boolean?][] = [
    [L("Companii", "Companies"), "128"],
    [L("Sponsorizări", "Sponsorships"), "41"],
    [L("Total sponsorizat", "Total sponsored"), "412.650 RON", true],
    [L("Recurenți", "Recurring"), "9 · 22%"],
    [L("Medie / sponsorizare", "Avg. / sponsorship"), "10.065 RON"],
    [L("Medie / companie", "Avg. / company"), "3.224 RON"],
  ];
  const firme: [string, string, string, "green" | "amber" | "blue" | "gray"][] = [
    ["NORDTECH SOLUTIONS S.R.L.", L("vizitat acum 2 zile", "visited 2 days ago"), "45.000 RON", "green"],
    ["VERDE RETAIL S.R.L.", L("propunere trimisă", "proposal sent"), "30.000 RON", "amber"],
    ["ARCADIA FARM S.R.L.", L("în discuții", "in talks"), "18.500 RON", "blue"],
    ["TRANSCARPAT LOGISTIC S.R.L.", L("de contactat", "to contact"), "—", "gray"],
  ];
  const eticheta = { green: L("Sponsor", "Sponsor"), amber: L("Cald", "Warm"), blue: L("În discuții", "In talks"), gray: L("Rece", "Cold") };
  return (
    <div className="space-y-3.5">
      <div>
        <p className="font-display text-[20px] font-bold text-ink">{L("Companii", "Companies")}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-2">{L("128 firme în total · statistica de mai jos = sponsorizări în perioada selectată", "128 companies in total · statistics below = sponsorships in the selected period")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill primary>＋ {L("Adaugă firmă", "Add company")}</Pill>
        <Pill>{L("Calendar de lucru", "Work calendar")}</Pill>
        <Pill>{L("Top", "Top")}</Pill>
        <Pill>{L("Încarcă baza de date", "Import database")}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        {stats.map(([l, v, rosu]) => (
          <Card key={l} className="p-3">
            <p className="text-[9.5px] font-semibold tracking-wide text-muted-2 uppercase">{l}</p>
            <p className={`font-display mt-1.5 text-[14px] font-extrabold tabular-nums ${rosu ? "text-brand-blue" : "text-ink"}`}>{v}</p>
          </Card>
        ))}
      </div>
      <div className="rounded-full border border-line bg-panel px-4 py-2.5 text-[12px] text-muted-2">🔍 {L("Caută firma după nume…", "Search company by name…")}</div>
      <Card className="divide-y divide-line overflow-hidden">
        {firme.map(([n, s, v, t]) => (
          <div key={n} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold text-ink">{n}</p>
              <p className="mt-0.5 text-[11px] text-muted-2">{s}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Tag tone={t}>{eticheta[t]}</Tag>
              <span className="w-20 text-right text-[12px] font-semibold text-ink tabular-nums">{v}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Formular({ L }: { L: (ro: string, en: string) => string }) {
  return (
    <div className="space-y-3.5">
      <div>
        <p className="font-display text-[20px] font-bold text-ink">{L("Formularul 230", "Form 230")}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-2">{L("Redirecționarea de 3,5% din impozitul pe venit, primită de la donatori prin link-ul tău", "The 3.5% income-tax redirection received from donors through your link")}</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          [L("Total formulare", "Total submissions"), "412", "text-ink"],
          [L("Luna aceasta", "This month"), "27", "text-brand-blue"],
          [L("Distribuire 2 ani", "2-year option"), "268", "text-ink"],
        ].map(([l, v, c]) => (
          <Card key={l} className="p-3.5">
            <p className="text-[11px] text-muted-2">{l}</p>
            <p className={`font-display mt-1 text-[22px] leading-none font-extrabold tabular-nums ${c}`}>{v}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Titlu t={L("Borderouri ANAF", "ANAF batches")} s={L("Se completează automat, câte 50 de formulare pe borderou; după 50, se trece la borderoul următor.", "Filled automatically, 50 submissions per batch; after 50, the next batch opens.")} />
        </div>
        <div className="mt-3 space-y-2.5">
          <div className="rounded-2xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12.5px] font-bold text-ink">{L("Borderou nr. 3 · 2025", "Batch no. 3 · 2025")}</p>
                <p className="mt-0.5 text-[11px] text-muted-2">
                  43 / 50 {L("formulare", "submissions")} · <span className="font-semibold text-brand-blue">{L("în completare (7 locuri libere)", "filling (7 spots left)")}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill primary>📄 {L("PDF inteligent ANAF", "ANAF smart PDF")}</Pill>
                <Pill>Excel</Pill>
                <Pill>XML</Pill>
              </div>
            </div>
            <div className="mt-2.5">
              <Bara v={86} />
            </div>
          </div>
          <div className="rounded-2xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12.5px] font-bold text-ink">{L("Borderou nr. 2 · 2025", "Batch no. 2 · 2025")}</p>
                <p className="mt-0.5 text-[11px] text-muted-2">
                  50 / 50 {L("formulare", "submissions")} · <span className="font-semibold text-brand-green">{L("plin · depus la ANAF ✓", "full · filed with ANAF ✓")}</span>
                </p>
              </div>
              <div className="flex gap-1.5">
                <Pill>{L("PDF inteligent ANAF", "ANAF smart PDF")}</Pill>
                <Pill>Excel</Pill>
              </div>
            </div>
            <div className="mt-2.5">
              <Bara v={100} tone="green" />
            </div>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <Titlu t={L("Conturi beneficiare", "Beneficiary accounts")} />
        <div className="mt-2.5 divide-y divide-line text-[11.5px]">
          {[
            [L("Asociația ta · principal", "Your association · main"), "RO49 ···· 0075 9384", "318"],
            [L("Subcont · Proiect Copii", "Sub-account · Children project"), "RO12 ···· 4410 2207", "94"],
          ].map(([n, i, f]) => (
            <div key={n} className="flex items-center justify-between gap-3 py-2">
              <span className="font-semibold text-ink">{n}</span>
              <span className="hidden text-muted-2 sm:inline">{i}</span>
              <span className="text-muted-2">🔗 {L("link formular", "form link")}</span>
              <b className="text-ink tabular-nums">{f}</b>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Echipa({ L }: { L: (ro: string, en: string) => string }) {
  const obiective: [string, number, "green" | "amber" | "red", string][] = [
    [L("Donatori recurenți noi", "New recurring donors"), 78, "green", L("În grafic", "On track")],
    [L("Sponsorizări de la companii", "Corporate sponsorships"), 54, "amber", L("Atenție", "Watch")],
    [L("Formulare 230 colectate", "Form 230 collected"), 91, "green", L("În grafic", "On track")],
    [L("Proiecte raportate la timp", "Projects reported on time"), 33, "red", L("În urmă", "Behind")],
  ];
  const dep: [string, number][] = [
    [L("Fundraising", "Fundraising"), 76],
    [L("Comunicare", "Communications"), 62],
    [L("Programe", "Programs"), 48],
  ];
  return (
    <div className="space-y-3.5">
      <div>
        <p className="font-display text-[20px] font-bold text-ink">{L("Echipă și performanță", "Team & performance")}</p>
        <p className="mt-0.5 text-[11.5px] text-muted-2">{L("De la obiectivele organizației la munca de zi cu zi, într-un singur loc. Nu clasifică oamenii: arată progresul.", "From organization goals to daily work, in one place. It doesn't rank people: it shows progress.")}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[L("Prezentare", "Overview"), L("Obiective", "Goals"), L("Săptămâna", "This week"), L("Echipa", "Team"), L("Rapoarte", "Reports")].map((t, i) => (
          <span key={t} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${i === 0 ? "bg-brand-blue text-white" : "border border-line bg-panel text-muted"}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="grid gap-3.5 md:grid-cols-5">
        <Card className="p-4 md:col-span-2">
          <p className="text-[11px] text-muted-2">{L("Progres general · T4 2026", "Overall progress · Q4 2026")}</p>
          <p className="font-display mt-1 text-[38px] leading-none font-extrabold text-brand-blue tabular-nums">64%</p>
          <p className="mt-1.5 text-[11px] text-muted">{L("Media celor 12 obiective cu date", "Average of the 12 goals with data")}</p>
          <div className="mt-3">
            <Bara v={64} />
          </div>
          <div className="mt-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-ink">{L("Progres pe departamente", "Progress by department")}</p>
            {dep.map(([n, v]) => (
              <div key={n}>
                <div className="mb-1 flex justify-between text-[11px] text-muted">
                  <span>{n}</span>
                  <b className="text-ink tabular-nums">{v}%</b>
                </div>
                <Bara v={v} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4 md:col-span-3">
          <Titlu t={L("Obiectivele strategice", "Strategic goals")} s={L("Progres față de ritmul așteptat azi", "Progress against today's expected pace")} />
          <div className="mt-3 space-y-3">
            {obiective.map(([n, v, t, e]) => (
              <div key={n}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink">{n}</span>
                  <span className="flex items-center gap-2">
                    <Tag tone={t === "green" ? "green" : t === "amber" ? "amber" : "red"}>{e}</Tag>
                    <b className="w-8 text-right text-[11.5px] text-ink tabular-nums">{v}%</b>
                  </span>
                </div>
                <Bara v={v} tone={t} />
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-brand-blue/8 px-3.5 py-3">
            <p className="text-[11px] font-semibold text-brand-blue">{L("Acțiune recomandată", "Recommended action")}</p>
            <p className="mt-0.5 text-[11.5px] text-muted">{L("2 raportări de proiect sunt întârziate — stabilește un termen cu responsabilul.", "2 project reports are overdue — agree a deadline with the owner.")}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

const NAV: { grup: [string, string]; items: [Ecran | null, string, string][] }[] = [
  {
    grup: ["PERSOANE ȘI ORGANIZAȚII", "PEOPLE & ORGANIZATIONS"],
    items: [
      [null, "CRM Companii", "Company CRM"],
      [null, "Companii D177", "D177 companies"],
      [null, "CRM persoane fizice", "Individual donors"],
      [null, "Formularul 230", "Form 230"],
      [null, "CRM Voluntari", "Volunteer CRM"],
    ],
  },
  {
    grup: ["STRÂNGERE DE FONDURI", "FUNDRAISING"],
    items: [
      [null, "Donații", "Donations"],
      [null, "Strângere fonduri", "Fundraising pages"],
      [null, "Fonduri și plăți", "Funds & payments"],
    ],
  },
];

// Care intrare din meniu e activă pe fiecare ecran.
const ACTIV: Record<Ecran, string> = { acasa: "Acasă", companii: "CRM Companii", formular: "Formularul 230", echipa: "Echipă și performanță" };

export function PanouPreview({ locale }: { locale: Locale }) {
  const [ecran, setEcran] = useState<Ecran>("acasa");
  const L = (ro: string, en: string) => (locale === "ro" ? ro : en);
  const curent = ECRANE.find((e) => e.id === ecran)!;
  const activ = ACTIV[ecran];

  const item = (ro: string, en: string) => (
    <li
      key={ro}
      className={`rounded-full px-3 py-1.5 text-[11.5px] ${ro === activ ? "bg-brand-blue/10 font-semibold text-brand-blue" : "text-muted"}`}
    >
      {locale === "ro" ? ro : en}
    </li>
  );

  return (
    <section className="px-[6%] pt-4 pb-16">
      <h2 className="font-display mx-auto max-w-2xl text-center text-[26px] font-bold text-ink sm:text-[30px]">{L("Panoul tău de lucru, într-o privire", "Your workspace at a glance")}</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-[14.5px] leading-relaxed text-muted">
        {L("Companii, donatori, formulare 230 și obiectivele echipei — într-un singur loc, clar și fără foi de calcul.", "Companies, donors, Form 230 and team goals — in one clear place, no spreadsheets.")}
      </p>

      <div role="tablist" aria-label={L("Ecrane din panou", "Panel screens")} className="mx-auto mt-7 flex max-w-5xl flex-wrap justify-center gap-2">
        {ECRANE.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={e.id === ecran}
            onClick={() => setEcran(e.id)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              e.id === ecran ? "bg-brand-blue text-white" : "border border-line bg-panel text-muted hover:text-ink"
            }`}
          >
            {locale === "ro" ? e.ro : e.en}
          </button>
        ))}
      </div>

      <div
        role="img"
        aria-label={L("Ilustrație a panoului de administrare, cu date demonstrative", "Illustration of the admin panel, with demo data")}
        className="mx-auto mt-6 max-w-5xl overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_70px_-30px_rgba(17,52,95,0.45)]"
      >
        <div className="flex items-center gap-3 border-b border-line bg-panel-2 px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto max-w-[70%] truncate rounded-md bg-panel px-3 py-1 text-[11px] text-muted-2">alexandrit.ro/{L("organizatia-ta", "your-organization")}/{curent.url}</span>
        </div>

        <div className="flex">
          <aside className="hidden w-52 shrink-0 border-r border-line bg-panel p-3 md:block" aria-hidden="true">
            <div className="mb-2 flex items-center gap-2 px-2 py-2">
              <span className="h-5 w-5 rounded-md bg-brand-blue" />
              <span className="font-display text-[12.5px] font-bold text-ink">{L("Organizația ta", "Your organization")}</span>
            </div>
            <ul className="space-y-0.5">
              {item("Acasă", "Home")}
            </ul>
            {NAV.map((g) => (
              <div key={g.grup[0]} className="mt-3">
                <p className="px-3 pb-1 text-[9.5px] font-bold tracking-wider text-muted-2">{locale === "ro" ? g.grup[0] : g.grup[1]}</p>
                <ul className="space-y-0.5">{g.items.map(([, ro, en]) => item(ro, en))}</ul>
              </div>
            ))}
            <div className="mt-3">
              <p className="px-3 pb-1 text-[9.5px] font-bold tracking-wider text-muted-2">{L("ECHIPĂ", "TEAM")}</p>
              <ul className="space-y-0.5">{item("Echipă și performanță", "Team & performance")}</ul>
            </div>
          </aside>

          <div className="min-w-0 flex-1 bg-canvas" aria-hidden="true">
            <div className="flex items-center justify-end gap-3 border-b border-line bg-panel px-4 py-2.5">
              <Pill primary>＋ {L("Adaugă", "Add")}</Pill>
              <span className="h-6 w-6 rounded-full border border-line" />
              <span className="h-6 w-6 rounded-full border border-line" />
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">M</span>
            </div>
            <div className="p-3.5 sm:p-5 md:min-h-[700px]">
              {ecran === "acasa" && <Acasa L={L} />}
              {ecran === "companii" && <Companii L={L} />}
              {ecran === "formular" && <Formular L={L} />}
              {ecran === "echipa" && <Echipa L={L} />}
            </div>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-5xl text-center text-[12px] text-muted-2">{L("Ecrane ilustrative, cu date demonstrative.", "Illustrative screens with demo data.")}</p>
    </section>
  );
}
