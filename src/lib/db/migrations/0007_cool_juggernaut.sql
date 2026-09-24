-- Recuperare de drift: schema Drizzle avea deja aceste obiecte (coloanele ANAF pe
-- companies și tabelul company_stage_log), aplicate în producție manual, dar
-- nicio migrație nu le crea — un mediu nou construit din migrații ar fi picat la
-- "Verifică ANAF" și la fișa firmei. Totul e idempotent (IF NOT EXISTS / duplicate_object),
-- deci rulează fără efect acolo unde obiectele există deja.
CREATE TABLE IF NOT EXISTS "company_stage_log" (
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
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "anaf_activ" boolean;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "anaf_verificat_la" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "company_stage_log" ADD CONSTRAINT "company_stage_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "company_stage_log" ADD CONSTRAINT "company_stage_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "company_stage_log" ADD CONSTRAINT "company_stage_log_by_user_id_app_users_id_fk" FOREIGN KEY ("by_user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_stage_log_org_idx" ON "company_stage_log" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_stage_log_company_idx" ON "company_stage_log" USING btree ("company_id","created_at");
