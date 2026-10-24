import { headers } from "next/headers";

import { requireOrgAccess } from "@/lib/auth/guard";
import { areModul } from "@/lib/billing/packages";
import { pachetPentruModule } from "@/lib/billing/trial";

import { ApiSection } from "../../setari/api-section";
import { obtineStareApi } from "../../setari/api-actions";
import { listeazaCampuri } from "../../setari/campuri-actions";
import { CampuriSection } from "../../setari/campuri-section";
import { SetariContinut } from "../../setari/setari-continut";
import { ModulBlocatInline } from "../components/modul-blocat-inline";
import { RoluriIntegrari } from "./roluri-integrari";

// Toate setările într-un singur loc: cele ale organizației (logo, adresă, abonament, plăți donații, acorduri) pentru
// owner/admin, apoi câmpurile personalizate și API-ul (tot pentru administratori) și rolurile din CRM împreună cu integrările viitoare (vizibile tuturor membrilor).
export default async function CrmSetariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const esteAdmin = access.role === "owner" || access.role === "admin";
  const pachet = pachetPentruModule(access.orgPackage, access.userEmail);
  const areCampuri = areModul(pachet, "campuri-personalizate");
  const areApi = areModul(pachet, "api-webhooks");
  const [campuri, stareApi] = await Promise.all([
    esteAdmin && areCampuri ? listeazaCampuri(orgSlug).catch(() => null) : null,
    esteAdmin && areApi ? obtineStareApi(orgSlug).catch(() => null) : null,
  ]);
  const hdrs = await headers();
  const origine = `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("x-forwarded-host") ?? hdrs.get("host")}`;

  return (
    <div className="mx-auto max-w-[960px] space-y-8">
      {esteAdmin && <SetariContinut orgSlug={orgSlug} />}
      {esteAdmin && (
        <div id="campuri" className="scroll-mt-4">
          {campuri ? (
            <CampuriSection campuri={campuri} />
          ) : (
            <ModulBlocatInline orgSlug={orgSlug} modul="campuri-personalizate" descriere="Adaugă câmpurile tale la donatori și la firme (text, număr, dată, alegere, da/nu), vizibile în fișe, în export și în API." poateSchimba />
          )}
        </div>
      )}
      {esteAdmin && (
        <div id="api" className="scroll-mt-4">
          {stareApi ? (
            <ApiSection stare={stareApi} baza={origine} />
          ) : (
            <ModulBlocatInline orgSlug={orgSlug} modul="api-webhooks" descriere="Conectează Alexandrit la alte instrumente: chei API pentru citirea donatorilor și a donațiilor și webhook-uri pentru donații reușite și dezabonări." poateSchimba />
          )}
        </div>
      )}
      <RoluriIntegrari arataTitlu={!esteAdmin} />
    </div>
  );
}
