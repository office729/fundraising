import type { ReactNode } from "react";
import Link from "next/link";

import { CrmToolPage } from "@/app/(app)/[orgSlug]/crm/tool-page";
import { requireOrgAccess } from "@/lib/auth/guard";
import { areModul, MODULE_PACHET, type ModulPachet } from "@/lib/billing/packages";
import { pachetPentruModule } from "@/lib/billing/trial";

const NUME_MINIM = { crestere: "CREȘTERE", impact: "IMPACT" } as const;

// Poarta unui modul inclus doar începând cu un anumit pachet (vezi MODULE_PACHET în lib/billing/packages.ts). Pachetul se verifică pe
// server la fiecare deschidere de pagină. `inCrm`: rutele de sub /crm sunt deja în meniul CRM; cele din afara lui (ex. /program-lucru)
// își aduc singure meniul, ca mesajul să apară în același cadru ca instrumentul.
export async function PoartaModul({ orgSlug, modul, inCrm = true, children }: { orgSlug: string; modul: ModulPachet; inCrm?: boolean; children: ReactNode }) {
  const access = await requireOrgAccess(orgSlug);
  if (areModul(pachetPentruModule(access.orgPackage, access.userEmail), modul)) return <>{children}</>;

  const { nume, minim } = MODULE_PACHET[modul];
  // Doar owner-ul și administratorii pot schimba pachetul; ceilalți primesc ce să ceară și cui.
  const poateSchimba = access.role === "owner" || access.role === "admin";
  const card = (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <span className="inline-block rounded-full bg-[var(--ci-amber-soft)] px-3.5 py-1.5 text-xs font-bold tracking-wide text-[var(--ci-text)] uppercase">
          Începând cu pachetul {NUME_MINIM[minim]}
        </span>
        <h1 className="ci-display mt-4 text-2xl font-bold text-[var(--ci-text)]">{nume}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--ci-text-muted)]">
          {nume} este inclus începând cu pachetul {NUME_MINIM[minim]}. Datele tale rămân păstrate; după trecerea la un pachet care îl include, modulul se deschide imediat.
        </p>
        {poateSchimba ? (
          <Link
            href={`/${orgSlug}/crm/setari#abonament`}
            className="mt-5 inline-flex h-11 items-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[var(--ci-primary-hover)]"
          >
            Vezi pachetele
          </Link>
        ) : (
          <p className="mt-5 text-[13px] text-[var(--ci-text-muted)]">Doar proprietarul sau un administrator al organizației poate schimba pachetul. Cere-i să îl aleagă din Setări → Abonament.</p>
        )}
      </div>
    </div>
  );
  return inCrm ? card : <CrmToolPage orgSlug={orgSlug} access={access}>{card}</CrmToolPage>;
}
