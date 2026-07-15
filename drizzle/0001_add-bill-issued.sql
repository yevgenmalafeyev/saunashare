CREATE TABLE `telegram_user_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_user_id` integer NOT NULL,
	`participant_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`telegram_user_id`) REFERENCES `telegram_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `bill_issued` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `telegram_users` ADD `granted_role` text;