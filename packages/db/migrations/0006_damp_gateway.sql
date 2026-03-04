ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "forked_from_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_courses_forked_from" ON "courses" ("forked_from_id");
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"query" text NOT NULL,
	"filters" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;