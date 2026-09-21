CREATE TYPE "public"."account_type" AS ENUM('org', 'beneficiar');--> statement-breakpoint
CREATE TYPE "public"."apel_status" AS ENUM('initiat', 'sunand', 'in_desfasurare', 'finalizat', 'esuat', 'fara_raspuns', 'ocupat');--> statement-breakpoint
CREATE TYPE "public"."beneficiar_status" AS ENUM('activ', 'dezactivat');--> statement-breakpoint
CREATE TYPE "public"."calendar_item_status" AS ENUM('de_facut', 'in_lucru', 'publicat', 'finalizat');--> statement-breakpoint
CREATE TYPE "public"."campaign_page_template" AS ENUM('copii', 'animale', 'mediu', 'educatie', 'sanatate', 'social_incluziune', 'cultura', 'sport', 'altele');--> statement-breakpoint
CREATE TYPE "public"."company_contract_status" AS ENUM('trimis', 'asteptare', 'semnat', 'anulat');--> statement-breakpoint
CREATE TYPE "public"."company_stage" AS ENUM('nou', 'pe_viitor', 'email', 'mesaj', 'onepager', 'telefon', 'online', 'contract_trimis', 'contract_semnat', 'contract_asteptare', 'contract_anulat', 'sponsorizat');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('open', 'won', 'lost', 'parked');--> statement-breakpoint
CREATE TYPE "public"."company_temperatura" AS ENUM('cald', 'rece');--> statement-breakpoint
CREATE TYPE "public"."consent_status" AS ENUM('da', 'nu', 'necunoscut');--> statement-breakpoint
CREATE TYPE "public"."continut_canal" AS ENUM('facebook', 'instagram', 'tiktok', 'whatsapp', 'grup_local', 'comunicat');--> statement-breakpoint
CREATE TYPE "public"."continut_status" AS ENUM('draft', 'aprobat', 'publicat');--> statement-breakpoint
CREATE TYPE "public"."continut_sursa" AS ENUM('sablon', 'ai');--> statement-breakpoint
CREATE TYPE "public"."fundraising_donation_status" AS ENUM('in_asteptare', 'reusita', 'esuata', 'rambursata');--> statement-breakpoint
CREATE TYPE "public"."fundraising_page_status" AS ENUM('activa', 'inchisa');--> statement-breakpoint
CREATE TYPE "public"."invoice_categorie" AS ENUM('factura', 'plata', 'chitanta', 'proforma');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('achitata', 'in_asteptare');--> statement-breakpoint
CREATE TYPE "public"."local_group_platforma" AS ENUM('facebook', 'whatsapp', 'altul');--> statement-breakpoint
CREATE TYPE "public"."local_group_status" AS ENUM('activ', 'inactiv');--> statement-breakpoint
CREATE TYPE "public"."media_contact_tip" AS ENUM('publicatie', 'tv', 'radio', 'site');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."org_domeniu_activitate" AS ENUM('copii', 'animale', 'mediu', 'educatie', 'sanatate', 'social_incluziune', 'cultura', 'sport', 'altele');--> statement-breakpoint
CREATE TYPE "public"."org_package" AS ENUM('trial', 'start', 'crestere', 'impact', 'custom');--> statement-breakpoint
CREATE TYPE "public"."press_release_status" AS ENUM('draft', 'aprobat');--> statement-breakpoint
CREATE TYPE "public"."regim_fiscal" AS ENUM('profit', 'micro', 'pierdere', 'necunoscut');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('de_facut', 'finalizata');--> statement-breakpoint
CREATE TYPE "public"."task_tip" AS ENUM('generala', 'sponsorizare');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"account_type" "account_type",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "app_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_app_user_id" uuid,
	"actiune" text NOT NULL,
	"entitate" text NOT NULL,
	"entitate_id" uuid,
	"detalii" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_user_id" uuid NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" "beneficiar_status" DEFAULT 'activ' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fundraising_beneficiaries_app_user_id_unique" UNIQUE("app_user_id")
);
--> statement-breakpoint
ALTER TABLE "fundraising_beneficiaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_beneficiary_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "fundraising_beneficiary_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "fundraising_beneficiary_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_calendar_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"ziua" date NOT NULL,
	"obiectiv" text NOT NULL,
	"canal_recomandat" text NOT NULL,
	"text_pregatit" text NOT NULL,
	"materiale_necesare" text,
	"indemn" text,
	"status" "calendar_item_status" DEFAULT 'de_facut' NOT NULL,
	"data_limita" date,
	"observatii_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_calendar_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_campaign_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_user_id" uuid NOT NULL,
	"agent_nume" text,
	"agent_email" text NOT NULL,
	"bio" text,
	"program_disponibilitate" text,
	"contact_aprobat" text,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_campaign_agents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_generated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"canal" "continut_canal" NOT NULL,
	"titlu" text,
	"text_complet" text NOT NULL,
	"text_scurt" text,
	"indemn" text,
	"sursa" "continut_sursa" DEFAULT 'sablon' NOT NULL,
	"status" "continut_status" DEFAULT 'draft' NOT NULL,
	"aprobat_de" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_generated_content" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_group_posting_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"marcat_de" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_group_posting_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"denumire" text NOT NULL,
	"suma" integer NOT NULL,
	"moneda" text DEFAULT 'RON' NOT NULL,
	"data" date NOT NULL,
	"categorie" "invoice_categorie" NOT NULL,
	"observatii" text,
	"fisier_url" text,
	"status" "invoice_status" DEFAULT 'achitata' NOT NULL,
	"incarcat_de" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_local_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"judet" text NOT NULL,
	"localitate" text,
	"platforma" "local_group_platforma" NOT NULL,
	"nume" text NOT NULL,
	"link" text NOT NULL,
	"categorie" text,
	"reguli" text,
	"status" "local_group_status" DEFAULT 'activ' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_local_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_media_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"judet" text NOT NULL,
	"tip" "media_contact_tip" NOT NULL,
	"nume_redactie" text NOT NULL,
	"email" text,
	"telefon" text,
	"website" text,
	"persoana_contact" text,
	"status_contactare" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_media_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"sender_app_user_id" uuid NOT NULL,
	"sender_nume" text,
	"sender_email" text NOT NULL,
	"continut" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"citit_la" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "fundraising_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_user_id" uuid NOT NULL,
	"tip" text NOT NULL,
	"titlu" text NOT NULL,
	"continut" text,
	"link" text,
	"citit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_press_outreach_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"press_release_id" uuid NOT NULL,
	"media_contact_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"data_trimiterii" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'trimis' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_press_outreach_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_press_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"continut" text NOT NULL,
	"status" "press_release_status" DEFAULT 'draft' NOT NULL,
	"aprobat_de" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_press_releases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_task_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"fisier_url" text NOT NULL,
	"denumire" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_task_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"tip" "task_tip" DEFAULT 'generala' NOT NULL,
	"titlu" text NOT NULL,
	"descriere" text,
	"data_limita" date,
	"status" "task_status" DEFAULT 'de_facut' NOT NULL,
	"companie" text,
	"suma" integer,
	"moneda" text,
	"text_multumire" text,
	"canal_recomandat" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "fundraising_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nume" text NOT NULL,
	"cui" text,
	"nr_reg_com" text,
	"judet" text,
	"localitate" text,
	"adresa" text,
	"cod_postal" text,
	"caen" text,
	"industrie" text,
	"an_infiintare" integer,
	"site" text,
	"linkedin" text,
	"facebook" text,
	"administrator" text,
	"ca" bigint,
	"profit" bigint,
	"profit_tip" text,
	"impozit" bigint,
	"nr_angajati" integer,
	"sursa_fin" text,
	"an_bilant" integer,
	"regim_fiscal" "regim_fiscal" DEFAULT 'necunoscut' NOT NULL,
	"suma_disponibila" bigint,
	"suma_estimata" boolean DEFAULT false NOT NULL,
	"suma_propusa" bigint,
	"suma_sponsorizata" bigint,
	"recurent" boolean DEFAULT false NOT NULL,
	"frecventa" text,
	"campanie_230" boolean DEFAULT false NOT NULL,
	"temperatura" "company_temperatura",
	"d177" boolean DEFAULT false NOT NULL,
	"d177_incasat" boolean DEFAULT false NOT NULL,
	"mec20" boolean DEFAULT false NOT NULL,
	"decembrie" boolean DEFAULT false NOT NULL,
	"numar_contract" text,
	"data_semnare" date,
	"contract_status" "company_contract_status",
	"stage" "company_stage" DEFAULT 'nou' NOT NULL,
	"status" "company_status" DEFAULT 'open' NOT NULL,
	"lost_reason" text,
	"probability" integer,
	"owner_id" uuid,
	"followup_at" timestamp with time zone,
	"close_target" date,
	"media" jsonb,
	"trimestre" jsonb,
	"istoric" jsonb,
	"ong" jsonb,
	"extra" jsonb,
	"abordare_prin" text,
	"stil_abordare" text,
	"nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "apeluri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"company_id" uuid,
	"catre_nume" text,
	"catre_telefon" text NOT NULL,
	"initiator_id" uuid,
	"twilio_call_sid" text,
	"status" "apel_status" DEFAULT 'initiat' NOT NULL,
	"durata_secunde" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "apeluri" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_notite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"editat_la" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "company_notite" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_sponsorizari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"suma" integer NOT NULL,
	"data" date NOT NULL,
	"proiect" text,
	"nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "company_sponsorizari" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_stage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_stage_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"nume" text NOT NULL,
	"rol" text,
	"dept" text,
	"loc" text,
	"email" text,
	"telefon" text,
	"linkedin" text,
	"detalii" text,
	"cheie" boolean DEFAULT false NOT NULL,
	"consent_status" "consent_status" DEFAULT 'necunoscut' NOT NULL,
	"consent_at" timestamp with time zone,
	"consent_source" text,
	"consent_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "crm_kv" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"path" text NOT NULL,
	"data" jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "crm_kv" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "formular230_beneficiari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nume" text NOT NULL,
	"slug" text NOT NULL,
	"short_code" text,
	"iban" text,
	"cif" text,
	"email_beneficiar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formular230_beneficiari_short_code_unique" UNIQUE("short_code"),
	CONSTRAINT "formular230_beneficiari_org_slug_unique" UNIQUE("org_id","slug")
);
--> statement-breakpoint
ALTER TABLE "formular230_beneficiari" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "formular230_campanii_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"an" integer NOT NULL,
	"nr_destinatari" integer NOT NULL,
	"trimis_de" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formular230_campanii_email_org_an_unique" UNIQUE("org_id","an")
);
--> statement-breakpoint
ALTER TABLE "formular230_campanii_email" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "formular230_submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"beneficiar_id" uuid,
	"nume" text NOT NULL,
	"prenume" text NOT NULL,
	"initiala_tatalui" text,
	"cnp" text NOT NULL,
	"email" text NOT NULL,
	"telefon" text,
	"strada" text,
	"numar" text,
	"judet" text,
	"localitate" text,
	"cod_postal" text,
	"bloc" text,
	"scara" text,
	"etaj" text,
	"apartament" text,
	"distributie_2_ani" boolean DEFAULT false NOT NULL,
	"consimtamant" boolean DEFAULT false NOT NULL,
	"termeni" boolean DEFAULT false NOT NULL,
	"semnatura" text NOT NULL,
	"an" integer,
	"procesat_anaf" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "formular230_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "donator_notite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"donator_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"editat_la" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "donator_notite" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "donatori_reali" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"nume" text NOT NULL,
	"email" text NOT NULL,
	"telefon" text,
	"sursa" text NOT NULL,
	"metoda_plata" text DEFAULT 'Card (Stripe)' NOT NULL,
	"total_donat" integer DEFAULT 0 NOT NULL,
	"numar_donatii" integer DEFAULT 0 NOT NULL,
	"prima_donatie_la" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_donatie_la" timestamp with time zone DEFAULT now() NOT NULL,
	"consimtamant_whatsapp" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donatori_reali" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_donations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"nume_donator" text,
	"email_donator" text,
	"telefon_donator" text,
	"suma" integer NOT NULL,
	"mesaj" text,
	"anonim" boolean DEFAULT false NOT NULL,
	"consimtamant_gdpr" boolean DEFAULT false NOT NULL,
	"consimtamant_termeni" boolean DEFAULT false NOT NULL,
	"consimtamant_whatsapp" boolean DEFAULT false NOT NULL,
	"stripe_session_id" text NOT NULL,
	"recurenta" boolean DEFAULT false NOT NULL,
	"stripe_subscription_id" text,
	"stripe_payment_intent_id" text,
	"abonament_activ" boolean DEFAULT true NOT NULL,
	"status" "fundraising_donation_status" DEFAULT 'in_asteptare' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_donations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_pages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"titlu" text NOT NULL,
	"poveste" text NOT NULL,
	"imagine_url" text,
	"suma_tinta" integer,
	"suma_stransa" integer DEFAULT 0 NOT NULL,
	"nume_creator" text NOT NULL,
	"email_creator" text NOT NULL,
	"judet" text,
	"localitate" text,
	"consimtamant_gdpr" boolean DEFAULT false NOT NULL,
	"status" "fundraising_page_status" DEFAULT 'activa' NOT NULL,
	"template" "campaign_page_template" DEFAULT 'altele' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fundraising_updates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"page_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"titlu" text NOT NULL,
	"continut" text NOT NULL,
	"data" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fundraising_updates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"slogan" text,
	"brand_color" text,
	"custom_domain" text,
	"cif" text,
	"domeniu_activitate" "org_domeniu_activitate",
	"package" "org_package" DEFAULT 'trial' NOT NULL,
	"custom_plan_config" jsonb,
	"subscription_status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp with time zone,
	"referral_code" text,
	"referred_by_org_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_custom_domain_unique" UNIQUE("custom_domain"),
	CONSTRAINT "organizations_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"org_name" text NOT NULL,
	"email" text NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fundraising_audit_log" ADD CONSTRAINT "fundraising_audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_audit_log" ADD CONSTRAINT "fundraising_audit_log_actor_app_user_id_app_users_id_fk" FOREIGN KEY ("actor_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_beneficiaries" ADD CONSTRAINT "fundraising_beneficiaries_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_beneficiaries" ADD CONSTRAINT "fundraising_beneficiaries_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_beneficiaries" ADD CONSTRAINT "fundraising_beneficiaries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_beneficiary_invites" ADD CONSTRAINT "fundraising_beneficiary_invites_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_beneficiary_invites" ADD CONSTRAINT "fundraising_beneficiary_invites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_beneficiary_invites" ADD CONSTRAINT "fundraising_beneficiary_invites_invited_by_app_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_calendar_items" ADD CONSTRAINT "fundraising_calendar_items_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_calendar_items" ADD CONSTRAINT "fundraising_calendar_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_campaign_agents" ADD CONSTRAINT "fundraising_campaign_agents_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_campaign_agents" ADD CONSTRAINT "fundraising_campaign_agents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_campaign_agents" ADD CONSTRAINT "fundraising_campaign_agents_agent_user_id_app_users_id_fk" FOREIGN KEY ("agent_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_campaign_agents" ADD CONSTRAINT "fundraising_campaign_agents_assigned_by_app_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_generated_content" ADD CONSTRAINT "fundraising_generated_content_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_generated_content" ADD CONSTRAINT "fundraising_generated_content_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_generated_content" ADD CONSTRAINT "fundraising_generated_content_aprobat_de_app_users_id_fk" FOREIGN KEY ("aprobat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_group_posting_history" ADD CONSTRAINT "fundraising_group_posting_history_group_id_fundraising_local_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."fundraising_local_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_group_posting_history" ADD CONSTRAINT "fundraising_group_posting_history_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_group_posting_history" ADD CONSTRAINT "fundraising_group_posting_history_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_group_posting_history" ADD CONSTRAINT "fundraising_group_posting_history_marcat_de_app_users_id_fk" FOREIGN KEY ("marcat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_invoices" ADD CONSTRAINT "fundraising_invoices_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_invoices" ADD CONSTRAINT "fundraising_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_invoices" ADD CONSTRAINT "fundraising_invoices_incarcat_de_app_users_id_fk" FOREIGN KEY ("incarcat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_local_groups" ADD CONSTRAINT "fundraising_local_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_media_contacts" ADD CONSTRAINT "fundraising_media_contacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_messages" ADD CONSTRAINT "fundraising_messages_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_messages" ADD CONSTRAINT "fundraising_messages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_messages" ADD CONSTRAINT "fundraising_messages_sender_app_user_id_app_users_id_fk" FOREIGN KEY ("sender_app_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_notifications" ADD CONSTRAINT "fundraising_notifications_app_user_id_app_users_id_fk" FOREIGN KEY ("app_user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_press_outreach_history" ADD CONSTRAINT "fundraising_press_outreach_history_press_release_id_fundraising_press_releases_id_fk" FOREIGN KEY ("press_release_id") REFERENCES "public"."fundraising_press_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_press_outreach_history" ADD CONSTRAINT "fundraising_press_outreach_history_media_contact_id_fundraising_media_contacts_id_fk" FOREIGN KEY ("media_contact_id") REFERENCES "public"."fundraising_media_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_press_outreach_history" ADD CONSTRAINT "fundraising_press_outreach_history_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_press_releases" ADD CONSTRAINT "fundraising_press_releases_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_press_releases" ADD CONSTRAINT "fundraising_press_releases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_press_releases" ADD CONSTRAINT "fundraising_press_releases_aprobat_de_app_users_id_fk" FOREIGN KEY ("aprobat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_task_attachments" ADD CONSTRAINT "fundraising_task_attachments_task_id_fundraising_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."fundraising_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_task_attachments" ADD CONSTRAINT "fundraising_task_attachments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_tasks" ADD CONSTRAINT "fundraising_tasks_campaign_page_id_fundraising_pages_id_fk" FOREIGN KEY ("campaign_page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_tasks" ADD CONSTRAINT "fundraising_tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_tasks" ADD CONSTRAINT "fundraising_tasks_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_app_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_updated_by_app_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apeluri" ADD CONSTRAINT "apeluri_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apeluri" ADD CONSTRAINT "apeluri_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apeluri" ADD CONSTRAINT "apeluri_initiator_id_app_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_notite" ADD CONSTRAINT "company_notite_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_notite" ADD CONSTRAINT "company_notite_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_notite" ADD CONSTRAINT "company_notite_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_sponsorizari" ADD CONSTRAINT "company_sponsorizari_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_sponsorizari" ADD CONSTRAINT "company_sponsorizari_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_sponsorizari" ADD CONSTRAINT "company_sponsorizari_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_stage_log" ADD CONSTRAINT "company_stage_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_stage_log" ADD CONSTRAINT "company_stage_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_stage_log" ADD CONSTRAINT "company_stage_log_by_user_id_app_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_consent_by_app_users_id_fk" FOREIGN KEY ("consent_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_kv" ADD CONSTRAINT "crm_kv_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formular230_beneficiari" ADD CONSTRAINT "formular230_beneficiari_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formular230_campanii_email" ADD CONSTRAINT "formular230_campanii_email_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formular230_campanii_email" ADD CONSTRAINT "formular230_campanii_email_trimis_de_app_users_id_fk" FOREIGN KEY ("trimis_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formular230_submissions" ADD CONSTRAINT "formular230_submissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formular230_submissions" ADD CONSTRAINT "formular230_submissions_beneficiar_id_formular230_beneficiari_id_fk" FOREIGN KEY ("beneficiar_id") REFERENCES "public"."formular230_beneficiari"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donator_notite" ADD CONSTRAINT "donator_notite_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donator_notite" ADD CONSTRAINT "donator_notite_donator_id_donatori_reali_id_fk" FOREIGN KEY ("donator_id") REFERENCES "public"."donatori_reali"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donator_notite" ADD CONSTRAINT "donator_notite_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donatori_reali" ADD CONSTRAINT "donatori_reali_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_donations" ADD CONSTRAINT "fundraising_donations_page_id_fundraising_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_donations" ADD CONSTRAINT "fundraising_donations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_pages" ADD CONSTRAINT "fundraising_pages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_updates" ADD CONSTRAINT "fundraising_updates_page_id_fundraising_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."fundraising_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraising_updates" ADD CONSTRAINT "fundraising_updates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_referred_by_org_id_organizations_id_fk" FOREIGN KEY ("referred_by_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_app_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fundraising_audit_log_org_idx" ON "fundraising_audit_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_beneficiaries_campaign_idx" ON "fundraising_beneficiaries" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_beneficiaries_org_idx" ON "fundraising_beneficiaries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_beneficiary_invites_campaign_idx" ON "fundraising_beneficiary_invites" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_beneficiary_invites_org_idx" ON "fundraising_beneficiary_invites" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_beneficiary_invites_email_idx" ON "fundraising_beneficiary_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "fundraising_calendar_items_campaign_idx" ON "fundraising_calendar_items" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_calendar_items_org_idx" ON "fundraising_calendar_items" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fundraising_calendar_items_campaign_ziua_idx" ON "fundraising_calendar_items" USING btree ("campaign_page_id","ziua");--> statement-breakpoint
CREATE INDEX "fundraising_campaign_agents_campaign_idx" ON "fundraising_campaign_agents" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_campaign_agents_org_idx" ON "fundraising_campaign_agents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_generated_content_campaign_idx" ON "fundraising_generated_content" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_generated_content_org_idx" ON "fundraising_generated_content" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_group_posting_history_group_idx" ON "fundraising_group_posting_history" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "fundraising_group_posting_history_campaign_idx" ON "fundraising_group_posting_history" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_group_posting_history_org_idx" ON "fundraising_group_posting_history" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_invoices_campaign_idx" ON "fundraising_invoices" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_invoices_org_idx" ON "fundraising_invoices" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_local_groups_org_idx" ON "fundraising_local_groups" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_local_groups_judet_idx" ON "fundraising_local_groups" USING btree ("judet");--> statement-breakpoint
CREATE INDEX "fundraising_media_contacts_org_idx" ON "fundraising_media_contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_media_contacts_judet_idx" ON "fundraising_media_contacts" USING btree ("judet");--> statement-breakpoint
CREATE INDEX "fundraising_messages_campaign_idx" ON "fundraising_messages" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_messages_org_idx" ON "fundraising_messages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_notifications_app_user_idx" ON "fundraising_notifications" USING btree ("app_user_id");--> statement-breakpoint
CREATE INDEX "fundraising_press_outreach_history_release_idx" ON "fundraising_press_outreach_history" USING btree ("press_release_id");--> statement-breakpoint
CREATE INDEX "fundraising_press_outreach_history_org_idx" ON "fundraising_press_outreach_history" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_press_releases_campaign_idx" ON "fundraising_press_releases" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_press_releases_org_idx" ON "fundraising_press_releases" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_task_attachments_task_idx" ON "fundraising_task_attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "fundraising_task_attachments_org_idx" ON "fundraising_task_attachments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_tasks_campaign_idx" ON "fundraising_tasks" USING btree ("campaign_page_id");--> statement-breakpoint
CREATE INDEX "fundraising_tasks_org_idx" ON "fundraising_tasks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "companies_org_idx" ON "companies" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "companies_judet_idx" ON "companies" USING btree ("judet");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "companies_stage_idx" ON "companies" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "companies_owner_idx" ON "companies" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "companies_cui_idx" ON "companies" USING btree ("cui");--> statement-breakpoint
CREATE INDEX "apeluri_org_idx" ON "apeluri" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "apeluri_company_idx" ON "apeluri" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "apeluri_created_at_idx" ON "apeluri" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "company_notite_org_idx" ON "company_notite" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "company_notite_company_idx" ON "company_notite" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_sponsorizari_org_idx" ON "company_sponsorizari" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "company_sponsorizari_company_idx" ON "company_sponsorizari" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_sponsorizari_data_idx" ON "company_sponsorizari" USING btree ("data");--> statement-breakpoint
CREATE INDEX "company_stage_log_org_idx" ON "company_stage_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "company_stage_log_company_idx" ON "company_stage_log" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "contacts_org_idx" ON "contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "contacts_company_idx" ON "contacts" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_kv_org_path_unique" ON "crm_kv" USING btree ("org_id","path");--> statement-breakpoint
CREATE INDEX "crm_kv_org_idx" ON "crm_kv" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "formular230_org_idx" ON "formular230_submissions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "formular230_created_idx" ON "formular230_submissions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "formular230_beneficiar_idx" ON "formular230_submissions" USING btree ("beneficiar_id");--> statement-breakpoint
CREATE INDEX "donator_notite_org_idx" ON "donator_notite" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "donator_notite_donator_idx" ON "donator_notite" USING btree ("donator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "donatori_reali_org_email_idx" ON "donatori_reali" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX "donatori_reali_org_idx" ON "donatori_reali" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_donations_page_idx" ON "fundraising_donations" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "fundraising_donations_org_idx" ON "fundraising_donations" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fundraising_donations_stripe_session_idx" ON "fundraising_donations" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "fundraising_donations_payment_intent_idx" ON "fundraising_donations" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fundraising_pages_org_slug_idx" ON "fundraising_pages" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "fundraising_pages_org_idx" ON "fundraising_pages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "fundraising_updates_page_idx" ON "fundraising_updates" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "fundraising_updates_org_idx" ON "fundraising_updates" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_unique" ON "memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "invites_org_idx" ON "invites" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "invites_email_idx" ON "invites" USING btree ("email");