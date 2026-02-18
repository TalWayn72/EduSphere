-- Migration: Add missing columns for users and courses
-- Adds first_name/last_name to users and slug/instructor_id/is_published/thumbnail_url/estimated_hours to courses

--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar(100) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar(100) NOT NULL DEFAULT '';

--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "slug" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "instructor_id" uuid REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "estimated_hours" integer;
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "creator_id" DROP NOT NULL;
