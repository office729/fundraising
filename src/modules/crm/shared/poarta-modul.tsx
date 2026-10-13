import type { ReactNode } from "react";
import Link from "next/link";

import { CrmToolPage } from "@/app/(app)/[orgSlug]/crm/tool-page";
import { requireOrgAccess } from "@/lib/auth/guard";
import { areModul, MODULE_PACHET, type ModulPachet } from "@/lib/billing/packages";

const NUME_MINIM = { crestere: "CREȘTERE", impact: "IMPACT" } as const;

// Poarta unui modul inclus doar începând cu un anumit pachet (vezi MODULE_PACHET în lib/billing/packages.ts). Pachetul se verifică pe
// server la fiecare deschidere de pagină. `inCrm`: rutele de sub /crm sunt deja în meniul CRM; cele din afara lui (ex. /program-lucru)
// își aduc singure meniul, ca mesajul să apară în același cadru ca instrumentul.
export async function PoartaModul({ orgSlug, modul, inCrm = true, children }: { orgSlug: string; modul: ModulPachet; inCrm?: boolean; children: ReactNode }) {
  const access = await requireOrgAccess(orgSlug);
  if (areModul(access.orgPackage, modul)) return <>{children}</>;

  const { nume, minim } = MODULE_PACHET[modul];
  const card = (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <span className="inline-block rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold tracking-wide text-amber-900 uppercase dark:bg-amber-950 dark:text-amber-200">
          Începând cu pachetul {NUME_MINIM[minim]}
        </span>
        <h1 className="font-display mt-4 text-2xl font-bold text-ink">{nume}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          {nume} este inclus începând cu pachetul {NUME_MINIM[minim]}. Datele tale rămân păstrate; treci la un pachet mai mare și modulul se deschide imediat.
        </p>
        <Link
          href={`/${orgSlug}/crm/setari`}
          className="mt-5 inline-block rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
        >
          Vezi pachetele
        </Link>
      </div>
    </div>
  );
  return inCrm ? card : <CrmToolPage orgSlug={orgSlug} access={access}>{card}</CrmToolPage>;
}
