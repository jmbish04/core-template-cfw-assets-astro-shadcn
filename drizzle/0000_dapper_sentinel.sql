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
CREATE TABLE `health_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`service_name` text NOT NULL,
	`status` text NOT NULL,
	`response_time` integer,
	`error_message` text,
	`timestamp` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
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
