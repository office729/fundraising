import Link from "next/link";

const CLIENTI = [
  { nume: "Asociația Salvează o Inimă", instrumente: ["Website Fundraising", "CRM Persoane Fizice"], desc: "Website nou de campanii și CRM pentru gestiunea donatorilor individuali." },
  { nume: "Asociația HAPPY", instrumente: ["CRM Persoane Juridice"], desc: "Gestiune structurată a companiilor partenere și a contractelor de sponsorizare." },
  { nume: "Asociația Nectarios", instrumente: ["One Pager Companii", "Raport de Activitate"], desc: "Materiale profesionale pentru atragerea de noi sponsori corporate." },
  { nume: "A.P.C.A Botoșani", instrumente: ["Newsletter Persoane Fizice"], desc: "Comunicare periodică, structurată, cu baza de donatori individuali." },
  { nume: "Asociația ANAID", instrumente: ["Avatar Donator"], desc: "Profil clar al donatorului ideal, folosit în toate campaniile ulterioare." },
  { nume: "Centrele ROUA", instrumente: ["Generator Program Echipă"], desc: "Organizare mai bună a echipei și a calendarului de campanii." },
];

export default function PortofoliuClientiPage() {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          Acasă
        </Link>{" "}
        ›{" "}
        <Link href="/hub" className="hover:text-brand-blue">
          Hub Fundraising
        </Link>{" "}
        › Portofoliu Clienți
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Portofoliu clienți</span>
          <h1 className="font-display mt-2 text-[32px] leading-tight font-bold text-ink">
            ONG-uri și companii care folosesc instrumentele Hub Fundraising
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            De la CRM la website-uri de fundraising, organizațiile de mai jos au ales instrumentele din Hub pentru
            a-și profesionaliza activitatea de strângere de fonduri.
          </p>
        </div>
      </section>

      <section className="px-[6%] pb-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CLIENTI.map((c) => (
            <div key={c.nume} className="rounded-xl border border-line bg-panel p-6">
              <p className="font-display text-base font-bold text-ink">{c.nume}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.instrumente.map((i) => (
                  <span key={i} className="rounded-full bg-brand-blue-soft px-2.5 py-1 text-[11px] font-semibold text-brand-blue">
                    {i}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-14 text-center">
        <h2 className="font-display text-xl font-bold text-ink">Vrei ONG-ul tău în acest portofoliu?</h2>
        <Link
          href="/hub"
          className="mt-5 inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
        >
          Vezi instrumentele Hub →
        </Link>
      </section>
    </main>
  );
}
