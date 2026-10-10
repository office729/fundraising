import "server-only";

import type { requireOrgAccess } from "@/lib/auth/guard";

import { dateFirmaAction, incarcaDocumentAction, semnatarCurentAction, type TipDoc } from "./documente-actions";
import { infoOrganizatie } from "./info-organizatie";
import type { Banner } from "./generator-document";

type Access = Awaited<ReturnType<typeof requireOrgAccess>>;
type Sp = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unu = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

// Tot ce are nevoie o pagină de generator de la server: organizația, semnatarul implicit, un document redeschis (?doc=),
// datele unei firme din CRM (?firma=) și avertismentele despre antet.
export async function pregatesteGenerator(orgSlug: string, access: Access, sp: Sp, tip: TipDoc) {
  const org = infoOrganizatie(access);
  const semnatar = await semnatarCurentAction(orgSlug);

  let dateIni: Record<string, unknown> | undefined;
  let firmaId: string | null = null;

  const docId = unu(sp.doc);
  if (docId && UUID.test(docId)) {
    const d = await incarcaDocumentAction(orgSlug, tip, docId);
    if (d && typeof d === "object") dateIni = d as Record<string, unknown>;
  }

  const firmaParam = unu(sp.firma);
  if (!dateIni && firmaParam && UUID.test(firmaParam)) {
    const f = await dateFirmaAction(orgSlug, firmaParam);
    if (f) {
      firmaId = firmaParam;
      dateIni =
        tip === "scrisori"
          ? { destFirma: f.nume, destNume: f.administrator, destAdresa: f.adresa, suma: f.suma, proiect: f.proiect, an: f.an }
          : { destinatar: f.nume, detaliu: f.suma && f.an ? `Sprijin acordat în ${f.an}` : "" };
    }
  }

  const bannere: Banner[] = [];
  if (access.orgLogoUrl && !org.logo) {
    bannere.push({ text: "Logoul din Setări nu e o adresă https, așa că nu apare în document. Încarcă-l din nou în Setări sau adaugă-l aici.", href: `/${orgSlug}/setari`, eticheta: "Deschide Setări" });
  }
  if (tip === "scrisori" && !org.adresa && !org.cif && !org.iban) {
    bannere.push({ text: "Antetul nu are încă adresă, CIF sau IBAN. Completează-le în Setări ca să apară în toate scrisorile.", href: `/${orgSlug}/setari`, eticheta: "Completează în Setări" });
  }

  return { org, semnatar, dateIni, firmaId, bannere };
}
