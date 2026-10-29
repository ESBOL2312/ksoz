CREATE TYPE "public"."item_category" AS ENUM('kiim', 'uy', 'mal', 'aspap');--> statement-breakpoint
CREATE TYPE "public"."ledger_reason" AS ENUM('review', 'task', 'purchase', 'prize');--> statement-breakpoint
CREATE TYPE "public"."level" AS ENUM('A1', 'A2', 'B1', 'B2');--> statement-breakpoint
CREATE TYPE "public"."srs_phase" AS ENUM('learning', 'review');--> statement-breakpoint
CREATE TYPE "public"."word_source" AS ENUM('lesson', 'bazaar');--> statement-breakpoint
CREATE TYPE "public"."verdict" AS ENUM('correct', 'almost', 'wrong');--> statement-breakpoint
CREATE TYPE "public"."word_status" AS ENUM('draft', 'reviewed', 'published');--> statement-breakpoint
CREATE TABLE "altyn_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"delta" integer NOT NULL,
	"reason" "ledger_reason" NOT NULL,
	"ref_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_kk" text NOT NULL,
	"name_ru" text NOT NULL,
	CONSTRAINT "cities_name_kk_unique" UNIQUE("name_kk")
);
--> statement-breakpoint
CREATE TABLE "daily_tasks" (
	"user_id" bigint NOT NULL,
	"day" date NOT NULL,
	"code" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"target" integer NOT NULL,
	"reward" integer NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "daily_tasks_user_id_day_code_pk" PRIMARY KEY("user_id","day","code")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"user_id" bigint NOT NULL,
	"friend_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_user_id_friend_id_pk" PRIMARY KEY("user_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"category" "item_category" NOT NULL,
	"price" integer NOT NULL,
	"min_level" "level" DEFAULT 'A1' NOT NULL,
	"slot" text NOT NULL,
	CONSTRAINT "items_word_unique" UNIQUE("word_id")
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" bigint NOT NULL,
	"word_id" integer NOT NULL,
	"input" text NOT NULL,
	"verdict" "verdict" NOT NULL,
	"hints" smallint DEFAULT 0 NOT NULL,
	"ms" integer DEFAULT 0 NOT NULL,
	"step_before" smallint,
	"due_before" timestamp with time zone,
	"due_after" timestamp with time zone NOT NULL,
	"altyn" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_kk" text NOT NULL,
	"name_ru" text NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_items" (
	"user_id" bigint NOT NULL,
	"item_id" integer NOT NULL,
	"equipped" boolean DEFAULT false NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_items_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "user_words" (
	"user_id" bigint NOT NULL,
	"word_id" integer NOT NULL,
	"phase" "srs_phase" DEFAULT 'learning' NOT NULL,
	"step" smallint DEFAULT 0 NOT NULL,
	"ease" double precision DEFAULT 2.5 NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"source" "word_source" DEFAULT 'lesson' NOT NULL,
	"introduced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	CONSTRAINT "user_words_user_id_word_id_pk" PRIMARY KEY("user_id","word_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"username" text,
	"language_code" text,
	"level" "level" DEFAULT 'A1' NOT NULL,
	"city_id" integer,
	"timezone" text DEFAULT 'Asia/Almaty' NOT NULL,
	"altyn" integer DEFAULT 0 NOT NULL,
	"combo" integer DEFAULT 0 NOT NULL,
	"streak_current" integer DEFAULT 0 NOT NULL,
	"streak_best" integer DEFAULT 0 NOT NULL,
	"last_active_day" date,
	"aul_stage" integer DEFAULT 0 NOT NULL,
	"notify" jsonb DEFAULT '{"short":true,"daily":true,"streak":true,"baige":true}'::jsonb NOT NULL,
	"referrer_id" bigint,
	"bot_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_scores" (
	"week" text NOT NULL,
	"user_id" bigint NOT NULL,
	"city_id" integer,
	"score" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "weekly_scores_week_user_id_pk" PRIMARY KEY("week","user_id")
);
--> statement-breakpoint
CREATE TABLE "word_examples" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"kk" text NOT NULL,
	"ru" text NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_topics" (
	"word_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	CONSTRAINT "word_topics_word_id_topic_id_pk" PRIMARY KEY("word_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" serial PRIMARY KEY NOT NULL,
	"kk" text NOT NULL,
	"kk_latn" text,
	"ru" text NOT NULL,
	"en" text,
	"level" "level" DEFAULT 'A1' NOT NULL,
	"image_url" text,
	"audio_url" text,
	"status" "word_status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "words_kk_unique" UNIQUE("kk")
);
--> statement-breakpoint
ALTER TABLE "altyn_ledger" ADD CONSTRAINT "altyn_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_scores" ADD CONSTRAINT "weekly_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_scores" ADD CONSTRAINT "weekly_scores_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_examples" ADD CONSTRAINT "word_examples_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_topics" ADD CONSTRAINT "word_topics_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_topics" ADD CONSTRAINT "word_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "altyn_ledger_user_idx" ON "altyn_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "friendships_friend_idx" ON "friendships" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX "notification_log_user_kind_idx" ON "notification_log" USING btree ("user_id","kind","sent_at");--> statement-breakpoint
CREATE INDEX "reviews_user_created_idx" ON "reviews" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_words_due_idx" ON "user_words" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "users_city_idx" ON "users" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "weekly_scores_week_score_idx" ON "weekly_scores" USING btree ("week","score");--> statement-breakpoint
CREATE INDEX "weekly_scores_week_city_score_idx" ON "weekly_scores" USING btree ("week","city_id","score");--> statement-breakpoint
CREATE INDEX "word_examples_word_idx" ON "word_examples" USING btree ("word_id","position");--> statement-breakpoint
CREATE INDEX "word_topics_topic_idx" ON "word_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "words_level_status_idx" ON "words" USING btree ("level","status");