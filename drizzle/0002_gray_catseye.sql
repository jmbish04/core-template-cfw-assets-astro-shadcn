PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Existing template data used user-owned records. Map those legacy rows to synthetic
-- session keys so they remain available for one-time export or manual cleanup after
-- this migration. Newly created API-key sessions will not reuse these legacy keys.
-- Cleanup tip: export or review rows where `session_key` starts with `migrated-user-`
-- before deleting them or reassigning them to newly created session-owned records.
CREATE TABLE `__new_documents` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`session_key` text NOT NULL,
`title` text NOT NULL,
`content` text NOT NULL,
`created_at` integer DEFAULT (unixepoch()) NOT NULL,
`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "session_key", "title", "content", "created_at", "updated_at")
SELECT "id", printf('migrated-user-%s', "user_id"), "title", "content", "created_at", "updated_at" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
CREATE TABLE `__new_notifications` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`session_key` text NOT NULL,
`type` text NOT NULL,
`title` text NOT NULL,
`message` text NOT NULL,
`is_read` integer DEFAULT false NOT NULL,
`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_notifications`("id", "session_key", "type", "title", "message", "is_read", "created_at")
SELECT "id", printf('migrated-user-%s', "user_id"), "type", "title", "message", "is_read", "created_at" FROM `notifications`;--> statement-breakpoint
DROP TABLE `notifications`;--> statement-breakpoint
ALTER TABLE `__new_notifications` RENAME TO `notifications`;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`token` text NOT NULL,
`session_key` text NOT NULL,
`expires_at` integer NOT NULL,
`created_at` integer DEFAULT (unixepoch()) NOT NULL,
`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "token", "session_key", "expires_at", "created_at", "updated_at")
SELECT "id", "token", printf('migrated-user-%s', "user_id"), "expires_at", "created_at", "created_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `__new_threads` (
`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
`session_key` text NOT NULL,
`title` text NOT NULL,
`created_at` integer DEFAULT (unixepoch()) NOT NULL,
`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_threads`("id", "session_key", "title", "created_at", "updated_at")
SELECT "id", printf('migrated-user-%s', "user_id"), "title", "created_at", "updated_at" FROM `threads`;--> statement-breakpoint
DROP TABLE `threads`;--> statement-breakpoint
ALTER TABLE `__new_threads` RENAME TO `threads`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
