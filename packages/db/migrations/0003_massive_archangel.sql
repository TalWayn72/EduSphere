CREATE TABLE "scim_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_id" varchar(255),
	"display_name" varchar(255) NOT NULL,
	"member_ids" jsonb DEFAULT '[]'::jsonb,
	"course_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scim_groups" ENABLE ROW LEVEL SECURITY;