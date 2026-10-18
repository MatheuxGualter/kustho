CREATE TABLE `capture_origin_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`package_name` text NOT NULL,
	`card_last_digits` text,
	`account_id` text,
	`card_id` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`card_id`) REFERENCES `credit_cards`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "capture_origin_rules_single_origin" CHECK(("capture_origin_rules"."account_id" IS NULL) <> ("capture_origin_rules"."card_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `capture_origin_rules_package_idx` ON `capture_origin_rules` (`package_name`);--> statement-breakpoint
CREATE TABLE `captures` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`raw_id` text NOT NULL,
	`package_name` text NOT NULL,
	`title` text,
	`text` text,
	`posted_at` text NOT NULL,
	`parser` text,
	`amount_cents` integer,
	`kind` text,
	`merchant` text,
	`date` text,
	`card_last_digits` text,
	`suggested_account_id` text,
	`suggested_card_id` text,
	`confidence` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` text,
	FOREIGN KEY (`suggested_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`suggested_card_id`) REFERENCES `credit_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "captures_amount_positive" CHECK("captures"."amount_cents" IS NULL OR "captures"."amount_cents" > 0),
	CONSTRAINT "captures_confidence" CHECK("captures"."confidence" BETWEEN 0 AND 1),
	CONSTRAINT "captures_single_origin" CHECK("captures"."suggested_account_id" IS NULL OR "captures"."suggested_card_id" IS NULL),
	CONSTRAINT "captures_confirmed_tx" CHECK(("captures"."status" = 'confirmed') = ("captures"."transaction_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `captures_raw_id_uq` ON `captures` (`raw_id`);--> statement-breakpoint
CREATE INDEX `captures_status_idx` ON `captures` (`status`);