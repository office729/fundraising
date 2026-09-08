import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import {
  beneficiarStatus,
  calendarItemStatus,
  continutCanal,
  continutStatus,
  continutSursa,
  invoiceCategorie,
  invoiceStatus,
  localGroupPlatforma,
  localGroupStatus,
  mediaContactTip,
  pressReleaseStatus,
  taskStatus,
  taskTip,
} from "./enums";
import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";

// Modulul „Persoană fizică / Beneficiar" — portalul dedicat persoanei/familiei
// pentru care se colectează fonduri pe o pagină `fundraising_pages`. Fiecare
// beneficiar e legat de EXACT o campanie; conturile sunt create/aprobate de
// echipa organizației (invitație, nu auto-înscriere) — vezi
// src/app/invite-beneficiar/[token]/actions.ts și src/lib/auth/guard.ts
// (`withBeneficiarSession`).
//
// Sumele afișate în portal NU sunt o sursă nouă de adevăr: `sumaStransa`/
// `sumaTinta` rămân pe `fundraising_pages` (actualizate de webhook-ul
// Stripe); tabelele de mai jos adaugă doar ce nu există încă acolo
// (facturi, agent, calendar, sarcini, presă, grupuri, mesaje, notificări).

// Invitație de beneficiar — oglindă a `invites` (echipă), dar legată de o
// campanie, nu de un rol de organizație. Token-based, ca /invite/[token].
export const fundraisingBeneficiaryInvites = pgTable(
  "fundraising_beneficiary_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => appUsers.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("fundraising_beneficiary_invites_campaign_idx").on(t.campaignPageId),
    index("fundraising_beneficiary_invites_org_idx").on(t.orgId),
    index("fundraising_beneficiary_invites_email_idx").on(t.email),
  ],
).enableRLS();

// Contul activat al unui beneficiar — o singură campanie per beneficiar
// (unique pe appUserId). `status` permite dezactivare de către admin fără
// a șterge istoricul (facturi, sarcini, mesaje rămân intacte).
export const fundraisingBeneficiaries = pgTable(
  "fundraising_beneficiaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appUserId: uuid("app_user_id")
      .notNull()
      .unique()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Denormalizat la acceptare — staff-ul organizației nu are nicio politică
    // RLS care să-i permită să vadă rândul app_users al beneficiarului (nu e
    // membership), deci un JOIN pe app_users la citire (din CRM) ar ascunde
    // tăcut orice beneficiar activ. Același motiv ca la
    // fundraising_messages/fundraising_campaign_agents.
    email: text("email").notNull(),
    status: beneficiarStatus("status").notNull().default("activ"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fundraising_beneficiaries_campaign_idx").on(t.campaignPageId),
    index("fundraising_beneficiaries_org_idx").on(t.orgId),
  ],
).enableRLS();

// Agentul dedicat unei campanii — trebuie să fie un membru activ al
// organizației (verificat la atribuire, nu impus prin FK). Schimbarea
// agentului dezactivează rândul vechi și inserează unul nou: istoricul
// atribuirilor rămâne interogabil (nu se suprascrie).
export const fundraisingCampaignAgents = pgTable(
  "fundraising_campaign_agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentUserId: uuid("agent_user_id")
      .notNull()
      .references(() => appUsers.id),
    // Denormalizate la atribuire — un beneficiar nu are nicio politică RLS
    // care să-i permită să citească rândul app_users al agentului (nu are
    // membership), deci un JOIN pe app_users la citire ar ascunde tăcut
    // agentul. Același motiv ca la fundraising_messages.senderNume/senderEmail.
    agentNume: text("agent_nume"),
    agentEmail: text("agent_email").notNull(),
    bio: text("bio"),
    programDisponibilitate: text("program_disponibilitate"),
    contactAprobat: text("contact_aprobat"),
    assignedBy: uuid("assigned_by").references(() => appUsers.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("fundraising_campaign_agents_campaign_idx").on(t.campaignPageId),
    index("fundraising_campaign_agents_org_idx").on(t.orgId),
  ],
).enableRLS();

// Fir de mesaje simplu, scopat pe campanie — beneficiarul și agentul
// văd toate mesajele campaniei lor (nu e nevoie de destinatar explicit,
// sunt mereu exact 2 părți posibile: beneficiarul + agentul curent).
export const fundraisingMessages = pgTable(
  "fundraising_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    senderAppUserId: uuid("sender_app_user_id")
      .notNull()
      .references(() => appUsers.id),
    // Denormalizate la trimitere (nume/email) — NU un JOIN pe app_users la
    // citire: staff-ul organizației nu are nicio politică RLS care să-i
    // permită să vadă rândul app_users al beneficiarului (nu e membership),
    // deci un INNER JOIN ar ascunde tăcut exact mesajele trimise de
    // beneficiar. Același motiv ca denormalizarea `invites.orgName`.
    senderNume: text("sender_nume"),
    senderEmail: text("sender_email").notNull(),
    continut: text("continut").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    cititLa: timestamp("citit_la", { withTimezone: true }),
  },
  (t) => [index("fundraising_messages_campaign_idx").on(t.campaignPageId), index("fundraising_messages_org_idx").on(t.orgId)],
).enableRLS();

// Documente financiare (facturi, ordine de plată, chitanțe, proforme)
// încărcate de admin/agent — sursa reală pentru „facturi achitate" din
// calculul financiar afișat beneficiarului. Fișierul stă în bucket-ul
// "org-branding" (același folosit pentru poza de copertă a campaniei),
// sub un prefix nou `<orgSlug>/factura-<campaignId>-*`.
export const fundraisingInvoices = pgTable(
  "fundraising_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    denumire: text("denumire").notNull(),
    suma: integer("suma").notNull(), // lei
    moneda: text("moneda").notNull().default("RON"),
    data: date("data").notNull(),
    categorie: invoiceCategorie("categorie").notNull(),
    observatii: text("observatii"),
    fisierUrl: text("fisier_url"),
    status: invoiceStatus("status").notNull().default("achitata"),
    incarcatDe: uuid("incarcat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("fundraising_invoices_campaign_idx").on(t.campaignPageId), index("fundraising_invoices_org_idx").on(t.orgId)],
).enableRLS();

// Calendarul campaniei — un rând per zi propusă de promovare, cu text
// pregătit determinist (vezi src/lib/promovare/generator.ts, extins cu
// praguri 25/50/75/90/100%). Regenerat (nu editat manual câmp cu câmp) când
// suma sau statusul campaniei se schimbă; `observatiiAgent` e singurul câmp
// liber, păstrat peste regenerări.
export const fundraisingCalendarItems = pgTable(
  "fundraising_calendar_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ziua: date("ziua").notNull(),
    obiectiv: text("obiectiv").notNull(),
    canalRecomandat: text("canal_recomandat").notNull(),
    textPregatit: text("text_pregatit").notNull(),
    materialeNecesare: text("materiale_necesare"),
    indemn: text("indemn"),
    status: calendarItemStatus("status").notNull().default("de_facut"),
    dataLimita: date("data_limita"),
    observatiiAgent: text("observatii_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fundraising_calendar_items_campaign_idx").on(t.campaignPageId),
    index("fundraising_calendar_items_org_idx").on(t.orgId),
    uniqueIndex("fundraising_calendar_items_campaign_ziua_idx").on(t.campaignPageId, t.ziua),
  ],
).enableRLS();

// Sarcini pentru beneficiar — un singur tabel, discriminat pe `tip`
// ("generala" | "sponsorizare"), ca să nu dubleze structura din secțiunea 9
// a cerinței. Coloanele de sponsorizare rămân null pentru sarcinile generale.
export const fundraisingTasks = pgTable(
  "fundraising_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tip: taskTip("tip").notNull().default("generala"),
    titlu: text("titlu").notNull(),
    descriere: text("descriere"),
    dataLimita: date("data_limita"),
    status: taskStatus("status").notNull().default("de_facut"),
    // Câmpuri specifice sarcinilor de sponsorizare (secțiunea 9) — null
    // pentru sarcinile generale.
    companie: text("companie"),
    suma: integer("suma"),
    moneda: text("moneda"),
    textMultumire: text("text_multumire"),
    canalRecomandat: text("canal_recomandat"),
    createdBy: uuid("created_by").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("fundraising_tasks_campaign_idx").on(t.campaignPageId), index("fundraising_tasks_org_idx").on(t.orgId)],
).enableRLS();

export const fundraisingTaskAttachments = pgTable(
  "fundraising_task_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => fundraisingTasks.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fisierUrl: text("fisier_url").notNull(),
    denumire: text("denumire").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("fundraising_task_attachments_task_idx").on(t.taskId), index("fundraising_task_attachments_org_idx").on(t.orgId)],
).enableRLS();

// Materiale de promovare pe canal — în această fază, mereu `sursa='sablon'`
// (generator determinist); structura rămâne neschimbată când se adaugă
// generarea AI, doar funcția care scrie rândul se schimbă (vezi planul
// pentru „Faza AI").
export const fundraisingGeneratedContent = pgTable(
  "fundraising_generated_content",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    canal: continutCanal("canal").notNull(),
    titlu: text("titlu"),
    textComplet: text("text_complet").notNull(),
    textScurt: text("text_scurt"),
    indemn: text("indemn"),
    sursa: continutSursa("sursa").notNull().default("sablon"),
    status: continutStatus("status").notNull().default("draft"),
    aprobatDe: uuid("aprobat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fundraising_generated_content_campaign_idx").on(t.campaignPageId),
    index("fundraising_generated_content_org_idx").on(t.orgId),
  ],
).enableRLS();

// Bază de contacte de presă locală — globală per organizație (nu per
// campanie), filtrată pe județ la nevoie. Tabel gol la lansare: nu inventăm
// contacte reale, echipa îl populează manual din CRM.
export const fundraisingMediaContacts = pgTable(
  "fundraising_media_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    judet: text("judet").notNull(),
    tip: mediaContactTip("tip").notNull(),
    numeRedactie: text("nume_redactie").notNull(),
    email: text("email"),
    telefon: text("telefon"),
    website: text("website"),
    persoanaContact: text("persoana_contact"),
    statusContactare: text("status_contactare"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("fundraising_media_contacts_org_idx").on(t.orgId), index("fundraising_media_contacts_judet_idx").on(t.judet)],
).enableRLS();

// Comunicat de presă per campanie — în această fază, `continut` e generat
// din șablonul determinist deja scris (genereazaComunicatPresa din
// src/lib/promovare/generator.ts), nu de un model AI.
export const fundraisingPressReleases = pgTable(
  "fundraising_press_releases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    continut: text("continut").notNull(),
    status: pressReleaseStatus("status").notNull().default("draft"),
    aprobatDe: uuid("aprobat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fundraising_press_releases_campaign_idx").on(t.campaignPageId),
    index("fundraising_press_releases_org_idx").on(t.orgId),
  ],
).enableRLS();

export const fundraisingPressOutreachHistory = pgTable(
  "fundraising_press_outreach_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pressReleaseId: uuid("press_release_id")
      .notNull()
      .references(() => fundraisingPressReleases.id, { onDelete: "cascade" }),
    mediaContactId: uuid("media_contact_id")
      .notNull()
      .references(() => fundraisingMediaContacts.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dataTrimiterii: timestamp("data_trimiterii", { withTimezone: true }).defaultNow().notNull(),
    status: text("status").notNull().default("trimis"),
  },
  (t) => [
    index("fundraising_press_outreach_history_release_idx").on(t.pressReleaseId),
    index("fundraising_press_outreach_history_org_idx").on(t.orgId),
  ],
).enableRLS();

// Grupuri locale (Facebook/WhatsApp/altul) relevante pentru promovare —
// globale per organizație, filtrate pe județ/localitate.
export const fundraisingLocalGroups = pgTable(
  "fundraising_local_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    judet: text("judet").notNull(),
    localitate: text("localitate"),
    platforma: localGroupPlatforma("platforma").notNull(),
    nume: text("nume").notNull(),
    link: text("link").notNull(),
    categorie: text("categorie"),
    reguli: text("reguli"),
    status: localGroupStatus("status").notNull().default("activ"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("fundraising_local_groups_org_idx").on(t.orgId), index("fundraising_local_groups_judet_idx").on(t.judet)],
).enableRLS();

export const fundraisingGroupPostingHistory = pgTable(
  "fundraising_group_posting_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => fundraisingLocalGroups.id, { onDelete: "cascade" }),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    marcatDe: uuid("marcat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fundraising_group_posting_history_group_idx").on(t.groupId),
    index("fundraising_group_posting_history_campaign_idx").on(t.campaignPageId),
    index("fundraising_group_posting_history_org_idx").on(t.orgId),
  ],
).enableRLS();

// Notificări in-app, per app_user (nu per campanie — un agent poate primi
// notificări din mai multe campanii). Pentru declanșatoare critice se
// trimite și email prin src/lib/email.ts (trimiteEmail), best-effort.
export const fundraisingNotifications = pgTable(
  "fundraising_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appUserId: uuid("app_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(),
    titlu: text("titlu").notNull(),
    continut: text("continut"),
    link: text("link"),
    citit: boolean("citit").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("fundraising_notifications_app_user_idx").on(t.appUserId)],
).enableRLS();

// Jurnal de audit pentru operațiuni financiare/administrative sensibile —
// upload/ștergere factură, schimbare agent, activare/dezactivare cont
// beneficiar, aprobare comunicat. Doar admin/owner îl pot citi.
export const fundraisingAuditLog = pgTable(
  "fundraising_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorAppUserId: uuid("actor_app_user_id").references(() => appUsers.id),
    actiune: text("actiune").notNull(),
    entitate: text("entitate").notNull(),
    entitateId: uuid("entitate_id"),
    detalii: jsonb("detalii"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("fundraising_audit_log_org_idx").on(t.orgId)],
).enableRLS();
