"use server";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { abonamenteDupaEmail, adresaGestionare, avertizeazaOrganizatia, organizatiePublica, trimiteLinkulDonatorului, verificaLink, type LinkPortal } from "@/lib/donator-portal";
import { aplicaOperatie, descrieAbonament, esteAlDonatorului, linkActualizareCard, type CodEroare, type DescriereAbonament, type Operatie } from "@/lib/donator-portal-ops";
import { getLocale } from "@/lib/i18n/get-locale";
import { PORTAL_DONATOR_DICT } from "@/lib/i18n/dictionaries/portal-donator";
import { raporteazaEroare } from "@/lib/monitoring";
import { stripeOrgDupaSlug } from "@/lib/org-stripe";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";

export type StareCerere = { ok: boolean; mesaj: string | null };

// Donatorul își cere linkul. Răspunsul e identic indiferent dacă adresa are sau nu o donație lunară (nu dezvăluim cine a donat);
// emailul pleacă doar când există una.
export async function cereLinkAction(orgSlug: string, _prev: StareCerere, formData: FormData): Promise<StareCerere> {
  const locale = await getLocale();
  const t = PORTAL_DONATOR_DICT[locale].cere;
  try {
    const email = normalizeazaEmail(String(formData.get("email") ?? "")).slice(0, 320);
    if (!EMAIL_RE.test(email)) return { ok: false, mesaj: t.emailInvalid };
    const ip = await obtineIpClient();
    if (!(await verificaLimitaRata("portal-donator-cerere", ip, 6, 15)) || !(await verificaLimitaRata("portal-donator-cerere-email", `${orgSlug}:${email}`, 3, 60))) {
      return { ok: false, mesaj: t.preaMulte };
    }
    const org = await organizatiePublica(orgSlug);
    const stripeOrg = org ? await stripeOrgDupaSlug(orgSlug) : null;
    if (!org || !stripeOrg) return { ok: false, mesaj: t.indisponibil };
    const abonamente = await abonamenteDupaEmail(org.id, email);
    if (abonamente.length > 0) await trimiteLinkulDonatorului(orgSlug, org.id, org.name, email, locale);
    return { ok: true, mesaj: t.trimis };
  } catch (e) {
    raporteazaEroare("portal-donator-cerere", e, { orgSlug });
    return { ok: true, mesaj: t.trimis };
  }
}

export type RezultatOperatieClient = { ok: true; dupa: DescriereAbonament } | { ok: false; cod: CodEroare | "limita" | "link" };

// O operație a donatorului, cu linkul din email. Linkul, proprietatea abonamentului și starea se verifică din nou aici, la fiecare apel.
export async function operatieAction(orgSlug: string, link: LinkPortal, subId: string, op: Operatie): Promise<RezultatOperatieClient> {
  try {
    if (!(await verificaLimitaRata("portal-donator-operatie", await obtineIpClient(), 40, 10))) return { ok: false, cod: "limita" };
    const stripeOrg = await stripeOrgDupaSlug(orgSlug);
    if (!stripeOrg) return { ok: false, cod: "eroare" };
    const email = verificaLink(stripeOrg.orgId, link);
    if (!email) return { ok: false, cod: "link" };
    // Doar abonamente pe care le-am înregistrat noi pentru această adresă (în plus față de verificarea din metadata Stripe).
    const cunoscute = await abonamenteDupaEmail(stripeOrg.orgId, email);
    const gasit = cunoscute.find((a) => a.subId === subId);
    if (!gasit) return { ok: false, cod: "nu_e_al_tau" };
    const operatie: Operatie = op.tip === "suma" ? { tip: "suma", suma: Number(op.suma) } : { tip: op.tip };
    const r = await aplicaOperatie(stripeOrg.stripe, subId, stripeOrg.orgId, email, operatie);
    if (!r.ok) return { ok: false, cod: r.cod };
    await avertizeazaOrganizatia(stripeOrg.orgId, operatie.tip, email, gasit.campanie, r.inainte, r.dupa);
    return { ok: true, dupa: r.dupa };
  } catch (e) {
    raporteazaEroare("portal-donator-operatie", e, { orgSlug, tip: op?.tip });
    return { ok: false, cod: "eroare" };
  }
}

// Pagina Stripe pentru schimbarea cardului. Organizația e înștiințată că donatorul și-a început actualizarea.
export async function cardAction(orgSlug: string, link: LinkPortal, subId: string): Promise<{ url: string | null }> {
  try {
    if (!(await verificaLimitaRata("portal-donator-card", await obtineIpClient(), 15, 10))) return { url: null };
    const stripeOrg = await stripeOrgDupaSlug(orgSlug);
    if (!stripeOrg) return { url: null };
    const email = verificaLink(stripeOrg.orgId, link);
    if (!email) return { url: null };
    const gasit = (await abonamenteDupaEmail(stripeOrg.orgId, email)).find((a) => a.subId === subId);
    if (!gasit) return { url: null };
    const sub = await stripeOrg.stripe.subscriptions.retrieve(subId);
    if (!esteAlDonatorului(sub, stripeOrg.orgId, email)) return { url: null };
    const d = descrieAbonament(sub);
    if (!d.clientId || d.stare === "oprit") return { url: null };
    const url = await linkActualizareCard(stripeOrg.stripe, d.clientId, adresaGestionare(orgSlug, link));
    if (url) await avertizeazaOrganizatia(stripeOrg.orgId, "card", email, gasit.campanie);
    return { url };
  } catch (e) {
    raporteazaEroare("portal-donator-card", e, { orgSlug });
    return { url: null };
  }
}
