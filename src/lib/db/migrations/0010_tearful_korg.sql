CREATE TYPE "public"."company_report_status" AS ENUM('generat', 'trimis_canva', 'eroare_canva');--> statement-breakpoint
CREATE TYPE "public"."financial_doc_extractie_status" AS ENUM('in_asteptare', 'ok', 'eroare');--> statement-breakpoint
CREATE TYPE "public"."financial_doc_tip" AS ENUM('balanta', 'bilant');--> statement-breakpoint
CREATE TABLE "canva_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"expira_la" timestamp with time zone NOT NULL,
	"canva_team_id" text,
	"brand_template_id" text,
	"brand_template_nume" text,
	"conectat_de" uuid,
	"conectat_la" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canva_connections_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "canva_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "company_activity_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"an" integer NOT NULL,
	"sursa_financiara_id" uuid,
	"continut" jsonb,
	"status" "company_report_status" DEFAULT 'generat' NOT NULL,
	"canva_design_id" text,
	"canva_edit_url" text,
	"canva_view_url" text,
	"canva_eroare" text,
	"generat_de" uuid,
	"generat_la" timestamp with time zone DEFAULT now() NOT NULL,
	"trimis_canva_la" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "company_activity_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "financial_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"an" integer NOT NULL,
	"tip" "financial_doc_tip" NOT NULL,
	"fisier_path" text NOT NULL,
	"fisier_nume" text NOT NULL,
	"mime_type" text NOT NULL,
	"marime_bytes" integer NOT NULL,
	"incarcat_de" uuid,
	"incarcat_la" timestamp with time zone DEFAULT now() NOT NULL,
	"date_extrase" jsonb,
	"extractie_status" "financial_doc_extractie_status" DEFAULT 'in_asteptare' NOT NULL,
	"extractie_eroare" text,
	"confirmat_de" uuid,
	"confirmat_la" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "financial_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "adresa_sediu" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "judet" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "iban" text;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD COLUMN "oblio_series_name" text;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD COLUMN "oblio_number" text;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD COLUMN "oblio_link" text;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD COLUMN "oblio_invoiced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD COLUMN "oblio_eroare" text;--> statement-breakpoint
ALTER TABLE "canva_connections" ADD CONSTRAINT "canva_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canva_connections" ADD CONSTRAINT "canva_connections_conectat_de_app_users_id_fk" FOREIGN KEY ("conectat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_activity_reports" ADD CONSTRAINT "company_activity_reports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_activity_reports" ADD CONSTRAINT "company_activity_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_activity_reports" ADD CONSTRAINT "company_activity_reports_sursa_financiara_id_financial_documents_id_fk" FOREIGN KEY ("sursa_financiara_id") REFERENCES "public"."financial_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_activity_reports" ADD CONSTRAINT "company_activity_reports_generat_de_app_users_id_fk" FOREIGN KEY ("generat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_incarcat_de_app_users_id_fk" FOREIGN KEY ("incarcat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_documents" ADD CONSTRAINT "financial_documents_confirmat_de_app_users_id_fk" FOREIGN KEY ("confirmat_de") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_activity_reports_company_an_idx" ON "company_activity_reports" USING btree ("company_id","an");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_documents_org_an_tip_idx" ON "financial_documents" USING btree ("org_id","an","tip");