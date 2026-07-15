CREATE TYPE "public"."quest_difficulty" AS ENUM('trivial', 'easy', 'normal', 'hard', 'legendary');--> statement-breakpoint
CREATE TYPE "public"."quest_source" AS ENUM('ai', 'fallback');--> statement-breakpoint
CREATE TYPE "public"."todo_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."xp_reason" AS ENUM('quest_complete');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credentials" (
	"user_id" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"todo_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"quest_giver" text,
	"difficulty" "quest_difficulty" NOT NULL,
	"base_xp" integer NOT NULL,
	"source" "quest_source" DEFAULT 'ai' NOT NULL,
	"model" text,
	"prompt_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quests_todoId_unique" UNIQUE("todo_id"),
	CONSTRAINT "quests_base_xp_positive" CHECK ("quests"."base_xp" >= 1)
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"status" "todo_status" DEFAULT 'active' NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "characters_total_xp_non_negative" CHECK ("characters"."total_xp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"todo_id" uuid,
	"reason" "xp_reason" NOT NULL,
	"amount" integer NOT NULL,
	"base_xp" integer NOT NULL,
	"overdue_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todos_user_status_idx" ON "todos" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "todos_user_created_idx" ON "todos" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "xp_events_user_created_idx" ON "xp_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "xp_events_one_completion_per_todo" ON "xp_events" USING btree ("todo_id") WHERE "xp_events"."reason" = 'quest_complete';