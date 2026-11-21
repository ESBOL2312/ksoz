CREATE TABLE "game_link_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"user_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"claimed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"device_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "game_links_device_id_unique" UNIQUE("device_id"),
	CONSTRAINT "game_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "game_link_codes" ADD CONSTRAINT "game_link_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_links" ADD CONSTRAINT "game_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_link_codes_device_idx" ON "game_link_codes" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "game_link_codes_expires_idx" ON "game_link_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "game_links_user_idx" ON "game_links" USING btree ("user_id");