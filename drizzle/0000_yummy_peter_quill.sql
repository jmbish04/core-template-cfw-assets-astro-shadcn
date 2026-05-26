CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`job_title` text NOT NULL,
	`job_url` text,
	`job_posting_pdf_url` text,
	`salary_min` integer,
	`salary_max` integer,
	`salary_currency` text DEFAULT 'USD',
	`status` text DEFAULT 'preparing' NOT NULL,
	`drive_folder_id` text,
	`metadata` text,
	`role_instructions` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `roles_status_idx` ON `roles` (`status`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`gdoc_id` text NOT NULL,
	`role_id` text NOT NULL,
	`type` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `documents_role_id_idx` ON `documents` (`role_id`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`role_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`role_id` text,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`parts` text,
	`format` text,
	`metadata` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_thread_id_idx` ON `messages` (`thread_id`);--> statement-breakpoint
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`sender` text NOT NULL,
	`raw_content` text NOT NULL,
	`processed_status` text DEFAULT 'pending' NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `emails_processed_status_idx` ON `emails` (`processed_status`);--> statement-breakpoint
CREATE TABLE `global_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_failures` (
	`id` text PRIMARY KEY NOT NULL,
	`job_url` text NOT NULL,
	`error_message` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resume_bullets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`impact_metric` text,
	`tags` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`replaced_by` integer,
	`time_revised` integer,
	`time_deleted` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `resume_bullets_active_idx` ON `resume_bullets` (`is_active`);--> statement-breakpoint
CREATE INDEX `resume_bullets_category_idx` ON `resume_bullets` (`category`);--> statement-breakpoint
CREATE INDEX `resume_bullets_replaced_by_idx` ON `resume_bullets` (`replaced_by`);--> statement-breakpoint
CREATE TABLE `role_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`hire_score` integer NOT NULL,
	`hire_rationale` text NOT NULL,
	`compensation_score` integer NOT NULL,
	`compensation_rationale` text NOT NULL,
	`config_notebooklm_prompt` text,
	`config_compensation_baseline` text,
	`config_career_stories` text,
	`used_defaults` integer DEFAULT false,
	`analyzed_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `role_analyses_role_id_idx` ON `role_analyses` (`role_id`);--> statement-breakpoint
CREATE TABLE `role_bullets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `role_bullets_role_id_idx` ON `role_bullets` (`role_id`);--> statement-breakpoint
CREATE INDEX `role_bullets_type_idx` ON `role_bullets` (`type`);--> statement-breakpoint
CREATE TABLE `role_bullet_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bullet_id` integer NOT NULL,
	`revision_number` integer DEFAULT 1 NOT NULL,
	`ai_score` integer NOT NULL,
	`ai_rationale` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bullet_id`) REFERENCES `role_bullets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `role_bullet_analyses_bullet_id_idx` ON `role_bullet_analyses` (`bullet_id`);--> statement-breakpoint
CREATE INDEX `role_bullet_analyses_revision_idx` ON `role_bullet_analyses` (`bullet_id`,`revision_number`);--> statement-breakpoint
CREATE TABLE `role_alignment_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`analysis_id` text NOT NULL,
	`role_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`score` integer NOT NULL,
	`rationale` text NOT NULL,
	`holistic_rationale` text,
	FOREIGN KEY (`analysis_id`) REFERENCES `role_analyses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `alignment_scores_analysis_id_idx` ON `role_alignment_scores` (`analysis_id`);--> statement-breakpoint
CREATE INDEX `alignment_scores_role_id_idx` ON `role_alignment_scores` (`role_id`);--> statement-breakpoint
CREATE INDEX `alignment_scores_type_idx` ON `role_alignment_scores` (`type`);--> statement-breakpoint
CREATE TABLE `health_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`trigger` text NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `health_results` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`message` text,
	`details` text,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`ai_suggestion` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `health_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `health_test_definitions` (
	`name` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`timeout_ms` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interview_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`title` text DEFAULT 'New Note' NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interview_notes_role_id_idx` ON `interview_notes` (`role_id`);--> statement-breakpoint
CREATE TABLE `interview_recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`original_filename` text NOT NULL,
	`duration_seconds` integer,
	`transcription` text,
	`transcription_status` text DEFAULT 'pending' NOT NULL,
	`note_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `interview_notes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `interview_recordings_role_id_idx` ON `interview_recordings` (`role_id`);--> statement-breakpoint
CREATE INDEX `interview_recordings_status_idx` ON `interview_recordings` (`transcription_status`);--> statement-breakpoint
CREATE TABLE `transcription_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`recording_id` text,
	`role_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`phase` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`total_chunks` integer,
	`completed_chunks` integer DEFAULT 0 NOT NULL,
	`full_text` text,
	`error` text,
	`r2_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`recording_id`) REFERENCES `interview_recordings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transcription_jobs_recording_id_idx` ON `transcription_jobs` (`recording_id`);--> statement-breakpoint
CREATE INDEX `transcription_jobs_role_id_idx` ON `transcription_jobs` (`role_id`);--> statement-breakpoint
CREATE INDEX `transcription_jobs_status_idx` ON `transcription_jobs` (`status`);--> statement-breakpoint
CREATE TABLE `transcription_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`r2_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transcription` text,
	`duration_seconds` integer,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`job_id`) REFERENCES `transcription_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `transcription_chunks_job_chunk_idx` ON `transcription_chunks` (`job_id`,`chunk_index`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`description` text,
	`greenhouse_token` text,
	`color_primary` text,
	`color_accent` text,
	`logo_url` text,
	`attributes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `companies_name_idx` ON `companies` (`name`);--> statement-breakpoint
CREATE INDEX `companies_greenhouse_token_idx` ON `companies` (`greenhouse_token`);--> statement-breakpoint
CREATE TABLE `career_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`answer` text NOT NULL,
	`source` text NOT NULL,
	`agent` text NOT NULL,
	`category` text NOT NULL,
	`role_id` text,
	`references` text,
	`metadata` text,
	`is_active` integer DEFAULT true NOT NULL,
	`replaced_by_id` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `career_memory_role_id_idx` ON `career_memory` (`role_id`);--> statement-breakpoint
CREATE INDEX `career_memory_category_idx` ON `career_memory` (`category`);--> statement-breakpoint
CREATE INDEX `career_memory_active_idx` ON `career_memory` (`is_active`);--> statement-breakpoint
CREATE INDEX `career_memory_source_idx` ON `career_memory` (`source`);--> statement-breakpoint
CREATE TABLE `scoring_rubrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`criteria` text NOT NULL,
	`score_range_min` integer NOT NULL,
	`score_range_max` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scoring_rubrics_type_idx` ON `scoring_rubrics` (`type`);--> statement-breakpoint
CREATE INDEX `scoring_rubrics_active_idx` ON `scoring_rubrics` (`is_active`);--> statement-breakpoint
CREATE TABLE `role_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`type` text NOT NULL,
	`input_hash` text NOT NULL,
	`score` integer NOT NULL,
	`rationale` text NOT NULL,
	`raw_api_response` text,
	`analysis_payload` text,
	`config_snapshot` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `role_insights_role_type_idx` ON `role_insights` (`role_id`,`type`);--> statement-breakpoint
CREATE INDEX `role_insights_hash_idx` ON `role_insights` (`input_hash`);--> statement-breakpoint
CREATE TABLE `best_practices` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`rule` text NOT NULL,
	`rationale` text NOT NULL,
	`source_url` text,
	`tags` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hitl_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`instance_name` text NOT NULL,
	`action_type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`decision_reason` text,
	`created_at` integer NOT NULL,
	`decided_at` integer
);
--> statement-breakpoint
CREATE TABLE `mcp_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`server_name` text NOT NULL,
	`tool_name` text NOT NULL,
	`request` text,
	`response` text,
	`success` integer DEFAULT false NOT NULL,
	`error_message` text,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`session_key` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `dashboard_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_name` text NOT NULL,
	`metric_value` real NOT NULL,
	`metric_type` text NOT NULL,
	`category` text NOT NULL,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_key` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_name` text NOT NULL,
	`status` text NOT NULL,
	`response_time` integer,
	`error_message` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL
);
