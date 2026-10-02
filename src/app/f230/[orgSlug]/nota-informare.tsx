import Link from "next/link";

// Nota de informare (GDPR art. 13) de pe formularul public Formular 230 — se
// colectează CNP, adresă și semnătură olografă, deci informarea trebuie dată
// ÎNAINTE de completare, nu doar sub formă de bifă. Operatorul datelor e
// organizația (beneficiarul 3,5%); platforma Alexandrit e persoană
// împuternicită (vezi /gdpr, punctul 9) — de aceea ambele sunt numite aici.
//
// Perioada de păstrare e formulată intenționat general: o stabilește
// organizația, iar legea impune propriile termene pentru documentele depuse.
// Contact: NU expunem emailul intern al beneficiarului din CRM (câmp neprevăzut
// ca public); cererile pot ajunge la organizație sau, prin furnizorul tehnic, la
// adresa publică de contact a platformei, care le transmite organizației.
export function NotaInformare230({
  orgName,
  beneficiarNume,
  beneficiarCif,
}: {
  orgName: string;
  beneficiarNume: string;
  beneficiarCif: string;
}) {
  const operator = beneficiarNume && beneficiarNume !== orgName ? `${beneficiarNume}, prin ${orgName}` : orgName;
  return (
    <section aria-labelledby="nota-230-titlu" className="rounded-xl border border-line bg-canvas p-4 text-xs leading-relaxed text-body">
      <h2 id="nota-230-titlu" className="text-sm font-semibold text-ink">
        Nota de informare privind datele tale personale
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-4">
        <li>
          <strong>Cine îți prelucrează datele (operator):</strong> {operator}
          {beneficiarCif ? ` (CIF ${beneficiarCif})` : ""}. Formularul e găzduit tehnic de platforma Alexandrit (MEDIGROUPPLUS SRL, CUI 38103518), care acționează doar ca persoană împuternicită, după instrucțiunile organizației, și nu folosește datele în scopuri proprii.
        </li>
        <li>
          <strong>Ce date:</strong> nume, prenume, inițiala tatălui, CNP, email, telefon, adresa de domiciliu, semnătura olografă și opțiunea de valabilitate (1 sau 2 ani).
        </li>
        <li>
          <strong>Pentru ce:</strong> exclusiv pentru completarea Formularului 230 (redirecționarea unei părți din impozitul pe venit) și depunerea lui la ANAF. CNP-ul e necesar ca ANAF să te poată identifica.
        </li>
        <li>
          <strong>Temei:</strong> consimțământul tău, exprimat prin bifa de mai jos (art. 6 alin. (1) lit. a GDPR). Îl poți retrage oricând; retragerea nu afectează un formular deja depus la ANAF și nu poate recupera datele aflate acolo.
        </li>
        <li>
          <strong>Cine le primește:</strong> {orgName}, ANAF (la depunerea formularului) și furnizorii tehnici ai platformei (găzduire și bază de date în Uniunea Europeană). Nu le vindem și nu le publicăm. CNP-ul e stocat criptat.
        </li>
        <li>
          <strong>Cât le păstrăm:</strong> cât este necesar pentru depunerea formularului la ANAF și pentru evidențele cerute de lege. Poți cere ștergerea lor, cu excepția a ceea ce legea obligă să fie păstrat.
        </li>
        <li>
          <strong>Drepturile tale:</strong> acces, rectificare, ștergere, restricționarea prelucrării, opoziție și portabilitate. Le exerciți adresându-te {orgName} (datele de contact sunt pe pagina ei de campanie) sau scriind la{" "}
          <a href="mailto:vlad.placinta@alexandrit.ro" className="font-medium text-brand-green underline">
            vlad.placinta@alexandrit.ro
          </a>
          , care transmite cererea organizației. Poți depune plângere la ANSPDCP,{" "}
          <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-green underline">
            www.dataprotection.ro
          </a>
          .
        </li>
      </ul>
      <p className="mt-2">
        Detalii despre platformă:{" "}
        <Link href="/gdpr" target="_blank" className="font-medium text-brand-green underline">
          Politica de confidențialitate Alexandrit
        </Link>
        .
      </p>
    </section>
  );
}
