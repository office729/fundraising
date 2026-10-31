import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import { F230_PUBLIC_UI_DICT } from "@/lib/i18n/dictionaries/f230-public-ui";

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
  locale,
}: {
  orgName: string;
  beneficiarNume: string;
  beneficiarCif: string;
  locale: Locale;
}) {
  const n = F230_PUBLIC_UI_DICT[locale].nota;
  const operator = beneficiarNume && beneficiarNume !== orgName ? n.operatorPrin(beneficiarNume, orgName) : orgName;
  return (
    <section aria-labelledby="nota-230-titlu" className="rounded-xl border border-line bg-canvas p-4 text-xs leading-relaxed text-body">
      <h2 id="nota-230-titlu" className="text-sm font-semibold text-ink">
        {n.titlu}
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-4">
        <li>
          <strong>{n.operatorLabel}</strong> {operator}
          {beneficiarCif ? ` (CIF ${beneficiarCif})` : ""}
          {n.operatorGazduit}
        </li>
        <li>
          <strong>{n.dateLabel}</strong>
          {n.date}
        </li>
        <li>
          <strong>{n.scopLabel}</strong>
          {n.scop}
        </li>
        <li>
          <strong>{n.temeiLabel}</strong>
          {n.temei}
        </li>
        <li>
          <strong>{n.primescLabel}</strong>
          {n.primesc(orgName)}
        </li>
        <li>
          <strong>{n.pastrareLabel}</strong>
          {n.pastrare}
        </li>
        <li>
          <strong>{n.drepturiLabel}</strong>
          {n.drepturiPre}
          {orgName}
          {n.drepturiMij}
          <a href="mailto:vlad.placinta@alexandrit.ro" className="font-medium text-brand-green underline">
            vlad.placinta@alexandrit.ro
          </a>
          {n.drepturiPost}
          <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-green underline">
            www.dataprotection.ro
          </a>
          .
        </li>
      </ul>
      <p className="mt-2">
        {n.detalii}{" "}
        <Link href="/gdpr" target="_blank" className="font-medium text-brand-green underline">
          {n.politica}
        </Link>
        .
      </p>
    </section>
  );
}
