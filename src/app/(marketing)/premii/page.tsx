import Link from "next/link";

const PREMII = [
  { data: "25 martie 2025", titlu: "Gala „România ești TU”", desc: "Recunoaștere în cadrul galei „România ești TU” pentru activitatea umanitară și impactul campaniilor derulate în sprijinul copiilor și familiilor vulnerabile." },
  { data: "25 martie 2024", titlu: "Crucea Bucovinei", desc: "IPS Calinic, Arhiepiscopul Sucevei și Rădăuților, mi-a conferit ordinul „Crucea Bucovinei”, o distincție ce mă umple de o recunoștință adâncă și de o responsabilitate pe măsură." },
  { data: "14 februarie 2024", titlu: "Liderul anului 2023 în implicare socială", desc: "Titlul de „Liderul Anului 2023” în cadrul celei de-a noua ediții a Galei Itsy Bitsy – Lideri pentru Liderași 2024, un omagiu adus tuturor proiectelor curajoase desfășurate în 2023 pentru a crea un univers mai bun pentru copii." },
  { data: "25 ianuarie 2024", titlu: "Omul Anului 2023", major: true, desc: "Premiul „Omul anului”, primit în cadrul unei gale difuzate de TVR în ultima zi din an, dedicată oamenilor care au făcut fapte extraordinare pentru semenii lor și pentru societate." },
  { data: "19 decembrie 2022", titlu: "Cetățean de onoare al Municipiului Botoșani", major: true, desc: "Consilierii municipali au votat acordarea titlului de Cetățean de Onoare al Municipiului Botoșani, ca apreciere pentru activitatea umanitară derulată începând cu 2012." },
  { data: "28 martie 2022", titlu: "Diplomă de excelență — Gala Națională a Excelenței în Asistență Socială", desc: "Nominalizat de Structura Teritorială Botoșani a Colegiului Național al Asistenților Sociali din România la categoria personalități care s-au remarcat în susținerea profesiei de asistent social în perioada 2020–2021." },
  { data: "28 martie 2022", titlu: "Diplomă de onoare — Spitalul Județean Mavromati Botoșani", desc: "Recunoștință pentru sprijinul acordat în lupta împotriva SARS-CoV-2: aparatură medicală, teste PCR și echipamente de protecție pentru cadrele medicale în 2020–2021." },
  { data: "26 martie 2022", titlu: "Cetățean de onoare al Comunei Frumușica", desc: "Primarul comunei Frumușica, împreună cu consilierii locali, au hotărât acordarea titlului de cetățean de onoare pentru dedicarea față de copiii bolnavi și familiile defavorizate." },
  { data: "27 septembrie 2020", titlu: "Distincția „Crucea Sfântului Ierarh Dosoftei”", desc: "Primită din partea ÎPS Teofan, Mitropolitul Moldovei și Bucovinei, pentru întreaga activitate desfășurată în cadrul Asociației „Salvează o Inimă”." },
];

export default function PremiiPage() {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          Acasă
        </Link>{" "}
        ›{" "}
        <Link href="/cine-suntem" className="hover:text-brand-blue">
          Cine suntem?
        </Link>{" "}
        › Premii Vlad Plăcintă
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Premii și distincții</span>
          <h1 className="font-display mt-2 text-[32px] leading-tight font-bold text-ink">
            Premii și distincții — Vlad Plăcintă
          </h1>
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4 text-[15px] leading-relaxed text-body">
          <p>
            Sunt Vlad Plăcintă, președintele Asociației „Salvează o Inimă” și fondatorul Fundraising Academy. De-a
            lungul anilor, m-am dedicat în totalitate sprijinirii cauzelor umanitare și dezvoltării strategiilor
            eficiente de fundraising pentru ONG-uri. Am reușit să strâng peste 22 milioane de euro prin diverse
            campanii care au salvat sute de vieți.
          </p>
          <p>
            Activitatea mea a fost recunoscută prin numeroase premii, care reflectă nu doar eforturile personale, ci
            și impactul major pe care l-am avut în comunitate. Printre distincțiile obținute se numără titlul de
            „Omul Anului 2023”, un premiu care onorează 12 ani de activitate neîntreruptă în sprijinul celor mai
            vulnerabili.
          </p>
        </div>
      </section>

      <section className="px-[6%] pb-14">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {PREMII.map((p) => (
            <div key={p.titlu} className="flex gap-5 rounded-xl border border-line bg-panel p-5">
              <div className="w-28 shrink-0 text-[12.5px] font-medium text-muted-2">{p.data}</div>
              <div>
                {p.major && (
                  <span className="mb-1 inline-block rounded-full bg-brand-amber-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-amber uppercase">
                    Distincție majoră
                  </span>
                )}
                <h3 className="font-display text-[15px] font-bold text-ink">{p.titlu}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-14 text-center text-white">
        <p className="mx-auto max-w-lg text-lg font-medium">
          Învață direct de la mine, 1 la 1, cum să creezi campanii de succes pentru ONG-ul tău
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3.5">
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
          >
            Programează-te gratuit
          </a>
          <Link
            href="/hub"
            className="rounded-md border-[1.5px] border-[#2e639b] px-7 py-3.5 font-bold text-white transition hover:border-white"
          >
            Vezi Hub Fundraising →
          </Link>
        </div>
      </section>
    </main>
  );
}
