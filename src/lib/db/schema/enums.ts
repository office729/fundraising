import { pgEnum } from "drizzle-orm/pg-core";

// Rolul unui utilizator ÎN CADRUL unei organizații (membership), nu global.
// owner = a creat organizația / plătește abonamentul; admin = gestionează echipa;
// member = folosește instrumentele.
export const membershipRole = pgEnum("membership_role", ["owner", "admin", "member"]);

// Pachetul de abonament activ al organizației — numele reale din pagina de
// prețuri (Hub Fundraising): START / CREȘTERE / IMPACT. "trial" = 14 zile
// fără card, cote generoase (nivel IMPACT) cât timp evaluează platforma.
// Toate pachetele includ TOATE instrumentele — diferența e prin cote
// (utilizatori, contacte, generări lunare), nu prin acces la instrumente.
// Vezi src/lib/billing/packages.ts.
export const orgPackage = pgEnum("org_package", ["trial", "start", "crestere", "impact"]);

// Sursa de adevăr pentru status = webhook-ul Stripe, nu presupuneri locale.
export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

// CRM PJ — pipeline-ul de prospectare firme (portat din SOI_CRM).
export const companyStage = pgEnum("company_stage", [
  "nou",
  "pe_viitor",
  "email",
  "mesaj",
  "onepager",
  "telefon",
  "online",
  "contract_trimis",
  "contract_semnat",
  "contract_asteptare",
  "contract_anulat",
  "sponsorizat",
]);
export const companyStatus = pgEnum("company_status", ["open", "won", "lost", "parked"]);
// Marcaj rapid din secțiunea "Cum sponsorizează" — cald/rece sunt incompatibile
// (o firmă e ori una, ori alta, ori niciuna — nu ambele simultan).
export const companyTemperatura = pgEnum("company_temperatura", ["cald", "rece"]);
export const companyContractStatus = pgEnum("company_contract_status", [
  "trimis",
  "asteptare",
  "semnat",
  "anulat",
]);

// Jurnal real de apeluri (Twilio Voice) — vezi src/lib/twilio.ts.
export const apelStatus = pgEnum("apel_status", [
  "initiat",
  "sunand",
  "in_desfasurare",
  "finalizat",
  "esuat",
  "fara_raspuns",
  "ocupat",
]);
export const regimFiscal = pgEnum("regim_fiscal", ["profit", "micro", "pierdere", "necunoscut"]);
export const consentStatus = pgEnum("consent_status", ["da", "nu", "necunoscut"]);

// Pagini de strângere fonduri per-susținător ("peer-to-peer") — vezi
// src/lib/db/schema/fundraising-pages.ts.
export const fundraisingPageStatus = pgEnum("fundraising_page_status", ["activa", "inchisa"]);
export const fundraisingDonationStatus = pgEnum("fundraising_donation_status", [
  "in_asteptare",
  "reusita",
  "esuata",
  "rambursata",
]);

// Tipul contului unui app_user — determinat de felul invitației acceptate,
// nu ales liber de utilizator. Vezi src/lib/db/schema/beneficiar.ts.
export const accountType = pgEnum("account_type", ["org", "beneficiar"]);

// Modulul „Persoană fizică / Beneficiar" — vezi src/lib/db/schema/beneficiar.ts.
export const beneficiarStatus = pgEnum("beneficiar_status", ["activ", "dezactivat"]);
export const invoiceCategorie = pgEnum("invoice_categorie", ["factura", "plata", "chitanta", "proforma"]);
export const invoiceStatus = pgEnum("invoice_status", ["achitata", "in_asteptare"]);
export const taskTip = pgEnum("task_tip", ["generala", "sponsorizare"]);
export const taskStatus = pgEnum("task_status", ["de_facut", "finalizata"]);
export const calendarItemStatus = pgEnum("calendar_item_status", ["de_facut", "in_lucru", "publicat", "finalizat"]);
export const continutCanal = pgEnum("continut_canal", [
  "facebook",
  "instagram",
  "tiktok",
  "whatsapp",
  "grup_local",
  "comunicat",
]);
export const continutSursa = pgEnum("continut_sursa", ["sablon", "ai"]);
export const continutStatus = pgEnum("continut_status", ["draft", "aprobat", "publicat"]);
export const mediaContactTip = pgEnum("media_contact_tip", ["publicatie", "tv", "radio", "site"]);
export const pressReleaseStatus = pgEnum("press_release_status", ["draft", "aprobat"]);
export const localGroupPlatforma = pgEnum("local_group_platforma", ["facebook", "whatsapp", "altul"]);
export const localGroupStatus = pgEnum("local_group_status", ["activ", "inactiv"]);
