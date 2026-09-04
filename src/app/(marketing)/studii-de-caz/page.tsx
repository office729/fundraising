import Link from "next/link";

export default function StudiiDeCazPage() {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          Acasă
        </Link>{" "}
        › Studii de Caz
      </div>

      <section className="px-[6%] py-14 text-center">
        <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Studii de caz</span>
        <h1 className="font-display mx-auto mt-2 max-w-2xl text-[32px] leading-tight font-bold text-ink">
          Cum arată rezultatele, în practică
        </h1>
      </section>

      <section className="px-[6%] pb-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-8 sm:p-10">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Asociația Salvează o Inimă</span>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">
            De la înființare la peste 22 de milioane de euro strânși
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: "28M €", l: "strânși" },
              { v: "690+", l: "campanii" },
              { v: "1000+", l: "beneficiari" },
              { v: "14 ani", l: "de activitate" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-panel-2 p-3 text-center">
                <div className="font-display text-xl font-extrabold text-brand-blue">{s.v}</div>
                <div className="text-[11px] text-muted-2">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-6 text-[14.5px] leading-relaxed text-body">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Provocarea</h3>
              <p className="mt-1.5">
                O organizație tânără, fără sistem structurat de fundraising, care avea nevoie să construiască de la
                zero relația cu donatorii persoane fizice și cu firmele partenere.
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">Abordarea</h3>
              <p className="mt-1.5">
                Vlad Plăcintă, președintele asociației, a construit sistemul de fundraising, comunicarea cu
                donatorii și relația cu companiile sponsor — aceleași principii predate azi în cadrul cursurilor și
                consilierii 1 la 1 din Fundraising Academy, și susținute acum de instrumentele din Hub Fundraising
                (CRM persoane fizice/juridice, documente de sponsorizare 20% și D177).
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">Rezultatul</h3>
              <p className="mt-1.5">
                Peste 22 de milioane de euro strânși în peste 14 ani de activitate, prin peste 690 de campanii
                umanitare care au ajuns la peste 1.000 de beneficiari.
              </p>
            </div>
          </div>

          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="mt-8 inline-block rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
          >
            Discută despre situația ONG-ului tău
          </a>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-[13.5px] text-muted-2">
          Mai multe studii de caz — pentru Asociația HAPPY, Asociația Nectarios, A.P.C.A Botoșani și Asociația ANAID —
          vor fi adăugate aici pe măsură ce sunt documentate.{" "}
          <Link href="/portofoliu" className="font-medium text-brand-green">
            Vezi portofoliul complet →
          </Link>
        </p>
      </section>
    </main>
  );
}
