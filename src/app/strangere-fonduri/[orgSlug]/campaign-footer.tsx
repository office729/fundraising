import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

// Footer comun paginilor publice de strângere de fonduri (hub-ul organizației
// și fiecare campanie individuală) — identifică organizația care a publicat
// campania, cu datele ei reale (nu ale platformei). Doar câmpuri sigur
// publice (organizations e deja public_lookup — vezi restore-rls.mjs);
// IBAN/date de contact ale ONG-ului (config din crm_kv, folosit la
// contracte) NU sunt publice, deci nu apar aici.
// `locale` e opțional (implicit "ro") — hub-ul organizației (page.tsx din
// [orgSlug]) nu e încă tradus, deci nu trimite deocamdată acest prop.
export function CampaignFooter({
  orgSlug,
  orgName,
  orgLogoUrl,
  orgSlogan,
  orgCif,
  locale = "ro",
}: {
  orgSlug: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgSlogan: string | null;
  orgCif: string | null;
  locale?: Locale;
}) {
  const t = DONATION_DICT[locale].footer;
  return (
    <footer className="mt-12 border-t border-line px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        {orgLogoUrl && (
          <Image src={orgLogoUrl} alt={orgName} width={40} height={40} unoptimized className="h-10 w-10 rounded-lg border border-line bg-panel object-contain p-1.5" />
        )}
        <Link href={`/strangere-fonduri/${orgSlug}`} className="font-display text-[15px] font-bold text-ink hover:text-brand-blue">
          {orgName}
        </Link>
        {orgSlogan && <p className="max-w-md text-[13px] text-muted-2">{orgSlogan}</p>}
        {orgCif && <p className="text-xs text-muted-2">{t.cif} {orgCif}</p>}
        <Link href={`/strangere-fonduri/${orgSlug}`} className="mt-1 text-[13px] font-medium text-brand-green hover:underline">
          {t.toateCampaniile(orgName)}
        </Link>
        <p className="mt-5 text-xs text-muted-2">
          © {new Date().getFullYear()} {orgName} · {t.platformaOferita}{" "}
          <a href="https://alexandrit.ro" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand-blue hover:underline">
            Alexandrit
          </a>
        </p>
      </div>
    </footer>
  );
}
