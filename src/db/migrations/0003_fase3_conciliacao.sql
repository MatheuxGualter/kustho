CREATE TABLE `capture_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`package_name` text NOT NULL,
	`auto_confirm` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `capture_sources_package_uq` ON `capture_sources` (`package_name`);--> statement-breakpoint
CREATE TABLE `merchant_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`merchant_key` text NOT NULL,
	`category_id` text,
	`account_id` text,
	`card_id` text,
	`hits` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`card_id`) REFERENCES `credit_cards`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "merchant_rules_single_origin" CHECK("merchant_rules"."account_id" IS NULL OR "merchant_rules"."card_id" IS NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_rules_key_uq` ON `merchant_rules` (`merchant_key`);--> statement-breakpoint
ALTER TABLE `captures` ADD `channel` text DEFAULT 'notification' NOT NULL;--> statement-breakpoint
ALTER TABLE `captures` ADD `suggested_category_id` text REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `captures` ADD `installments` integer;--> statement-breakpoint
ALTER TABLE `captures` ADD `match_transaction_id` text REFERENCES transactions(id);--> statement-breakpoint
ALTER TABLE `captures` ADD `match_score` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `captures` ADD `duplicate_of_id` text;--> statement-breakpoint
ALTER TABLE `captures` ADD `edited_on_confirm` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `captures` ADD `auto_confirmed` integer DEFAULT false NOT NULL;