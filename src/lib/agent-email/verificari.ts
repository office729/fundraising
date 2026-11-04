import "server-only";

import { and, eq } from "drizzle-orm";

import { poateFiDistribuit } from "@/lib/campanii/distribuibil";
import { companies, contacts, fundraisingPages } from "@/lib/db/schema";

import { contactEligibil, firmaEligibila, type TipMesaj } from "./reguli";
import { construiesteSuprimare, esteUuid, primMailRecent, type Db } from "./store";

type Tr = (ro: string, en: string) => string;

// Verificările făcute ÎNAINTE de fiecare trimitere (nu doar la generarea ciornei): între timp datele se pot schimba.
// Întoarce mesajul de oprire sau null dacă destinatarul și firma sunt încă eligibili.
export async function verificaDestinatarAcum(
  db: Db,
  orgId: string,
  x: { mesajId: string | null; companyId: string; contactId: string | null; email: string; tip: TipMesaj },
  t: Tr,
): Promise<string | null> {
  if (!x.contactId || !esteUuid(x.contactId)) return t("Persoana de contact nu mai există în CRM. Generează din nou ciorna.", "The contact person no longer exists in the CRM. Generate the draft again.");
  const [c] = await db
    .select({ companyId: contacts.companyId, email: contacts.email, acord: contacts.consentStatus, emailStatus: contacts.emailStatus })
    .from(contacts)
    .where(and(eq(contacts.orgId, orgId), eq(contacts.id, x.contactId)))
    .limit(1);
  if (!c) return t("Persoana de contact nu mai există în CRM. Generează din nou ciorna.", "The contact person no longer exists in the CRM. Generate the draft again.");
  if (c.companyId !== x.companyId) return t("Persoana nu mai aparține acestei firme în CRM. Generează din nou ciorna.", "This person no longer belongs to this company in the CRM. Generate the draft again.");
  if ((c.email ?? "").trim().toLowerCase() !== x.email.trim().toLowerCase()) return t("Adresa de email a persoanei s-a schimbat în CRM. Generează din nou ciorna.", "The person's email address changed in the CRM. Generate the draft again.");
  const suprimat = await construiesteSuprimare(db, orgId);
  // La revenire, acordul „necunoscut” rămâne valabil (a fost acceptat la primul email); un refuz, o adresă invalidă sau o dezabonare opresc orice mesaj.
  const e = contactEligibil({ email: c.email, acord: c.acord, emailStatus: c.emailStatus }, { doarCuAcord: false, suprimat });
  if (!e.ok) {
    switch (e.motiv) {
      case "acord_refuzat":
        return t("Persoana a refuzat să fie contactată. Nu trimitem.", "The person declined to be contacted. We do not send.");
      case "suprimat":
        return t("Adresa e pe lista de dezabonări sau „nu mai căuta”. Nu trimitem.", "The address is on the unsubscribe or “do not contact” list. We do not send.");
      case "email_marcat_invalid":
      case "email_invalid":
        return t("Adresa de email e marcată invalidă.", "The email address is marked invalid.");
      default:
        return t("Persoana de contact nu mai poate primi emailuri.", "The contact can no longer receive emails.");
    }
  }
  const [f] = await db.select({ stage: companies.stage, status: companies.status, stergeLa: companies.deletedAt }).from(companies).where(and(eq(companies.orgId, orgId), eq(companies.id, x.companyId))).limit(1);
  if (!f) return t("Firma nu mai există în CRM.", "The company no longer exists in the CRM.");
  const ultim = x.tip === "prim" ? await primMailRecent(db, orgId, x.companyId, x.mesajId, 60) : null;
  const m = firmaEligibila({ stergeLa: f.stergeLa ? f.stergeLa.toISOString() : null, status: f.status, stage: f.stage, tip: x.tip, ultimulPrimMail: ultim?.la ?? null }, new Date());
  switch (m) {
    case "stearsa":
      return t("Firma a fost ștearsă din CRM.", "The company was deleted from the CRM.");
    case "respinsa":
      return t("Firma e marcată „Respins” în CRM. Nu trimitem.", "The company is marked “Lost” in the CRM. We do not send.");
    case "in_contract":
      return t("Firma e deja în etapa de contract sau sponsor: discutați direct, nu printr-un email de prim contact.", "The company is already at contract stage or a sponsor: talk to them directly, not through a first-contact email.");
    case "scris_recent":
      return t(`Firma a primit deja un email prin agent pe ${ultim?.la.toLocaleDateString("ro-RO") ?? ""} (${ultim?.deNume ?? ""}). Șterge această ciornă.`, `The company already received an agent email on ${ultim?.la.toLocaleDateString("en-GB") ?? ""} (${ultim?.deNume ?? ""}). Delete this draft.`);
    default:
      return null;
  }
}

// Campania propusă: acordul pentru publicare poate fi retras și pagina poate fi închisă între timp.
export async function verificaCazAcum(db: Db, orgId: string, pageId: string | null, t: Tr): Promise<string | null> {
  if (!pageId) return null;
  const [pg] = await db.select({ status: fundraisingPages.status, consimtamantGdpr: fundraisingPages.consimtamantGdpr, minor: fundraisingPages.minor, acordDistribuireMinor: fundraisingPages.acordDistribuireMinor, anonimizat: fundraisingPages.anonimizat, acordRetras: fundraisingPages.acordRetras, acordDiagnostic: fundraisingPages.acordDiagnostic }).from(fundraisingPages).where(and(eq(fundraisingPages.orgId, orgId), eq(fundraisingPages.id, pageId))).limit(1);
  if (!pg) return t("Campania propusă nu mai există. Generează din nou ciorna.", "The proposed campaign no longer exists. Generate the draft again.");
  if (!poateFiDistribuit(pg)) return t("Pagina publică a campaniei nu mai e activă sau acordul pentru distribuire lipsește ori a fost retras. Nu o mai putem propune.", "The campaign's public page is no longer active or the consent to share it is missing or was withdrawn. We can no longer propose it.");
  return null;
}
