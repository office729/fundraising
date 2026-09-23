CREATE TABLE "auth_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actiune" text NOT NULL,
	"identificator" text NOT NULL,
	"incercari" integer DEFAULT 1 NOT NULL,
	"fereastra_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_rate_limits_actiune_identificator_idx" ON "auth_rate_limits" USING btree ("actiune","identificator");