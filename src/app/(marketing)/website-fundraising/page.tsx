type Pachet = {
  nume: string;
  titlu: string;
  pret: string;
  desc: string;
  items: string[];
  termen: string;
  utilizatori: string;
  bazaDeDate: string;
  cta: string;
  popular?: boolean;
};

const PACHETE: Pachet[] = [
  {
    nume: "PACHETUL START",
    titlu: "Lansare Digitală",
    pret: "700 €",
    desc: "Potrivit pentru ONG-uri mici sau organizații aflate la început, care au nevoie de o prezență profesionistă și de un sistem simplu pentru colectarea donațiilor.",
    items: [
      "Pagină de fundraising realizată pe baza unui model profesional",
      "Design personalizat cu logo-ul, culorile și identitatea ONG-ului",
      "Prezentarea organizației, proiectelor și rezultatelor",
      "Formular modern pentru donații online",
      "Integrarea unui procesator de plăți",
      "Donații cu cardul",
      "CRM de bază pentru persoane fizice și juridice",
      "Înregistrarea donatorilor, companiilor și donațiilor",
      "Importul contactelor din Excel sau CSV",
      "Generator standard de contracte de sponsorizare",
      "Modele pentru sponsorizarea 20% și Declarația 177",
      "Mesaj automat de mulțumire după donație",
      "Exportul datelor în Excel",
      "Adaptare pentru telefon, tabletă și desktop",
      "Configurare GDPR și acorduri de prelucrare a datelor",
      "Instruire online pentru administrator",
    ],
    termen: "10–15 zile lucrătoare",
    utilizatori: "1",
    bazaDeDate: "maximum 2.000 de contacte",
    cta: "Solicită pachetul Start",
  },
  {
    nume: "PACHETUL GROWTH",
    titlu: "Sistem Integrat de Fundraising",
    pret: "3.500 €",
    desc: "Recomandat ONG-urilor care desfășoară campanii în mod constant și vor să gestioneze profesionist donatorii, sponsorii și activitatea echipei.",
    popular: true,
    items: [
      "Tot ce este inclus în pachetul Start",
      "Website personalizat, cu până la 10 pagini",
      "Pagini individuale pentru proiecte și campanii",
      "Formular de donații personalizat per campanie",
      "Donații unice și recurente",
      "Integrarea a maximum două sisteme de plată",
      "CRM integrat pentru persoane fizice și juridice",
      "Profil complet pentru fiecare donator și companie",
      "Segmentarea donatorilor după sumă, recență, frecvență",
      "Pipeline pentru companii și sponsorizări",
      "Programarea apelurilor, întâlnirilor și follow-up-urilor",
      "Notificări pentru contracte și termene limită",
      "Generare documente pentru 20% și Declarația 177",
      "Completarea automată a contractelor cu datele ONG/companie",
      "Generarea contractelor în format PDF",
      "Mesaje automate de mulțumire",
      "Notificarea echipei la donații importante",
      "Crearea automată a sarcinilor de follow-up",
      "Dashboard cu donații, sponsorizări și rezultate",
      "Rapoarte exportabile Excel și PDF",
      "Acces diferențiat pentru membrii echipei",
      "Instruirea echipei și asistență la lansare",
    ],
    termen: "30–45 de zile",
    utilizatori: "5",
    bazaDeDate: "maximum 25.000 de contacte",
    cta: "Alege pachetul recomandat",
  },
  {
    nume: "PACHETUL IMPACT",
    titlu: "Ecosistem Complet de Fundraising",
    pret: "10.000 €",
    desc: "Creat pentru organizații cu mai multe proiecte, volume mari de date și echipe care vor să automatizeze întregul proces de fundraising.",
    items: [
      "Tot ce este inclus în pachetul Growth",
      "Platformă de fundraising realizată integral la comandă",
      "Design și structură dezvoltate special pentru organizație",
      "Administrarea mai multor proiecte din același cont",
      "Conturi individuale pentru beneficiari, coordonatori, filiale",
      "CRM avansat pentru persoane fizice și juridice",
      "Identificarea donațiilor repetate și eliminarea duplicatelor",
      "Segmentare RFM: recență, frecvență, valoare",
      "Scor automat pentru donatori și companii",
      "Identificarea donatorilor inactivi sau cu potențial ridicat",
      "Pipeline avansat pentru sponsorizări",
      "Obiective individuale și de echipă, roluri și permisiuni",
      "Istoric al modificărilor din platformă",
      "Generator avansat de contracte de sponsorizare",
      "Flux de aprobare și semnare a documentelor",
      "Integrare cu furnizor de semnătură electronică",
      "Generator de One Pager personalizat",
      "Generator de rapoarte pentru sponsori și impact",
      "Integrarea mai multor procesatori de plăți",
      "Pagini personalizate de donație per campanie",
      "Automatizări avansate Make.com — maximum 30 de fluxuri",
      "Automatizări prin e-mail, SMS și WhatsApp",
      "Mesaje personalizate după istoricul donatorului",
      "Alerte automate pentru donații importante și reactivare",
      "Integrare cu newsletter, contabilitate, alte aplicații",
      "API pentru conectarea cu sisteme externe",
      "Dashboard managerial personalizat cu rapoarte automate",
      "Migrarea și curățarea bazei existente de date",
      "Instruire pentru echipă",
      "Trei luni de suport tehnic după lansare",
    ],
    termen: "60–90 de zile",
    utilizatori: "maximum 20",
    bazaDeDate: "maximum 150.000 de contacte",
    cta: "Solicită o consultație",
  },
];

const COMPARATIE: { f: string; v0: string; v1: string; v2: string }[] = [
  { f: "Preț de implementare", v0: "700 €", v1: "3.500 €", v2: "10.000 €" },
  { f: "Website de fundraising", v0: "Model profesional", v1: "Personalizat", v2: "Dezvoltare la comandă" },
  { f: "Donații online", v0: "✓", v1: "✓", v2: "✓" },
  { f: "Donații recurente", v0: "✓", v1: "✓", v2: "✓" },
  { f: "Apple Pay și Google Pay", v0: "În funcție de procesator", v1: "✓", v2: "✓" },
  { f: "CRM persoane fizice", v0: "De bază", v1: "Complet", v2: "Avansat" },
  { f: "CRM persoane juridice", v0: "De bază", v1: "Complet", v2: "Avansat" },
  { f: "Pipeline sponsorizări", v0: "—", v1: "✓", v2: "Avansat" },
  { f: "Generator contracte", v0: "Standard", v1: "Personalizat", v2: "Avansat" },
  { f: "Contracte 20% și D177", v0: "✓", v1: "✓", v2: "✓" },
  { f: "Generator One Pager", v0: "—", v1: "✓", v2: "✓" },
  { f: "Rapoarte pentru companii", v0: "—", v1: "✓", v2: "Automatizate" },
  { f: "Automatizări Make.com", v0: "1", v1: "10", v2: "30" },
  { f: "Integrare newsletter", v0: "—", v1: "✓", v2: "✓" },
  { f: "Automatizări e-mail/SMS/WhatsApp", v0: "—", v1: "Parțial", v2: "✓" },
  { f: "Segmentare RFM", v0: "—", v1: "De bază", v2: "Avansată" },
  { f: "Scorarea donatorilor", v0: "—", v1: "—", v2: "✓" },
  { f: "Dashboard personalizat", v0: "De bază", v1: "✓", v2: "Avansat" },
  { f: "Utilizatori", v0: "1", v1: "5", v2: "20" },
  { f: "Instruire", v0: "✓", v1: "✓", v2: "✓" },
  { f: "Suport după lansare", v0: "14 zile", v1: "30 de zile", v2: "3 luni" },
];

const ADMINISTREZI = [
  "Donatorii persoane fizice",
  "Companiile și sponsorii",
  "Campaniile de fundraising",
  "Donațiile și plățile recurente",
  "Contractele de sponsorizare",
  "Documentele pentru 20% și D177",
  "Newsletterele și comunicarea",
  "Sarcinile și programul echipei",
  "Rapoartele oferite sponsorilor",
  "Automatizările din Make.com",
  "Rezultatele și indicatorii organizației",
];

function PachetCard({ p }: { p: Pachet }) {
  return (
    <div
      className={`relative flex flex-col gap-3.5 rounded-2xl border bg-panel p-7 ${
        p.popular ? "border-2 border-brand-green shadow-[0_12px_32px_rgba(63,168,92,0.16)]" : "border-line"
      }`}
    >
      {p.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-4 py-1 text-xs font-extrabold tracking-wide whitespace-nowrap text-white">
          RECOMANDAT
        </div>
      )}
      <div className="text-[12.5px] font-extrabold tracking-wide text-brand-green uppercase">{p.nume}</div>
      <h3 className="font-display text-[20px] font-bold text-ink">
        {p.titlu} — {p.pret}
      </h3>
      <p className="text-[14px] leading-relaxed text-muted">{p.desc}</p>
      <div className="flex flex-1 flex-col gap-2 border-t border-line pt-3.5">
        {p.items.map((item) => (
          <div key={item} className="flex gap-2 text-[13px] leading-relaxed text-body">
            <span className="flex-none font-extrabold text-brand-green">✓</span>
            {item}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 border-t border-line pt-3 text-[12.5px] text-muted-2">
        <div>Termen: {p.termen}</div>
        <div>Utilizatori: {p.utilizatori}</div>
        <div>Bază de date: {p.bazaDeDate}</div>
      </div>
      <a
        href="mailto:vlad.placinta@fundrasingacademy.ro"
        className={`rounded-md py-3 text-center font-bold transition ${
          p.popular
            ? "bg-brand-green text-white hover:bg-brand-green-hover"
            : "border border-brand-blue text-brand-blue hover:border-brand-blue-hover hover:text-brand-blue-hover"
        }`}
      >
        {p.cta}
      </a>
    </div>
  );
}

export default function WebsiteFundraisingPage() {
  return (
    <main>
      <section className="bg-brand-blue px-[6%] py-20 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl leading-tight font-bold text-balance sm:text-[42px]">
            Construim infrastructura digitală de fundraising a ONG-ului tău
          </h1>
          <p className="mx-auto mt-[18px] max-w-2xl text-lg leading-relaxed text-white/75">
            De la o pagină simplă de donații până la o platformă completă, cu CRM, automatizări și instrumente
            pentru atragerea sponsorilor.
          </p>
        </div>
      </section>

      <section className="px-[6%] py-14">
        <p className="mx-auto max-w-3xl text-center text-[15px] leading-relaxed text-body">
          Fundraising Academy dezvoltă soluții digitale adaptate organizațiilor nonprofit din România. Centralizezi
          donatorii, companiile, contractele, plățile și comunicarea într-un singur sistem, ușor de folosit de
          întreaga echipă. Nu primești doar un site — primești un instrument construit pentru a te ajuta să atragi
          donații, să dezvolți parteneriate și să economisești timp.
        </p>
      </section>

      <section className="px-[6%] pb-16">
        <div className="mx-auto grid max-w-[1300px] grid-cols-1 items-stretch gap-[22px] lg:grid-cols-3">
          {PACHETE.map((p) => (
            <PachetCard key={p.nume} p={p} />
          ))}
        </div>
      </section>

      <section className="px-[6%] pb-16">
        <h2 className="font-display mx-auto mb-6 max-w-2xl text-center text-2xl font-bold text-ink">Compară pachetele</h2>
        <div className="mx-auto max-w-[1300px] overflow-auto rounded-xl border border-line bg-panel">
          <div className="grid min-w-[750px] grid-cols-[1.8fr_1fr_1fr_1fr] bg-brand-blue">
            <div className="font-display p-4 text-[13.5px] font-bold text-white">Funcționalitate</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">START</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">GROWTH</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">IMPACT</div>
          </div>
          {COMPARATIE.map((row) => (
            <div key={row.f} className="grid min-w-[750px] grid-cols-[1.8fr_1fr_1fr_1fr] border-t border-line text-[13px]">
              <div className="p-3 px-4 font-semibold text-brand-blue">{row.f}</div>
              <div className="p-3 px-4 text-center text-body">{row.v0}</div>
              <div className="p-3 px-4 text-center text-body">{row.v1}</div>
              <div className="p-3 px-4 text-center text-body">{row.v2}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink">O singură platformă pentru întreaga activitate de fundraising</h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
            Nu mai trebuie să păstrezi donatorii într-un Excel, companiile într-un alt document, contractele în
            foldere separate și activitățile echipei în aplicații diferite.
          </p>
          <p className="mt-3 text-[14.5px] font-medium text-ink">Cu platforma Fundraising Academy poți administra:</p>
        </div>
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ADMINISTREZI.map((a) => (
            <div key={a} className="flex gap-2 text-[13.5px] text-body">
              <span className="font-extrabold text-brand-green">✓</span>
              {a}
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-16 text-center">
        <h2 className="font-display mx-auto max-w-2xl text-2xl font-bold text-ink">
          Investește într-un sistem care lucrează pentru organizația ta
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted">
          Tehnologia nu înlocuiește relația cu donatorii. Îți oferă timpul și informațiile necesare pentru a construi
          relații mai bune, pentru a reveni la momentul potrivit și pentru a transforma mai multe contacte în
          susținători pe termen lung.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3.5">
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
          >
            Solicită o demonstrație
          </a>
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md border border-line px-7 py-3.5 font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue"
          >
            Discută cu un specialist
          </a>
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-10 text-center">
        <h3 className="font-display text-base font-bold text-ink">Informații despre costuri</h3>
        <div className="mx-auto mt-3 flex max-w-2xl flex-col gap-2 text-[12.5px] leading-relaxed text-muted-2">
          <p>Prețurile reprezintă costul de implementare. Plata poate fi realizată în lei, la cursul BNR din ziua facturării.</p>
          <p>
            Abonamentele și comisioanele percepute de procesatorii de plăți, Make.com, serviciile de hosting,
            domeniul, platformele de newsletter, serviciile SMS, WhatsApp, semnătura electronică și alte aplicații
            externe nu sunt incluse. Costurile acestora vor fi prezentate și aprobate înainte de implementare.
          </p>
          <p>Funcționalitățile finale, integrările și termenul de livrare se stabilesc în urma analizei tehnice a proiectului.</p>
        </div>
        <p className="mt-5 text-[13.5px] text-ink">
          Nu ești sigur ce pachet ți se potrivește?{" "}
          <a href="mailto:vlad.placinta@fundrasingacademy.ro" className="font-bold text-brand-green">
            vlad.placinta@fundrasingacademy.ro
          </a>
        </p>
      </section>
    </main>
  );
}
