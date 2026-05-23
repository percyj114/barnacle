CREATE TABLE `form_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`form_id` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`auth_provider` text,
	`applicant_id` text,
	`applicant_username` text,
	`payload` text NOT NULL,
	`review_channel_id` text NOT NULL,
	`review_message_id` text,
	`review_thread_id` text,
	`decided_at` text,
	`decided_by_id` text,
	`decision_reason` text,
	`action_result` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_form_submissions_form_id` ON `form_submissions` (`form_id`);--> statement-breakpoint
CREATE INDEX `idx_form_submissions_status` ON `form_submissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_form_submissions_applicant_id` ON `form_submissions` (`applicant_id`);--> statement-breakpoint
CREATE INDEX `idx_form_submissions_review_message_id` ON `form_submissions` (`review_message_id`);--> statement-breakpoint
CREATE TABLE `reddit_moderation_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subreddit` text NOT NULL,
	`username` text NOT NULL,
	`action` text DEFAULT 'moderated' NOT NULL,
	`unaction` text DEFAULT 'reviewed' NOT NULL,
	`ban_reason` text,
	`moderator` text,
	`banned_at` text,
	`expires_at` text,
	`raw_payload` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reddit_moderation_contexts_subreddit_username` ON `reddit_moderation_contexts` (`subreddit`,`username`);--> statement-breakpoint
CREATE INDEX `idx_reddit_moderation_contexts_username` ON `reddit_moderation_contexts` (`username`);--> statement-breakpoint
CREATE INDEX `idx_reddit_moderation_contexts_action` ON `reddit_moderation_contexts` (`action`);