import { boolean, date, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { companies } from "./companies";
import { contacts } from "./contacts";
import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";

// Agentul email (documentation/agent-email.sql): căsuța de email a fiecărui utilizator, ciornele și emailurile trimise, răspunsurile etichetate, PDF-urile atașate și contorul zilnic.
export const agentEmailConturi = pgTable(
  "agent_email_conturi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    adresa: text("adresa").notNull(),
    semnatura: text("semnatura").notNull().default(""),
    smtpHost: text("smtp_host").notNull(),
    smtpPort: integer("smtp_port").notNull(),
    smtpUser: text("smtp_user").notNull(),
    imapHost: text("imap_host").notNull(),
    imapPort: integer("imap_port").notNull().default(993),
    imapUser: text("imap_user").notNull(),
    // Parola căsuței, criptată (lib/secret-box.ts); nu pleacă niciodată spre browser.
    parolaEnc: text("parola_enc").notNull(),
    amprenta: text("amprenta").notNull().default(""),
    smtpTestatLa: timestamp("smtp_testat_la", { withTimezone: true }),
    smtpEroare: text("smtp_eroare"),
    imapTestatLa: timestamp("imap_testat_la", { withTimezone: true }),
    imapEroare: text("imap_eroare"),
    imapBlocatPana: timestamp("imap_blocat_pana", { withTimezone: true }),
    imapVerificatLa: timestamp("imap_verificat_la", { withTimezone: true }),
    imapNoi: integer("imap_noi").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("agent_email_conturi_unic").on(t.orgId, t.userId)],
).enableRLS();

export const agentEmailMesaje = pgTable(
  "agent_email_mesaje",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    firmaNume: text("firma_nume").notNull(),
    catreNume: text("catre_nume").notNull(),
    catreEmail: text("catre_email").notNull(),
    catreRol: text("catre_rol"),
    deUserId: uuid("de_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    deNume: text("de_nume").notNull(),
    deEmail: text("de_email").notNull(),
    subiect: text("subiect").notNull(),
    mesaj: text("mesaj").notNull(),
    subiectAlt: text("subiect_alt"),
    subiectAles: text("subiect_ales"),
    aiSubiect: text("ai_subiect"),
    aiMesaj: text("ai_mesaj"),
    mecanism: text("mecanism").notNull().default("sponsorizare"), // sponsorizare | d177 | caz
    cazPageId: uuid("caz_page_id").references(() => fundraisingPages.id, { onDelete: "set null" }),
    cazNume: text("caz_nume"),
    istoric: text("istoric"),
    tip: text("tip").notNull().default("prim"), // prim | revenire
    revenireLa: uuid("revenire_la"),
    stare: text("stare").notNull().default("ciorna"), // ciorna | se_trimite | trimis | eroare
    eroare: text("eroare"),
    creatDe: uuid("creat_de").references(() => appUsers.id, { onDelete: "set null" }),
    creatDeNume: text("creat_de_nume"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    seTrimiteLa: timestamp("se_trimite_la", { withTimezone: true }),
    trimisLa: timestamp("trimis_la", { withTimezone: true }),
    aprobatDe: uuid("aprobat_de").references(() => appUsers.id, { onDelete: "set null" }),
    aprobatDeNume: text("aprobat_de_nume"),
    aprobatLa: timestamp("aprobat_la", { withTimezone: true }),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    referinte: text("referinte"),
    pixel: text("pixel"),
    deschisPrima: timestamp("deschis_prima", { withTimezone: true }),
    deschisUltima: timestamp("deschis_ultima", { withTimezone: true }),
    deschisNr: integer("deschis_nr").notNull().default(0),
    pdfHash: text("pdf_hash"),
    pdfNume: text("pdf_nume"),
    salutGhicit: boolean("salut_ghicit").notNull().default(false),
    apelLa: timestamp("apel_la", { withTimezone: true }),
    apelFacutLa: timestamp("apel_facut_la", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("agent_email_mesaje_message_id_unic").on(t.orgId, t.messageId),
    index("agent_email_mesaje_org_stare_idx").on(t.orgId, t.stare, t.createdAt),
    index("agent_email_mesaje_firma_idx").on(t.orgId, t.companyId, t.createdAt),
    index("agent_email_mesaje_expeditor_idx").on(t.orgId, t.deUserId, t.stare),
  ],
).enableRLS();

export const agentEmailRaspunsuri = pgTable(
  "agent_email_raspunsuri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    mesajId: uuid("mesaj_id").notNull().references(() => agentEmailMesaje.id, { onDelete: "cascade" }),
    messageIdRaspuns: text("message_id_raspuns").notNull(),
    deLa: text("de_la").notNull(),
    primitLa: timestamp("primit_la", { withTimezone: true }).notNull(),
    subiect: text("subiect").notNull().default(""),
    fragment: text("fragment").notNull().default(""),
    eticheta: text("eticheta").notNull().default("altul"),
    automat: boolean("automat").notNull().default(false),
    citit: boolean("citit").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("agent_email_raspunsuri_unic").on(t.orgId, t.messageIdRaspuns), index("agent_email_raspunsuri_mesaj_idx").on(t.orgId, t.mesajId, t.primitLa)],
).enableRLS();

export const agentEmailPdf = pgTable(
  "agent_email_pdf",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    // null = PDF-ul general al organizației; altfel PDF-ul unei firme (One Pager personalizat).
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    nume: text("nume").notNull(),
    continutB64: text("continut_b64").notNull(),
    marime: integer("marime").notNull(),
    hash: text("hash").notNull(),
    incarcatDe: uuid("incarcat_de").references(() => appUsers.id, { onDelete: "set null" }),
    incarcatDeNume: text("incarcat_de_nume"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("agent_email_pdf_org_idx").on(t.orgId, t.companyId)],
).enableRLS();

export const agentEmailContor = pgTable(
  "agent_email_contor",
  {
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    zi: date("zi", { mode: "string" }).notNull(),
    nr: integer("nr").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId, t.zi] })],
).enableRLS();

export const agentEmailSetari = pgTable("agent_email_setari", {
  orgId: uuid("org_id").primaryKey().references(() => organizations.id, { onDelete: "cascade" }),
  limitaZi: integer("limita_zi").notNull().default(40),
  pixelActiv: boolean("pixel_activ").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
