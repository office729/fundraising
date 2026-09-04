import Link from "next/link";

const STATS = [
  { v: "28", l: "milioane de euro strânși" },
  { v: "690+", l: "de campanii umanitare" },
  { v: "1000+", l: "de beneficiari" },
  { v: "14 ani", l: "de experiență" },
];

const DIFERENTIATORI = [
  "Expertiză reală în fundraising: peste 22 milioane de euro strânși prin campanii de succes.",
  "Mentorat 1 la 1: sesiuni personalizate direct cu Vlad Plăcintă, Omul Anului 2023.",
  "Impact tangibil: peste 500 de campanii care au salvat viețile a peste 1000 de copii.",
  "Cursuri structurate: fundraising în 10 ședințe, cu suport practic și resurse aplicabile.",
  "Acces la rețea: conectează-te cu alți lideri ONG și creează parteneriate valoroase.",
];

const EXPLOREAZA = [
  { label: "Portofoliu", href: "/portofoliu" },
  { label: "Premii Vlad Plăcintă", href: "/premii" },
  { label: "Hub Fundraising", href: "/hub" },
];

export default function CineSuntemPage() {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          Acasă
        </Link>{" "}
        › Cine suntem?
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Cine suntem?</span>
          <h1 className="font-display mt-2 text-[34px] leading-tight font-bold text-ink">
            Ghidez ONG-uri spre succes prin campanii eficiente și strategii clare
          </h1>
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4 text-[15px] leading-relaxed text-body">
          <p>
            Sunt Vlad Plăcintă și am creat platforma Fundraising Academy cu scopul de a ajuta organizațiile
            non-profit să își maximizeze impactul prin campanii de fundraising eficiente și bine structurate.
            Experiența mea de peste 12 ani în domeniu, ca președinte al Asociației Salvează o Inimă, mi-a permis să
            dezvolt metode și strategii care au dus la strângerea a peste 22 milioane de euro pentru sute de
            campanii umanitare.
          </p>
          <p>
            Prin Fundraising Academy, îmi propun să împărtășesc aceste cunoștințe și să ofer îndrumare
            personalizată, 1 la 1, pentru ca și tu să poți construi campanii de succes și să atragi donatori pentru
            ONG-ul tău.
          </p>
          <p>
            Fiecare pas pe care îl faci în cadrul Fundraising Academy este susținut de expertiza acumulată prin
            munca mea în acest domeniu, cu scopul final de a transforma organizația ta într-o forță care poate
            schimba vieți.
          </p>
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-14 text-white">
        <p className="mx-auto max-w-2xl text-center text-lg font-medium">
          Vlad Plăcintă a strâns peste 22 milioane de euro pentru cauze caritabile.
        </p>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-5 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl font-extrabold">{s.v}</div>
              <div className="mt-1 text-[13px] text-white/75">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] font-bold text-ink">Ce ne face diferiți?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[14.5px] text-muted">
          Peste 500 de campanii reușite și 22 milioane de euro strânși.
        </p>
        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
          {DIFERENTIATORI.map((d) => (
            <div key={d} className="flex gap-3 rounded-xl border border-line bg-panel p-4 text-[14.5px] leading-relaxed text-body">
              <span className="font-extrabold text-brand-green">✓</span>
              {d}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <h3 className="font-display text-base font-bold text-brand-green">Misiunea</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              Să educăm și să sprijinim ONG-urile în crearea de campanii de fundraising eficiente, oferindu-le
              instrumentele și cunoștințele necesare pentru a atrage donatori și a-și susține cauzele.
            </p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-brand-green">Viziunea</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              Ne propunem să devenim lideri în educația de fundraising, contribuind la crearea unei rețele de
              ONG-uri puternice și sustenabile, capabile să schimbe vieți prin campanii de succes.
            </p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-brand-green">Valorile</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              Integritate, transparență și inovație sunt fundamentul activității noastre. Ne dedicăm să oferim
              instruire de calitate, axată pe rezultate concrete și durabile pentru fiecare organizație.
            </p>
          </div>
        </div>
      </section>

      <section className="px-[6%] py-14 text-center">
        <h2 className="font-display text-xl font-bold text-ink">Explorează mai departe</h2>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {EXPLOREAZA.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="rounded-md border border-line px-5 py-2.5 text-sm font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue"
            >
              {e.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
