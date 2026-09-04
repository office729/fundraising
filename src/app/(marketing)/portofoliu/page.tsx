import Link from "next/link";

const ORGANIZATII = [
  { nume: "Asociația Salvează o Inimă", rol: "Fondator și președinte" },
  { nume: "Asociația HAPPY", rol: "Consultanță și fundraising" },
  { nume: "Asociația Nectarios", rol: "Sprijin în dezvoltare" },
  { nume: "A.P.C.A Botoșani", rol: "Strategie de campanii" },
  { nume: "Asociația ANAID", rol: "Consultanță fundraising" },
];

export default function PortofoliuPage() {
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
        › Portofoliu
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Portofoliu</span>
          <h1 className="font-display mt-2 text-[32px] leading-tight font-bold text-ink">
            Pe lângă Asociația Salvează o Inimă, pe care o conduc, am ajutat și alte asociații să se dezvolte
          </h1>
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4 text-[15px] leading-relaxed text-body">
          <p>
            În drumul meu de a sprijini comunitatea și de a aduce un impact pozitiv în societate, am avut privilegiul
            de a colabora cu mai multe asociații și organizații non-profit. Pe lângă Asociația Salvează o Inimă, pe
            care o conduc cu devotament, am contribuit și la crearea și dezvoltarea altor asociații importante ca:
            Asociația Happy, Asociația Nectarios și Asociația Părinților Copiilor cu Autism Botoșani.
          </p>
          <p>
            Aceste organizații au la bază misiuni nobile, iar rolul meu a fost să le sprijin în toate etapele de
            creștere, de la înființare până la consolidarea poziției lor în comunitate. Am oferit suport strategic și
            consultanță, ajutându-le să își îmbunătățească activitățile de fundraising, să dezvolte campanii de
            succes și să își mărească vizibilitatea.
          </p>
          <p>
            Îmi continui cu pasiune implicarea în activitatea acestor asociații, oferind ajutor constant pentru a le
            asigura creșterea și sustenabilitatea. Prin eforturi comune, putem aduce schimbări semnificative și putem
            construi un viitor mai luminos pentru cei aflați în dificultate.
          </p>
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-14">
        <h2 className="font-display mx-auto max-w-2xl text-center text-xl font-bold text-ink">Organizații cu care am lucrat</h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORGANIZATII.map((o) => (
            <div key={o.nume} className="rounded-xl border border-line bg-panel p-5">
              <p className="font-display text-[15px] font-bold text-ink">{o.nume}</p>
              <p className="mt-1 text-[13px] text-brand-green">{o.rol}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-panel p-8">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Studiu de caz</span>
          <h3 className="font-display mt-2 text-xl font-bold text-ink">Asociația Salvează o Inimă</h3>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted">
            De la înființare la peste 22 de milioane de euro strânși și 500 de campanii umanitare — cum am construit
            sistemul de fundraising, comunicarea și relația cu donatorii.
          </p>
          <a href="mailto:vlad.placinta@fundrasingacademy.ro" className="mt-4 inline-block font-bold text-brand-green">
            Vezi studiul de caz →
          </a>
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-14 text-center text-white">
        <p className="mx-auto max-w-xl text-lg font-medium">
          Vrei să te ajut să-ți crești ONG-ul? Programează o discuție online cu mine și hai să construim împreună!
        </p>
        <a
          href="mailto:vlad.placinta@fundrasingacademy.ro"
          className="mt-5 inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
        >
          Programează-te gratuit
        </a>
      </section>
    </main>
  );
}
