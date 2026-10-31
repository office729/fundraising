import "server-only";

import type { requireOrgAccess } from "@/lib/auth/guard";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { getLocale } from "@/lib/i18n/get-locale";

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
  const d = INSTRUMENTE_UI_DICT[await getLocale()].comun.pregatire;
  const org = infoOrganizatie(access);
  const semnatar = await semnatarCurentAction(orgSlug);

  let dateIni: Record<string, unknown> | undefined;
  let firmaId: string | null = null;

  const docId = unu(sp.doc);
  if (docId && UUID.test(docId)) {
    const d = await incarcaDocumentAction(orgSlug, tip, docId);
    if (d && typeof d === "object") dateIni = d as Record<string, unknown>;
  }

  const bannere: Banner[] = [];
  const firmaParam = unu(sp.firma);
  if (firmaParam && UUID.test(firmaParam)) {
    const f = await dateFirmaAction(orgSlug, firmaParam);
    if (f) firmaId = firmaParam;
    if (f && !dateIni) {
      if (f.suma) bannere.push({ text: d.sumaDinUltima(f.suma, f.dataSponsorizare ? f.dataSponsorizare.split("-").reverse().join(".") : "") });
      dateIni =
        tip === "scrisori"
          ? { destFirma: f.nume, destNume: f.administrator, destAdresa: f.adresa, suma: f.suma, proiect: f.proiect, an: f.an }
          : { destinatar: f.nume, detaliu: f.suma && f.an ? `Sprijin acordat în ${f.an}` : "" };
    }
  }

  if (access.orgLogoUrl && !org.logo) {
    bannere.push({ text: d.logoHttps, href: `/${orgSlug}/setari`, eticheta: d.deschideSetari });
  }
  if (tip === "scrisori" && !org.adresa && !org.cif && !org.iban) {
    bannere.push({ text: d.antetGol, href: `/${orgSlug}/setari`, eticheta: d.completeazaSetari });
  }

  return { org, semnatar, dateIni, firmaId, bannere };
}
