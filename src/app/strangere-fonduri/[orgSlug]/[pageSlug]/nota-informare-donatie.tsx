import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

// Nota de informare (GDPR art. 13) pentru DONATORI, în două straturi: o
// propoziție mereu vizibilă (cine prelucrează și de ce) + nota completă într-un
// <details>, ca să nu încarce modalul. Operatorul datelor donatorului e
// ORGANIZAȚIA care strânge fondurile; platforma Alexandrit e persoană
// împuternicită — de aceea nota numește organizația (cu CIF), nu platforma.
// Înlocuiește trimiterea veche la /gdpr, care spune că platforma NU e operatorul
// datelor donatorilor.
//
// Contactul pentru drepturi: adresa publică a platformei (care transmite
// cererea organizației) — organizațiile nu au încă un contact public propriu
// pentru date personale.
export function NotaInformareDonatie({ locale, orgName, orgCif }: { locale: Locale; orgName: string; orgCif: string | null }) {
  const n = DONATION_DICT[locale].donateForm.nota;
  return (
    <section aria-label={n.titlu} className="rounded-lg border border-line bg-canvas p-3 text-[12px] leading-relaxed text-body">
      <p>{n.rezumat(orgName)}</p>
      <details className="mt-1.5">
        <summary className="cursor-pointer font-medium text-brand-green">{n.titlu}</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          <li>{n.operator(orgName, orgCif)}</li>
          <li>{n.date}</li>
          <li>{n.scop}</li>
          <li>{n.optional}</li>
          <li>{n.destinatari}</li>
          <li>{n.pastrare}</li>
          <li>
            {n.drepturiPre(orgName)}{" "}
            <a href="mailto:vlad.placinta@alexandrit.ro" className="font-medium text-brand-green underline">
              vlad.placinta@alexandrit.ro
            </a>
            {n.drepturiPost}{" "}
            <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-green underline">
              www.dataprotection.ro
            </a>
            .
          </li>
        </ul>
        <p className="mt-2">
          <Link href="/gdpr" target="_blank" className="font-medium text-brand-green underline">
            {n.politicaPlatformei}
          </Link>
        </p>
      </details>
    </section>
  );
}
