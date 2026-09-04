import Link from "next/link";

const SERVICII = [
  {
    titlu: "Cursuri de fundraising",
    desc: "Fundraising în 10 ședințe, structurat pas cu pas: de la strategie și avatarul donatorului ideal, până la sponsorizări, social media și monitorizarea rezultatelor.",
    cta: { label: "Vezi ce vei învăța", href: "/#ce-vei-invata" },
  },
  {
    titlu: "Consiliere 1 la 1",
    desc: "Sesiuni individuale, online, direct cu Vlad Plăcintă — audit al campaniilor actuale și plan de acțiune concret, primit în scris.",
    cta: { label: "Programează o sesiune", href: "/hub#consultanta" },
  },
  {
    titlu: "Hub Fundraising",
    desc: "Instrumente contra cost pentru activitatea de zi cu zi: CRM pentru persoane fizice și juridice, generator de documente pentru 20% și D177, rapoarte, newsletter.",
    cta: { label: "Vezi abonamentele", href: "/hub" },
  },
  {
    titlu: "Website Fundraising",
    desc: "Construim infrastructura digitală completă — de la o pagină simplă de donații până la o platformă cu CRM, automatizări și instrumente pentru atragerea sponsorilor.",
    cta: { label: "Vezi pachetele de implementare", href: "/website-fundraising" },
  },
];

export default function CeFacemPage() {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          Acasă
        </Link>{" "}
        › Ce facem?
      </div>

      <section className="px-[6%] py-14 text-center">
        <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Ce facem?</span>
        <h1 className="font-display mx-auto mt-2 max-w-2xl text-[32px] leading-tight font-bold text-ink">
          Patru moduri de a lucra cu Fundraising Academy
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          De la un curs structurat, la instrumente pe care le folosești zilnic — alegi ce se potrivește etapei în
          care se află organizația ta.
        </p>
      </section>

      <section className="px-[6%] pb-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {SERVICII.map((s) => (
            <div key={s.titlu} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-7">
              <h2 className="font-display text-lg font-bold text-ink">{s.titlu}</h2>
              <p className="flex-1 text-[14px] leading-relaxed text-muted">{s.desc}</p>
              <Link href={s.cta.href} className="font-bold text-brand-green">
                {s.cta.label} →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
