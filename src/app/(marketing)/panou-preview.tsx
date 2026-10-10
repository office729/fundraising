// Previzualizare stilizată a panoului de administrare (date demonstrative, desenate în HTML/CSS — nu e o captură reală,
// deci nu expune date ale vreunei organizații). Pe pagina de start arată vizitatorului cum arată platforma din interior.

type Locale = "ro" | "en";

const T = {
  ro: {
    titlu: "Panoul tău de lucru, într-o privire",
    sub: "Donații, companii, formulare 230 și sarcini echipei — într-un singur loc, clar și fără foi de calcul.",
    adresa: "alexandrit.ro/organizatia-ta/crm",
    nav: ["Acasă", "CRM companii", "CRM persoane fizice", "Formular 230", "Strângere de fonduri", "Rapoarte"],
    salut: "Bună ziua, Maria",
    salutSub: "Ai 3 acțiuni de urmărit azi și un borderou aproape plin.",
    kpi: [
      { l: "Donații luna aceasta", v: "24.380 lei", d: "+12%" },
      { l: "Donatori activi", v: "1.286", d: "+48" },
      { l: "Formulare 230", v: "412", d: "+27" },
      { l: "Companii în discuții", v: "37", d: "+5" },
    ],
    grafic: "Donații pe luni",
    luni: ["Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct"],
    borderou: "Borderou 230 nr. 3",
    borderouSub: "43 din 50 de formulare",
    pasi: ["Mulțumire către SC Alfa SRL", "Raport de impact trimis", "Follow-up sponsorizare Beta"],
    aria: "Ilustrație a panoului de administrare cu date demonstrative",
  },
  en: {
    titlu: "Your workspace at a glance",
    sub: "Donations, companies, Form 230 submissions and team tasks — in one clear place, no spreadsheets.",
    adresa: "alexandrit.ro/your-organization/crm",
    nav: ["Home", "Company CRM", "Individual donors", "Form 230", "Fundraising", "Reports"],
    salut: "Good morning, Maria",
    salutSub: "You have 3 actions to follow up today and a nearly full batch.",
    kpi: [
      { l: "Donations this month", v: "24,380 RON", d: "+12%" },
      { l: "Active donors", v: "1,286", d: "+48" },
      { l: "Form 230 submissions", v: "412", d: "+27" },
      { l: "Companies in talks", v: "37", d: "+5" },
    ],
    grafic: "Donations by month",
    luni: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
    borderou: "Form 230 batch no. 3",
    borderouSub: "43 of 50 submissions",
    pasi: ["Thank-you to Alfa SRL", "Impact report sent", "Sponsorship follow-up Beta"],
    aria: "Illustration of the admin panel with demo data",
  },
} as const;

const BARE = [38, 52, 44, 63, 58, 76, 92];

export function PanouPreview({ locale }: { locale: Locale }) {
  const t = T[locale];
  return (
    <section className="px-[6%] pt-4 pb-16">
      <h2 className="font-display mx-auto max-w-2xl text-center text-[26px] font-bold text-ink sm:text-[30px]">{t.titlu}</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-[14.5px] leading-relaxed text-muted">{t.sub}</p>

      <div
        role="img"
        aria-label={t.aria}
        className="mx-auto mt-9 max-w-5xl overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_70px_-30px_rgba(17,52,95,0.45)]"
      >
        {/* Bara ferestrei */}
        <div className="flex items-center gap-3 border-b border-line bg-panel-2 px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto max-w-[60%] truncate rounded-md bg-panel px-3 py-1 text-[11px] text-muted-2">{t.adresa}</span>
        </div>

        <div className="flex">
          {/* Meniu lateral */}
          <aside className="hidden w-48 shrink-0 border-r border-line bg-panel-2 p-3 sm:block" aria-hidden="true">
            <div className="mb-3 flex items-center gap-2 px-2 py-1.5">
              <span className="h-5 w-5 rounded-md bg-brand-green" />
              <span className="font-display text-[12px] font-bold text-ink">Alexandrit</span>
            </div>
            <ul className="space-y-1">
              {t.nav.map((n, i) => (
                <li
                  key={n}
                  className={`rounded-md px-2.5 py-1.5 text-[12px] ${i === 0 ? "bg-brand-blue font-semibold text-white" : "text-muted"}`}
                >
                  {n}
                </li>
              ))}
            </ul>
          </aside>

          {/* Conținut */}
          <div className="min-w-0 flex-1 space-y-3 bg-canvas p-3.5 sm:p-5" aria-hidden="true">
            <div className="rounded-xl bg-brand-blue px-4 py-3.5 text-white">
              <p className="font-display text-[15px] font-bold">{t.salut}</p>
              <p className="mt-0.5 text-[12px] text-white/75">{t.salutSub}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {t.kpi.map((k) => (
                <div key={k.l} className="rounded-xl border border-line bg-panel p-3">
                  <p className="text-[10.5px] leading-tight text-muted-2">{k.l}</p>
                  <p className="font-display mt-1 text-[16px] font-extrabold text-ink tabular-nums">{k.v}</p>
                  <p className="mt-0.5 text-[10.5px] font-semibold text-brand-green">{k.d}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-2.5 md:grid-cols-5">
              <div className="rounded-xl border border-line bg-panel p-3.5 md:col-span-3">
                <p className="text-[12px] font-semibold text-ink">{t.grafic}</p>
                <div className="mt-3 flex h-28 items-end gap-2">
                  {BARE.map((h, i) => (
                    <div key={t.luni[i]} className="flex h-full flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-md ${i === BARE.length - 1 ? "bg-brand-green" : "bg-brand-blue/25"}`}
                          style={{ height: `${h}%` }}
                        />
                      </div>
                      <span className="text-[9.5px] text-muted-2">{t.luni[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 md:col-span-2">
                <div className="rounded-xl border border-line bg-panel p-3.5">
                  <p className="text-[12px] font-semibold text-ink">{t.borderou}</p>
                  <p className="mt-0.5 text-[11px] text-muted-2">{t.borderouSub}</p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-panel-2">
                    <div className="h-full rounded-full bg-brand-green" style={{ width: "86%" }} />
                  </div>
                </div>
                <ul className="space-y-1.5 rounded-xl border border-line bg-panel p-3.5">
                  {t.pasi.map((p, i) => (
                    <li key={p} className="flex items-center gap-2 text-[11.5px] text-body">
                      <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${i === 1 ? "border-brand-green bg-brand-green" : "border-line"}`} />
                      <span className={i === 1 ? "text-muted-2 line-through" : ""}>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
