"use client";

// Ilustrații ale panoului de administrare — șapte ecrane desenate în HTML/CSS după designul real al platformei (bară de sus cu
// „+ Adaugă”, carduri rotunjite, butoane tip pastilă), în culorile Alexandrit. Date DEMONSTRATIVE inventate: nu sunt capturi din
// contul vreunei organizații, deci nu expun nume de donatori sau firme reale. Layout compact: pe ecran lat, lista de ecrane stă
// lângă fereastră; pe telefon, devine un rând de butoane care se derulează lateral, iar fereastra are înălțime fixă.

import { useState, type ReactNode } from "react";

type Locale = "ro" | "en";
type L = (ro: string, en: string) => string;
type Ecran = "acasa" | "companii" | "d177" | "donatori" | "fonduri" | "formular" | "instrumente" | "echipa";

const ECRANE: { id: Ecran; ro: string; en: string; roDesc: string; enDesc: string; url: string }[] = [
  { id: "acasa", ro: "Acasă", en: "Home", roDesc: "Ziua ta, pe scurt", enDesc: "Your day at a glance", url: "crm" },
  { id: "companii", ro: "Companii", en: "Companies", roDesc: "Pipeline și sponsorizări", enDesc: "Pipeline and sponsorships", url: "crm/companii" },
  { id: "d177", ro: "Companii D177", en: "D177 companies", roDesc: "Redirecționări de impozit pe profit", enDesc: "Profit-tax redirections", url: "crm/d177" },
  { id: "donatori", ro: "Persoane fizice", en: "Individual donors", roDesc: "Donatori, segmente, apeluri", enDesc: "Donors, segments, calls", url: "crm/donatori" },
  { id: "fonduri", ro: "Strângere de fonduri", en: "Fundraising", roDesc: "Pagini publice de campanie", enDesc: "Public campaign pages", url: "crm/strangere-fonduri" },
  { id: "formular", ro: "Formular 230", en: "Form 230", roDesc: "Borderouri ANAF automate", enDesc: "Automated ANAF batches", url: "crm/donatori/formular-230" },
  { id: "instrumente", ro: "Instrumente digitale", en: "Digital tools", roDesc: "Rapoarte, scrisori, certificate", enDesc: "Reports, letters, certificates", url: "crm/instrumente" },
  { id: "echipa", ro: "Echipă și performanță", en: "Team & performance", roDesc: "Obiective și progres", enDesc: "Goals and progress", url: "crm/performanta" },
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

type Ton = "green" | "amber" | "blue" | "red" | "gray";
const Tag = ({ children, tone }: { children: ReactNode; tone: Ton }) => {
  const c = {
    green: "bg-brand-green/15 text-[#23743a]",
    amber: "bg-[#fef1d6] text-[#a35a05]",
    blue: "bg-brand-blue/10 text-brand-blue",
    red: "bg-[#fde4e4] text-[#b42323]",
    gray: "bg-panel-2 text-muted",
  }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap ${c}`}>{children}</span>;
};

const Bara = ({ v, tone = "blue" }: { v: number; tone?: "blue" | "green" | "amber" | "red" }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-panel-2">
    <div className={`h-full rounded-full ${{ blue: "bg-brand-blue", green: "bg-brand-green", amber: "bg-[#e49b1d]", red: "bg-[#d94a4a]" }[tone]}`} style={{ width: `${v}%` }} />
  </div>
);

const Antet = ({ t, s }: { t: string; s: string }) => (
  <div>
    <p className="font-display text-[18px] leading-tight font-bold text-ink">{t}</p>
    <p className="mt-0.5 text-[11.5px] leading-snug text-muted-2">{s}</p>
  </div>
);

const Stat = ({ l, v, c = "text-ink" }: { l: string; v: string; c?: string }) => (
  <Card className="px-3 py-2.5">
    <p className="truncate text-[10px] font-semibold tracking-wide text-muted-2 uppercase">{l}</p>
    <p className={`font-display mt-1 truncate text-[16px] leading-none font-extrabold tabular-nums ${c}`}>{v}</p>
  </Card>
);

function Rand({ n, s, v, t, e }: { n: string; s: string; v?: string; t: Ton; e: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[12px] font-bold text-ink">{n}</p>
        <p className="truncate text-[11px] text-muted-2">{s}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Tag tone={t}>{e}</Tag>
        {v && <span className="hidden w-[78px] text-right text-[11.5px] font-semibold text-ink tabular-nums sm:inline">{v}</span>}
      </div>
    </div>
  );
}

function Acasa({ L }: { L: L }) {
  const bare = [34, 48, 41, 57, 52, 69, 86];
  const luni = ["Apr", L("Mai", "May"), L("Iun", "Jun"), L("Iul", "Jul"), "Aug", "Sep", "Oct"];
  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-line bg-gradient-to-r from-brand-blue/10 to-brand-green/10 px-4 py-3">
        <p className="font-display text-[18px] font-bold text-ink">{L("Bună ziua.", "Good morning.")}</p>
        <p className="mt-0.5 text-[11.5px] text-muted">
          {L("Astăzi ai ", "Today you have ")}
          <b className="text-ink">{L("5 acțiuni importante", "5 important actions")}</b>
          {L(" și ", " and ")}
          <b className="text-ink">{L("1 companie", "1 company")}</b>
          {L(" de contactat din nou.", " to contact again.")}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          [L("Azi", "Today"), "1", "text-[#2563eb]"],
          [L("Întârziate", "Overdue"), "2", "text-[#dc2626]"],
          [L("Programate", "Scheduled"), "18", "text-ink"],
          [L("Închise", "Closed"), "1", "text-brand-green"],
        ].map(([l, v, c]) => (
          <Card key={l} className="px-3 py-2.5">
            <p className="truncate text-[10.5px] text-muted-2">{l}</p>
            <p className={`font-display mt-0.5 text-[22px] leading-none font-extrabold ${c}`}>{v}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-5">
        <Card className="p-3.5 sm:col-span-3">
          <p className="text-[12px] font-semibold text-ink">{L("Donații pe luni", "Donations by month")}</p>
          <div className="mt-2.5 flex h-24 items-end gap-2">
            {bare.map((h, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div className={`w-full rounded-t-md ${i === bare.length - 1 ? "bg-brand-green" : "bg-brand-blue/25"}`} style={{ height: `${h}%` }} />
                </div>
                <span className="text-[10px] text-muted-2">{luni[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-2 p-3.5 sm:col-span-2">
          <p className="text-[12px] font-semibold text-ink">{L("Pipeline companii", "Company pipeline")}</p>
          {[
            [L("Prima abordare", "First contact"), 84],
            [L("În discuții", "In talks"), 52],
            [L("Sponsor", "Sponsor"), 17],
          ].map(([l, v]) => (
            <div key={String(l)}>
              <div className="mb-0.5 flex justify-between text-[11px] text-muted">
                <span>{l}</span>
                <b className="text-ink">{v}</b>
              </div>
              <Bara v={Number(v)} tone={Number(v) < 20 ? "green" : "blue"} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Companii({ L }: { L: L }) {
  return (
    <div className="space-y-3">
      <Antet t={L("Companii", "Companies")} s={L("128 firme în total · sponsorizări în perioada selectată", "128 companies · sponsorships in the selected period")} />
      <div className="flex flex-wrap gap-1.5">
        <Pill primary>＋ {L("Adaugă firmă", "Add company")}</Pill>
        <Pill>{L("Calendar de lucru", "Work calendar")}</Pill>
        <Pill>Top</Pill>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat l={L("Companii", "Companies")} v="128" />
        <Stat l={L("Total sponsorizat", "Total sponsored")} v="412.650 RON" c="text-brand-blue" />
        <Stat l={L("Recurenți", "Recurring")} v="9 · 22%" />
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        <Rand n="NORDTECH SOLUTIONS S.R.L." s={L("vizitat acum 2 zile", "visited 2 days ago")} v="45.000 RON" t="green" e="Sponsor" />
        <Rand n="VERDE RETAIL S.R.L." s={L("propunere trimisă", "proposal sent")} v="30.000 RON" t="amber" e={L("Cald", "Warm")} />
        <Rand n="ARCADIA FARM S.R.L." s={L("în discuții", "in talks")} v="18.500 RON" t="blue" e={L("În discuții", "In talks")} />
      </Card>
    </div>
  );
}

function D177({ L }: { L: L }) {
  return (
    <div className="space-y-3">
      <Antet t={L("Companii D177", "D177 companies")} s={L("Firme care pot redirecționa până la 20% din impozitul pe profit către organizația ta", "Companies that can redirect up to 20% of their profit tax to your organization")} />
      <div className="grid grid-cols-3 gap-2">
        <Stat l={L("Firme țintă", "Target firms")} v="64" />
        <Stat l={L("Au acceptat", "Agreed")} v="11" c="text-brand-green" />
        <Stat l={L("Estimat", "Estimated")} v="86.400 RON" c="text-brand-blue" />
      </div>
      <Card className="p-3.5">
        <p className="text-[12px] font-semibold text-ink">{L("Parcursul firmelor", "Company journey")}</p>
        <div className="mt-2 space-y-1.5">
          {[
            [L("De contactat", "To contact"), 64, "blue"],
            [L("Contactate", "Contacted"), 38, "blue"],
            [L("Acord verbal", "Verbal agreement"), 17, "amber"],
            [L("Declarație depusă", "Declaration filed"), 11, "green"],
          ].map(([l, v, t]) => (
            <div key={String(l)}>
              <div className="mb-0.5 flex justify-between text-[11px] text-muted">
                <span>{l}</span>
                <b className="text-ink tabular-nums">{v}</b>
              </div>
              <Bara v={(Number(v) / 64) * 100} tone={t as "blue" | "amber" | "green"} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Donatori({ L }: { L: L }) {
  const randuri: [string, string, string, string, Ton][] = [
    ["Maria P.", L("ultima donație acum 3 zile", "last gift 3 days ago"), "2.400 RON", L("Fidel", "Loyal"), "green"],
    ["Andrei D.", L("donează lunar", "monthly donor"), "1.080 RON", L("Recurent", "Recurring"), "blue"],
    ["Elena S.", L("ultima donație acum 8 luni", "last gift 8 months ago"), "350 RON", L("În risc", "At risk"), "red"],
  ];
  return (
    <div className="space-y-3">
      <Antet t={L("Persoane fizice", "Individual donors")} s={L("1.286 donatori · segmentați automat după comportament", "1,286 donors · segmented automatically by behavior")} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat l={L("Donatori", "Donors")} v="1.286" />
        <Stat l={L("Donații", "Gifts")} v="3.940" />
        <Stat l={L("Total donat", "Total given")} v="284.300 RON" c="text-brand-blue" />
        <Stat l={L("Recurenți", "Recurring")} v="212" c="text-brand-green" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[L("Toți", "All"), L("Recurenți", "Recurring"), L("Top donatori", "Top donors"), L("De sunat", "To call")].map((c, i) => (
          <span key={c} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${i === 0 ? "bg-brand-blue text-white" : "border border-line bg-panel text-muted"}`}>
            {c}
          </span>
        ))}
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        {randuri.map(([n, s, v, e, t]) => (
          <Rand key={n} n={n} s={s} v={v} t={t} e={e} />
        ))}
      </Card>
    </div>
  );
}

function Fonduri({ L }: { L: L }) {
  const pagini: [string, number, string, number][] = [
    [L("Operație pentru Mihai", "Surgery for Mihai"), 74, "18.400 / 25.000 RON", 213],
    [L("Echipament pentru cardiologie", "Cardiology ward equipment"), 41, "12.300 / 30.000 RON", 156],
    [L("Tabără pentru copiii din centrul de zi", "Camp for day-center children"), 100, "8.000 / 8.000 RON", 94],
  ];
  return (
    <div className="space-y-3">
      <Antet t={L("Strângere fonduri", "Fundraising")} s={L("Pagini publice unde oamenii pot dona; plățile trec prin Stripe", "Public pages where people can donate; payments go through Stripe")} />
      <div className="grid grid-cols-3 gap-2">
        <Stat l={L("Pagini active", "Active pages")} v="12" />
        <Stat l={L("Luna aceasta", "This month")} v="24.380 RON" c="text-brand-blue" />
        <Stat l={L("Donatori noi", "New donors")} v="86" c="text-brand-green" />
      </div>
      <Card className="divide-y divide-line overflow-hidden">
        {pagini.map(([n, v, s, d]) => (
          <div key={n} className="px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[12px] font-bold text-ink">{n}</p>
              <Tag tone={v === 100 ? "green" : "blue"}>{v === 100 ? L("Finalizată", "Completed") : `${v}%`}</Tag>
            </div>
            <div className="mt-1.5">
              <Bara v={v} tone={v === 100 ? "green" : "blue"} />
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-2">
              {s} · {d} {L("donatori", "donors")}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Formular({ L }: { L: L }) {
  return (
    <div className="space-y-3">
      <Antet t={L("Formularul 230", "Form 230")} s={L("Redirecționarea de 3,5% din impozitul pe venit, primită prin link-ul tău", "The 3.5% income-tax redirection received through your link")} />
      <div className="grid grid-cols-3 gap-2">
        <Stat l="Total" v="412" />
        <Stat l={L("Luna aceasta", "This month")} v="27" c="text-brand-blue" />
        <Stat l={L("2 ani", "2 years")} v="268" />
      </div>
      <Card className="p-3.5">
        <p className="text-[12px] font-semibold text-ink">{L("Borderouri ANAF", "ANAF batches")}</p>
        <div className="mt-2 space-y-2">
          <div className="rounded-2xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-bold text-ink">{L("Borderou nr. 3 · 2025", "Batch no. 3 · 2025")}</p>
                <p className="text-[11px] text-muted-2">
                  43 / 50 · <span className="font-semibold text-brand-blue">{L("7 locuri libere", "7 spots left")}</span>
                </p>
              </div>
              <Pill primary>📄 {L("PDF inteligent ANAF", "ANAF smart PDF")}</Pill>
            </div>
            <div className="mt-2">
              <Bara v={86} />
            </div>
          </div>
          <div className="rounded-2xl border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-bold text-ink">{L("Borderou nr. 2 · 2025", "Batch no. 2 · 2025")}</p>
                <p className="text-[11px] text-muted-2">
                  50 / 50 · <span className="font-semibold text-brand-green">{L("depus la ANAF ✓", "filed with ANAF ✓")}</span>
                </p>
              </div>
              <Pill>Excel</Pill>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Instrumente({ L }: { L: L }) {
  const unelte: [string, string, string][] = [
    [L("Rapoarte de impact", "Impact reports"), L("15 modele, logo-ul firmei, export PDF", "15 templates, company logo, PDF export"), "#3fa85c"],
    [L("Scrisori cu antet", "Letterhead letters"), L("Mulțumire, sponsorizare, parteneriat", "Thank-you, sponsorship, partnership"), "#3fa85c"],
    [L("Certificate", "Certificates"), L("Recunoștință, voluntariat, cu cod QR", "Recognition, volunteering, with QR code"), "#3fa85c"],
    [L("Newsletter", "Newsletters"), L("Pentru donatori și pentru companii", "For donors and for companies"), "#7c3aed"],
    [L("Generator one-pager", "One-pager generator"), L("O pagină editabilă cu cifre și contact", "An editable page with figures and contact"), "#dc2626"],
    [L("Semnătură digitală", "Email signature"), L("Semnătură de email unitară pentru echipă", "One email signature for the whole team"), "#154a85"],
  ];
  return (
    <div className="space-y-3">
      <Antet t={L("Instrumente digitale", "Digital tools")} s={L("Documente și materiale gata de trimis, cu identitatea organizației tale", "Ready-to-send documents and materials in your organization's identity")} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {unelte.map(([n, d, c], i) => (
          <Card key={n} className={`p-3 ${i > 3 ? "hidden sm:block" : ""}`}>
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />
              <span className="truncate">{n}</span>
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-2">{d}</p>
            <p className="mt-2 text-[11.5px] font-semibold text-brand-blue">{L("Deschide →", "Open →")}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Echipa({ L }: { L: L }) {
  const ob: [string, number, "green" | "amber" | "red", string][] = [
    [L("Donatori recurenți noi", "New recurring donors"), 78, "green", L("În grafic", "On track")],
    [L("Sponsorizări de la companii", "Corporate sponsorships"), 54, "amber", L("Atenție", "Watch")],
    [L("Proiecte raportate la timp", "Projects reported on time"), 33, "red", L("În urmă", "Behind")],
  ];
  return (
    <div className="space-y-3">
      <Antet t={L("Echipă și performanță", "Team & performance")} s={L("De la obiectivele organizației la munca de zi cu zi. Nu clasifică oamenii: arată progresul.", "From organization goals to daily work. It doesn't rank people: it shows progress.")} />
      <div className="grid gap-2.5 sm:grid-cols-5">
        <Card className="p-3.5 sm:col-span-2">
          <p className="text-[11px] text-muted-2">{L("Progres general · T4", "Overall progress · Q4")}</p>
          <p className="font-display mt-0.5 text-[34px] leading-none font-extrabold text-brand-blue">64%</p>
          <div className="mt-2.5">
            <Bara v={64} />
          </div>
          <p className="mt-2 text-[11px] text-muted">{L("Media celor 12 obiective cu date", "Average of the 12 goals with data")}</p>
        </Card>
        <Card className="space-y-2.5 p-3.5 sm:col-span-3">
          <p className="text-[12px] font-semibold text-ink">{L("Obiectivele strategice", "Strategic goals")}</p>
          {ob.map(([n, v, t, e]) => (
            <div key={n}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[11.5px] font-semibold text-ink">{n}</span>
                <Tag tone={t}>{e}</Tag>
              </div>
              <Bara v={v} tone={t} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function PanouPreview({ locale }: { locale: Locale }) {
  const [ecran, setEcran] = useState<Ecran>("acasa");
  const L: L = (ro, en) => (locale === "ro" ? ro : en);
  const curent = ECRANE.find((e) => e.id === ecran)!;

  return (
    <section className="px-[6%] pt-2 pb-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[24px] font-bold text-ink sm:text-[28px]">{L("Panoul tău de lucru, într-o privire", "Your workspace at a glance")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[14px] leading-relaxed text-muted">
          {L("Companii, donatori, campanii, formulare 230 și obiectivele echipei — într-un singur loc, fără foi de calcul.", "Companies, donors, campaigns, Form 230 and team goals — in one place, no spreadsheets.")}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6">
          {/* Lista ecranelor: rând derulabil pe telefon/tabletă, coloană pe ecran lat */}
          <div
            role="tablist"
            aria-label={L("Ecrane din panou", "Panel screens")}
            className="-mx-[6%] flex gap-2 overflow-x-auto px-[6%] pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {ECRANE.map((e) => {
              const activ = e.id === ecran;
              return (
                <button
                  key={e.id}
                  role="tab"
                  aria-selected={activ}
                  onClick={() => setEcran(e.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-left text-[13px] font-semibold transition lg:rounded-2xl lg:px-4 lg:py-2.5 ${
                    activ ? "bg-brand-blue text-white" : "border border-line bg-panel text-muted hover:text-ink"
                  }`}
                >
                  <span className="block whitespace-nowrap lg:whitespace-normal">{locale === "ro" ? e.ro : e.en}</span>
                  <span className={`mt-0.5 hidden text-[11.5px] font-normal lg:block ${activ ? "text-white/80" : "text-muted-2"}`}>{locale === "ro" ? e.roDesc : e.enDesc}</span>
                </button>
              );
            })}
          </div>

          <div
            role="img"
            aria-label={L("Ilustrație a panoului de administrare, cu date demonstrative", "Illustration of the admin panel, with demo data")}
            className="relative min-w-0 overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_24px_60px_-30px_rgba(17,52,95,0.45)]"
          >
            <div className="flex items-center gap-3 border-b border-line bg-panel-2 px-3.5 py-2">
              <span className="flex gap-1.5" aria-hidden="true">
                <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="mx-auto min-w-0 max-w-[75%] truncate rounded-md bg-panel px-3 py-1 text-[11px] text-muted-2">
                alexandrit.ro/{L("organizatia-ta", "your-organization")}/{curent.url}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line bg-panel px-3.5 py-2" aria-hidden="true">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-5 w-5 shrink-0 rounded-md bg-brand-blue" />
                <span className="font-display truncate text-[12.5px] font-bold text-ink">{L("Organizația ta", "Your organization")}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2.5">
                <Pill primary>＋ {L("Adaugă", "Add")}</Pill>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">M</span>
              </span>
            </div>
            <div className="h-[372px] overflow-hidden bg-canvas p-3.5 sm:h-[360px] sm:p-4" aria-hidden="true">
              {ecran === "acasa" && <Acasa L={L} />}
              {ecran === "companii" && <Companii L={L} />}
              {ecran === "d177" && <D177 L={L} />}
              {ecran === "donatori" && <Donatori L={L} />}
              {ecran === "fonduri" && <Fonduri L={L} />}
              {ecran === "formular" && <Formular L={L} />}
              {ecran === "instrumente" && <Instrumente L={L} />}
              {ecran === "echipa" && <Echipa L={L} />}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-canvas to-transparent" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 text-center text-[12px] text-muted-2">{L("Ecrane ilustrative, cu date demonstrative.", "Illustrative screens with demo data.")}</p>
      </div>
    </section>
  );
}
