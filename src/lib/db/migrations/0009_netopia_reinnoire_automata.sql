ALTER TABLE "organizations" ADD COLUMN "netopia_card_token_enc" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "netopia_card_masked" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "netopia_card_expire_month" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "netopia_card_expire_year" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "netopia_auto_renew" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "netopia_renewal_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "netopia_renewal_failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform_payments" ADD COLUMN "renewal" boolean DEFAULT false NOT NULL;