CREATE TYPE "public"."platform_payment_status" AS ENUM('in_asteptare', 'reusita', 'esuata', 'anulata', 'rambursata');--> statement-breakpoint
CREATE TABLE "platform_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"order_id" text NOT NULL,
	"ntp_id" text,
	"package" "org_package" NOT NULL,
	"suma_lei" integer NOT NULL,
	"luni" integer DEFAULT 1 NOT NULL,
	"plan_config" jsonb,
	"status" "platform_payment_status" DEFAULT 'in_asteptare' NOT NULL,
	"netopia_status" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "platform_payments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "platform_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "donation_stripe_secret_enc" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "donation_stripe_webhook_secret_enc" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "donation_stripe_key_hint" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "donation_stripe_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_payments_org_idx" ON "platform_payments" USING btree ("org_id");