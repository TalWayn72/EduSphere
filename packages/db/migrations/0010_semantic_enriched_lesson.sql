-- FEAT: Semantic-Enriched Lesson Creation — Phase 1 Schema Changes
-- P1-01: Add youtube_video_id to media_assets
-- P1-02: Add knowledge_source_id, resolved_text, graph_source_id to lesson_citations
-- P1-03: Add start_time, end_time to visual_anchors
-- P1-04: Create enriched_transcript_blocks table

ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "youtube_video_id" text;--> statement-breakpoint
ALTER TABLE "lesson_citations" ADD COLUMN IF NOT EXISTS "knowledge_source_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_citations" ADD COLUMN IF NOT EXISTS "resolved_text" text;--> statement-breakpoint
ALTER TABLE "lesson_citations" ADD COLUMN IF NOT EXISTS "graph_source_id" text;--> statement-breakpoint
ALTER TABLE "visual_anchors" ADD COLUMN IF NOT EXISTS "start_time" numeric(10, 3);--> statement-breakpoint
ALTER TABLE "visual_anchors" ADD COLUMN IF NOT EXISTS "end_time" numeric(10, 3);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enriched_transcript_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"segment_id" uuid,
	"block_type" text NOT NULL,
	"block_order" integer DEFAULT 0 NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"citation_id" uuid,
	"anchor_id" uuid,
	"start_time" numeric(10, 3),
	"end_time" numeric(10, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "lesson_citations" ADD CONSTRAINT "lesson_citations_knowledge_source_id_knowledge_sources_id_fk" FOREIGN KEY ("knowledge_source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enriched_transcript_blocks" ADD CONSTRAINT "enriched_transcript_blocks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enriched_transcript_blocks" ADD CONSTRAINT "enriched_transcript_blocks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enriched_transcript_blocks" ADD CONSTRAINT "enriched_transcript_blocks_segment_id_transcript_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."transcript_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enriched_transcript_blocks" ADD CONSTRAINT "enriched_transcript_blocks_citation_id_lesson_citations_id_fk" FOREIGN KEY ("citation_id") REFERENCES "public"."lesson_citations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enriched_transcript_blocks" ADD CONSTRAINT "enriched_transcript_blocks_anchor_id_visual_anchors_id_fk" FOREIGN KEY ("anchor_id") REFERENCES "public"."visual_anchors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enriched_blocks_tenant" ON "enriched_transcript_blocks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enriched_blocks_lesson" ON "enriched_transcript_blocks" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enriched_blocks_lesson_order" ON "enriched_transcript_blocks" USING btree ("lesson_id","block_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enriched_blocks_segment" ON "enriched_transcript_blocks" USING btree ("segment_id");
