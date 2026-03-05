CREATE TABLE IF NOT EXISTS "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "forked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN IF NOT EXISTS "text_start" integer;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN IF NOT EXISTS "text_end" integer;--> statement-breakpoint
ALTER TABLE "annotations" ADD COLUMN IF NOT EXISTS "range_type" text DEFAULT 'character';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_tenant_key_idx" ON "notification_templates" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_courses_tenant" ON "courses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_courses_tenant_published" ON "courses" USING btree ("tenant_id","is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_courses_tenant_instructor" ON "courses" USING btree ("tenant_id","instructor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_courses_forked_from" ON "courses" USING btree ("forked_from_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_assets_tenant" ON "media_assets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_assets_course" ON "media_assets" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_assets_transcription_status" ON "media_assets" USING btree ("transcription_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transcript_segments_transcript" ON "transcript_segments" USING btree ("transcript_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transcript_segments_time" ON "transcript_segments" USING btree ("transcript_id","start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_annotations_text_range" ON "annotations" USING btree ("asset_id","text_start","text_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_srs_cards_user_tenant" ON "spaced_repetition_cards" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_srs_cards_due_date" ON "spaced_repetition_cards" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_badges_tenant" ON "badges" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_badges_category" ON "badges" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_point_events_user_tenant" ON "point_events" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_point_events_created" ON "point_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_badges_user_tenant" ON "user_badges" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_badges_badge" ON "user_badges" USING btree ("badge_id");
