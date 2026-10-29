ALTER TABLE "reviews" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "imported_at" timestamp with time zone;