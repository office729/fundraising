import { isAccessBlocked } from "../billing/trial";
import type { OrgPackage } from "../billing/packages";

// În ce organizație ajunge un utilizator după autentificare când e membru în mai multe (de ex. are propria organizație și a fost invitat în alta).
// Prima, după data aderării, care NU e blocată (probă terminată / abonament neplătit); dacă toate sunt blocate, cea mai veche, ca până acum.
// Fără asta, cine are o organizație proprie cu proba terminată ar ateriza mereu la paywall, chiar dacă lucrează într-o organizație cu abonament activ.
// `organizatii` vin sortate după data aderării (cea mai veche prima). Funcție pură, fără acces la baza de date.
export function alegeOrganizatiaImplicita(
  organizatii: { slug: string; createdAt: Date; subscriptionStatus: string; package: OrgPackage; currentPeriodEnd: Date | null }[],
  email: string,
): string | null {
  const deschisa = organizatii.find((o) => !isAccessBlocked(o, email));
  return (deschisa ?? organizatii[0])?.slug ?? null;
}
