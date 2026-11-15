CREATE TYPE "public"."word_kind" AS ENUM('word', 'phrase');--> statement-breakpoint
ALTER TYPE "public"."ledger_reason" ADD VALUE 'quest';--> statement-breakpoint
ALTER TYPE "public"."word_source" ADD VALUE 'quest';--> statement-breakpoint
CREATE TABLE "user_quests" (
	"user_id" bigint NOT NULL,
	"quest_slug" text NOT NULL,
	"steps_done" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "user_quests_user_id_quest_slug_pk" PRIMARY KEY("user_id","quest_slug")
);
--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "kind" "word_kind" DEFAULT 'word' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_quests" ADD CONSTRAINT "user_quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;