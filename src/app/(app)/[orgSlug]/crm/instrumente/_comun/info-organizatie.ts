import type { requireOrgAccess } from "@/lib/auth/guard";
import type { InfoOrganizatie } from "@/lib/scrisori";

type Access = Awaited<ReturnType<typeof requireOrgAccess>>;

// Datele organizației pentru antetul documentelor: numele, logoul (doar adrese https), culoarea și datele de contact din Setări.
export function infoOrganizatie(a: Access): InfoOrganizatie {
  return {
    nume: a.orgName,
    cif: a.orgCif,
    adresa: a.orgAdresaSediu,
    judet: a.orgJudet,
    iban: a.orgIban,
    logo: a.orgLogoUrl && /^https:\/\//i.test(a.orgLogoUrl) ? a.orgLogoUrl : "",
    culoare: a.orgBrandColor,
  };
}
