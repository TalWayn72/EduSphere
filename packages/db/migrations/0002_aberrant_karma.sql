CREATE TYPE "public"."content_type" AS ENUM('VIDEO', 'PDF', 'MARKDOWN', 'QUIZ', 'ASSIGNMENT', 'LINK', 'AUDIO', 'LIVE_SESSION', 'SCORM', 'RICH_DOCUMENT', 'MICROLESSON', 'SCENARIO');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('ACTIVE', 'COMPLETED', 'DROPPED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('ESSENTIAL', 'ANALYTICS', 'AI_PROCESSING', 'THIRD_PARTY_LLM', 'MARKETING', 'RESEARCH');--> statement-breakpoint
CREATE TYPE "public"."live_session_status" AS ENUM('SCHEDULED', 'LIVE', 'ENDED', 'RECORDING');--> statement-breakpoint
CREATE TYPE "public"."at_risk_status" AS ENUM('active', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."scim_operation" AS ENUM('CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'SYNC_GROUP');--> statement-breakpoint
CREATE TYPE "public"."scim_status" AS ENUM('SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."rater_role" AS ENUM('SELF', 'PEER', 'MANAGER', 'DIRECT_REPORT');--> statement-breakpoint
CREATE TYPE "public"."marketplace_currency" AS ENUM('USD', 'EUR', 'ILS');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'PAID', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('PENDING', 'COMPLETE', 'REFUNDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."library_license" AS ENUM('FREE', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."library_topic" AS ENUM('GDPR', 'SOC2', 'HIPAA', 'AML', 'DEI', 'CYBERSECURITY', 'HARASSMENT_PREVENTION');--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" "content_type" NOT NULL,
	"content" text,
	"file_id" uuid,
	"duration" integer,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"translated_title" text,
	"translated_description" text,
	"translated_summary" text,
	"translated_transcript" text,
	"quality_score" numeric(3, 2),
	"model_used" text DEFAULT 'ollama/llama3.2' NOT NULL,
	"translation_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ct_item_locale_uq" UNIQUE("content_item_id","locale")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"request_id" varchar(36),
	"status" varchar(20) DEFAULT 'SUCCESS' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"given" boolean NOT NULL,
	"given_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"ip_address" "inet",
	"user_agent" text,
	"consent_version" varchar(20) NOT NULL,
	"method" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_consents_user_type_unique" UNIQUE("user_id","consent_type")
);
--> statement-breakpoint
ALTER TABLE "user_consents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "data_retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"retention_days" integer NOT NULL,
	"delete_mode" varchar(20) DEFAULT 'HARD_DELETE' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_retention_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_branding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"logo_url" varchar(512) DEFAULT '/defaults/logo.svg' NOT NULL,
	"logo_mark_url" varchar(512),
	"favicon_url" varchar(512) DEFAULT '/defaults/favicon.ico' NOT NULL,
	"primary_color" varchar(7) DEFAULT '#2563eb' NOT NULL,
	"secondary_color" varchar(7) DEFAULT '#64748b' NOT NULL,
	"accent_color" varchar(7) DEFAULT '#f59e0b' NOT NULL,
	"background_color" varchar(7) DEFAULT '#ffffff' NOT NULL,
	"font_family" varchar(100) DEFAULT 'Inter' NOT NULL,
	"organization_name" varchar(200) NOT NULL,
	"tagline" varchar(500),
	"privacy_policy_url" varchar(512),
	"terms_of_service_url" varchar(512),
	"support_email" varchar(200),
	"hide_edusphere_branding" boolean DEFAULT false NOT NULL,
	"custom_css" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_branding_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"domain_type" varchar(20) DEFAULT 'SUBDOMAIN' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verification_token" varchar(64),
	"ssl_provisioned" boolean DEFAULT false NOT NULL,
	"keycloak_realm" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "user_competency_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"target_concept_name" text NOT NULL,
	"current_level" text,
	"target_level" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_competency_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "spaced_repetition_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"concept_name" text NOT NULL,
	"due_date" timestamp with time zone DEFAULT now() NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spaced_repetition_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quiz_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"score" real NOT NULL,
	"passed" boolean NOT NULL,
	"answers" jsonb NOT NULL,
	"item_results" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bbb_meeting_id" text NOT NULL,
	"meeting_name" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"recording_url" text,
	"attendee_password" text NOT NULL,
	"moderator_password" text NOT NULL,
	"status" "live_session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_sessions_bbb_meeting_id_unique" UNIQUE("bbb_meeting_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_emoji" text NOT NULL,
	"category" text NOT NULL,
	"points_reward" integer DEFAULT 0 NOT NULL,
	"condition_type" text NOT NULL,
	"condition_value" integer NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"points" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "point_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"context" jsonb
);
--> statement-breakpoint
ALTER TABLE "user_badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_points_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_points" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scorm_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"manifest_version" text DEFAULT '1.2' NOT NULL,
	"title" text NOT NULL,
	"identifier" text NOT NULL,
	"minio_prefix" text NOT NULL,
	"entry_point" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorm_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lesson_status" text DEFAULT 'not attempted' NOT NULL,
	"score_raw" real,
	"score_min" real,
	"score_max" real,
	"suspend_data" text,
	"session_time" text,
	"total_time" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_name" text NOT NULL,
	"description" text,
	"required_concepts" text[] DEFAULT '{}'::text[] NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skill_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "microlearning_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"content_item_ids" varchar(8192) DEFAULT '[]' NOT NULL,
	"topic_cluster_id" uuid,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"embedding" vector(768) NOT NULL,
	"highest_similarity" real DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_embeddings_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
ALTER TABLE "submission_embeddings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "text_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"text_content" text NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "text_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "at_risk_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"risk_score" real NOT NULL,
	"risk_factors" jsonb NOT NULL,
	"status" "at_risk_status" DEFAULT 'active' NOT NULL,
	"flagged_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scenario_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agent_execution_id" uuid,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"evaluation_result" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scenario_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid,
	"title" text NOT NULL,
	"domain" text NOT NULL,
	"difficulty_level" text DEFAULT 'INTERMEDIATE' NOT NULL,
	"character_persona" text NOT NULL,
	"scene_description" text NOT NULL,
	"evaluation_rubric" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_turns" integer DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_choices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_content_item_id" uuid NOT NULL,
	"choice_id" text NOT NULL,
	"to_content_item_id" uuid,
	"scenario_root_id" uuid NOT NULL,
	"chosen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lti_launches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"launch_nonce" text NOT NULL,
	"launch_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lti_launches_nonce_unique" UNIQUE("launch_nonce")
);
--> statement-breakpoint
CREATE TABLE "lti_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"platform_name" text NOT NULL,
	"platform_url" text NOT NULL,
	"client_id" text NOT NULL,
	"auth_login_url" text NOT NULL,
	"auth_token_url" text NOT NULL,
	"key_set_url" text NOT NULL,
	"deployment_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scim_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"operation" "scim_operation" NOT NULL,
	"external_id" text,
	"status" "scim_status" NOT NULL,
	"error_message" text,
	"affected_user_id" uuid,
	"sync_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scim_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"description" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scim_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verification_code" uuid DEFAULT gen_random_uuid() NOT NULL,
	"pdf_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_verification_code_unique" UNIQUE("verification_code")
);
--> statement-breakpoint
CREATE TABLE "bi_api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "bi_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "course_cpd_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"credit_type_id" uuid NOT NULL,
	"credit_hours" numeric(6, 2) NOT NULL,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cpd_credit_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"regulatory_body" text NOT NULL,
	"credit_hours_per_hour" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_cpd_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"credit_type_id" uuid NOT NULL,
	"earned_hours" numeric(6, 2) NOT NULL,
	"completion_date" timestamp NOT NULL,
	"certificate_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xapi_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"statement_id" uuid NOT NULL,
	"actor" jsonb NOT NULL,
	"verb" jsonb NOT NULL,
	"object" jsonb NOT NULL,
	"result" jsonb,
	"context" jsonb,
	"stored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xapi_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"lrs_endpoint" text,
	"description" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xapi_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "credential_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"badge_emoji" text DEFAULT '🎓' NOT NULL,
	"required_course_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"total_hours" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"certificate_id" uuid
);
--> statement-breakpoint
CREATE TABLE "program_prerequisites" (
	"program_id" uuid NOT NULL,
	"prerequisite_program_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breakout_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"room_name" text NOT NULL,
	"bbb_breakout_id" text,
	"capacity" integer DEFAULT 10 NOT NULL,
	"assigned_user_ids" uuid[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"option_index" integer NOT NULL,
	"voted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "assessment_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid,
	"target_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"rubric" jsonb NOT NULL,
	"due_date" timestamp,
	"status" "assessment_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"responder_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rater_role" "rater_role" NOT NULL,
	"criteria_scores" jsonb NOT NULL,
	"narrative" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"aggregated_scores" jsonb NOT NULL,
	"summary" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_results_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "crm_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'SALESFORCE' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"instance_url" text NOT NULL,
	"connected_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_connections_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "crm_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"external_id" text,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_badge_assertions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"badge_definition_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"evidence_url" text,
	"proof" jsonb NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text
);
--> statement-breakpoint
ALTER TABLE "open_badge_assertions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "open_badge_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"criteria_url" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"version" text DEFAULT '3.0' NOT NULL,
	"issuer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "open_badge_definitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "course_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" "marketplace_currency" DEFAULT 'USD' NOT NULL,
	"stripe_price_id" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"revenue_split_percent" integer DEFAULT 70 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_listings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instructor_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stripe_transfer_id" text,
	"amount_cents" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"status" "payout_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instructor_payouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stripe_payment_intent_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "purchase_status" DEFAULT 'PENDING' NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
ALTER TABLE "purchases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stripe_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
ALTER TABLE "stripe_customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "library_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"topic" "library_topic" NOT NULL,
	"scorm_package_url" text NOT NULL,
	"license_type" "library_license" DEFAULT 'FREE' NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_library_activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"library_course_id" uuid NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"activated_by" uuid NOT NULL,
	"course_id" uuid
);
--> statement-breakpoint
CREATE TABLE "portal_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text DEFAULT 'home' NOT NULL,
	"title" text DEFAULT 'Learning Portal' NOT NULL,
	"layout" jsonb DEFAULT '[]' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portal_pages_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "portal_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"priority" varchar(20) DEFAULT 'INFO' NOT NULL,
	"target_audience" varchar(20) DEFAULT 'ALL' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "security_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mfa_required" boolean DEFAULT false NOT NULL,
	"mfa_required_for_admins" boolean DEFAULT true NOT NULL,
	"session_timeout_minutes" integer DEFAULT 480 NOT NULL,
	"max_concurrent_sessions" integer DEFAULT 5 NOT NULL,
	"login_attempt_lockout_threshold" integer DEFAULT 5 NOT NULL,
	"password_min_length" integer DEFAULT 8 NOT NULL,
	"password_require_special_chars" boolean DEFAULT false NOT NULL,
	"password_expiry_days" integer,
	"ip_allowlist" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "security_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "custom_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"delegated_by" uuid NOT NULL,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid,
	"title" text NOT NULL,
	"source_type" text NOT NULL,
	"origin" text,
	"file_key" text,
	"raw_content" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "creator_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "slug" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "instructor_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "estimated_hours" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_compliance" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "compliance_due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "hls_manifest_key" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "alt_text" text;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_courses" ADD CONSTRAINT "user_courses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_courses" ADD CONSTRAINT "user_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='discussion_messages') THEN
    BEGIN ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_discussion_id_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END;
    BEGIN ALTER TABLE "discussion_messages" ADD CONSTRAINT "discussion_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='discussion_participants') THEN
    BEGIN ALTER TABLE "discussion_participants" ADD CONSTRAINT "discussion_participants_discussion_id_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END;
    BEGIN ALTER TABLE "discussion_participants" ADD CONSTRAINT "discussion_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='discussions') THEN
    BEGIN ALTER TABLE "discussions" ADD CONSTRAINT "discussions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END;
    BEGIN ALTER TABLE "discussions" ADD CONSTRAINT "discussions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_translations" ADD CONSTRAINT "content_translations_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearning_paths" ADD CONSTRAINT "microlearning_paths_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "microlearning_paths" ADD CONSTRAINT "microlearning_paths_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_sessions" ADD CONSTRAINT "scenario_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_sessions" ADD CONSTRAINT "scenario_sessions_scenario_id_scenario_templates_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenario_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_sessions" ADD CONSTRAINT "scenario_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_templates" ADD CONSTRAINT "scenario_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_templates" ADD CONSTRAINT "scenario_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_choices" ADD CONSTRAINT "scenario_choices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_launches" ADD CONSTRAINT "lti_launches_platform_id_lti_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."lti_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_badge_assertions" ADD CONSTRAINT "open_badge_assertions_badge_definition_id_open_badge_definitions_id_fk" FOREIGN KEY ("badge_definition_id") REFERENCES "public"."open_badge_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ct_locale_idx" ON "content_translations" USING btree ("locale");--> statement-breakpoint
CREATE INDEX "ct_status_idx" ON "content_translations" USING btree ("translation_status");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_created_idx" ON "audit_log" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_user_action_idx" ON "audit_log" USING btree ("user_id","action","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_certificates_tenant" ON "certificates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_certificates_tenant_user" ON "certificates" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_certificates_verification_code" ON "certificates" USING btree ("verification_code");--> statement-breakpoint
CREATE INDEX "bi_api_tokens_tenant_idx" ON "bi_api_tokens" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_unique" ON "user_follows" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "user_follows_follower_idx" ON "user_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_idx" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "user_cpd_log_user_idx" ON "user_cpd_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_cpd_log_tenant_idx" ON "user_cpd_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "xapi_statements_statement_id_unique" ON "xapi_statements" USING btree ("statement_id");--> statement-breakpoint
CREATE INDEX "xapi_statements_tenant_idx" ON "xapi_statements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "xapi_statements_stored_at_idx" ON "xapi_statements" USING btree ("stored_at");--> statement-breakpoint
CREATE INDEX "xapi_tokens_tenant_idx" ON "xapi_tokens" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "credential_programs_tenant_idx" ON "credential_programs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "credential_programs_published_idx" ON "credential_programs" USING btree ("tenant_id","published");--> statement-breakpoint
CREATE UNIQUE INDEX "program_enrollments_user_program_unique" ON "program_enrollments" USING btree ("user_id","program_id");--> statement-breakpoint
CREATE INDEX "program_enrollments_user_idx" ON "program_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "program_enrollments_tenant_idx" ON "program_enrollments" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_prerequisites_pk" ON "program_prerequisites" USING btree ("program_id","prerequisite_program_id");--> statement-breakpoint
CREATE INDEX "breakout_rooms_session_idx" ON "breakout_rooms" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "breakout_rooms_tenant_idx" ON "breakout_rooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_user_idx" ON "poll_votes" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "poll_votes_tenant_idx" ON "poll_votes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_polls_session_idx" ON "session_polls" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_polls_tenant_idx" ON "session_polls" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "assessment_campaigns_tenant_idx" ON "assessment_campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "assessment_campaigns_target_idx" ON "assessment_campaigns" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_campaign_idx" ON "assessment_responses" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_responses_responder_unique" ON "assessment_responses" USING btree ("campaign_id","responder_id","rater_role");--> statement-breakpoint
CREATE INDEX "crm_connections_tenant_idx" ON "crm_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "crm_sync_log_tenant_idx" ON "crm_sync_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "open_badge_assertions_recipient_idx" ON "open_badge_assertions" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "open_badge_assertions_tenant_idx" ON "open_badge_assertions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "open_badge_definitions_tenant_idx" ON "open_badge_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_listings_course_unique" ON "course_listings" USING btree ("course_id","tenant_id");--> statement-breakpoint
CREATE INDEX "instructor_payouts_instructor_idx" ON "instructor_payouts" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "purchases_user_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "purchases_course_idx" ON "purchases" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "stripe_customers_user_idx" ON "stripe_customers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_library_activations_unique" ON "tenant_library_activations" USING btree ("tenant_id","library_course_id");--> statement-breakpoint
CREATE INDEX "tenant_library_activations_tenant_idx" ON "tenant_library_activations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "portal_pages_tenant_idx" ON "portal_pages" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_annotations_tenant" ON "annotations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_annotations_tenant_user" ON "annotations" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_annotations_tenant_date" ON "annotations" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE POLICY "audit_log_rls" ON "audit_log" AS PERMISSIVE FOR ALL TO public USING (
        current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
        OR tenant_id::text = current_setting('app.current_tenant', TRUE)
      );--> statement-breakpoint
CREATE POLICY "user_consents_rls" ON "user_consents" AS PERMISSIVE FOR ALL TO public USING (
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      );--> statement-breakpoint
CREATE POLICY "retention_policies_rls" ON "data_retention_policies" AS PERMISSIVE FOR ALL TO public USING (
        tenant_id IS NULL
        OR tenant_id::text = current_setting('app.current_tenant', TRUE)
        OR current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
      );--> statement-breakpoint
CREATE POLICY "competency_goals_rls" ON "user_competency_goals" AS PERMISSIVE FOR ALL TO public USING (
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      ) WITH CHECK (
        user_id::text = current_setting('app.current_user_id', TRUE)
      );--> statement-breakpoint
CREATE POLICY "srs_cards_rls" ON "spaced_repetition_cards" AS PERMISSIVE FOR ALL TO public USING (
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      ) WITH CHECK (
        user_id::text = current_setting('app.current_user_id', TRUE)
      );--> statement-breakpoint
CREATE POLICY "point_events_rls" ON "point_events" AS PERMISSIVE FOR ALL TO public USING (
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "user_badges_rls" ON "user_badges" AS PERMISSIVE FOR ALL TO public USING (
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "user_points_rls" ON "user_points" AS PERMISSIVE FOR ALL TO public USING (tenant_id::text = current_setting('app.current_tenant', TRUE)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "skill_profiles_tenant_isolation" ON "skill_profiles" AS PERMISSIVE FOR ALL TO public USING (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      ) WITH CHECK (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
        )
      );--> statement-breakpoint
CREATE POLICY "submission_embeddings_rls" ON "submission_embeddings" AS PERMISSIVE FOR ALL TO public USING (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      ) WITH CHECK (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
      );--> statement-breakpoint
CREATE POLICY "text_submissions_rls" ON "text_submissions" AS PERMISSIVE FOR ALL TO public USING (
        (user_id::text = current_setting('app.current_user_id', TRUE)
          AND tenant_id::text = current_setting('app.current_tenant', TRUE))
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      ) WITH CHECK (
        user_id::text = current_setting('app.current_user_id', TRUE)
        AND tenant_id::text = current_setting('app.current_tenant', TRUE)
      );--> statement-breakpoint
CREATE POLICY "user_follows_rls" ON "user_follows" AS PERMISSIVE FOR ALL TO public USING (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          follower_id::text = current_setting('app.current_user_id', TRUE)
          OR following_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
        )
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "assessment_campaigns_rls" ON "assessment_campaigns" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid
        AND (
          target_user_id = current_setting('app.current_user_id', TRUE)::uuid
          OR current_setting('app.current_role', TRUE) IN ('ORG_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR')
        ));--> statement-breakpoint
CREATE POLICY "assessment_responses_rls" ON "assessment_responses" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant', TRUE)::uuid
        AND (
          responder_id = current_setting('app.current_user_id', TRUE)::uuid
          OR current_setting('app.current_role', TRUE) IN ('ORG_ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR')
        ));--> statement-breakpoint
CREATE POLICY "open_badge_assertions_rls" ON "open_badge_assertions" AS PERMISSIVE FOR ALL TO public USING (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          recipient_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
        )
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "open_badge_definitions_rls" ON "open_badge_definitions" AS PERMISSIVE FOR ALL TO public USING (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
          OR current_setting('app.current_user_role', TRUE) = 'STUDENT'
        )
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "course_listings_rls" ON "course_listings" AS PERMISSIVE FOR ALL TO public USING (tenant_id::text = current_setting('app.current_tenant', TRUE)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "instructor_payouts_rls" ON "instructor_payouts" AS PERMISSIVE FOR ALL TO public USING (
        instructor_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "purchases_rls" ON "purchases" AS PERMISSIVE FOR ALL TO public USING (
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "stripe_customers_rls" ON "stripe_customers" AS PERMISSIVE FOR ALL TO public USING (
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      ) WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));--> statement-breakpoint
CREATE POLICY "portal_pages_admin_rls" ON "portal_pages" AS PERMISSIVE FOR ALL TO public USING (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      ) WITH CHECK (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      );--> statement-breakpoint
CREATE POLICY "portal_pages_read_published_rls" ON "portal_pages" AS PERMISSIVE FOR SELECT TO public USING (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND published = TRUE
      );--> statement-breakpoint
CREATE POLICY "announcements_rls" ON "announcements" AS PERMISSIVE FOR ALL TO public USING (tenant_id::text = current_setting('app.current_tenant', TRUE)) WITH CHECK (
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      );