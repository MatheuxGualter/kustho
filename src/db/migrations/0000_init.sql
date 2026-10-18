CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`institution` text NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`initial_balance_cents` integer DEFAULT 0 NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`parent_id` text
);
--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `credit_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`institution` text NOT NULL,
	`color` text NOT NULL,
	`limit_cents` integer NOT NULL,
	`closing_day` integer NOT NULL,
	`due_day` integer NOT NULL,
	`payment_account_id` text,
	`archived_at` text,
	FOREIGN KEY (`payment_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "credit_cards_closing_day" CHECK("credit_cards"."closing_day" BETWEEN 1 AND 31),
	CONSTRAINT "credit_cards_due_day" CHECK("credit_cards"."due_day" BETWEEN 1 AND 31),
	CONSTRAINT "credit_cards_limit" CHECK("credit_cards"."limit_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`card_id` text NOT NULL,
	`reference_month` text NOT NULL,
	`closing_date` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `credit_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_card_month_uq` ON `invoices` (`card_id`,`reference_month`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`direction` text,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`category_id` text,
	`account_id` text,
	`card_id` text,
	`invoice_id` text,
	`transfer_peer_id` text,
	`installment_group_id` text,
	`installment_number` integer,
	`installment_total` integer,
	`status` text DEFAULT 'posted' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`notes` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`card_id`) REFERENCES `credit_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "transactions_amount_positive" CHECK("transactions"."amount_cents" > 0),
	CONSTRAINT "transactions_direction" CHECK(("transactions"."kind" IN ('transfer', 'adjustment')) = ("transactions"."direction" IS NOT NULL)),
	CONSTRAINT "transactions_owner" CHECK("transactions"."account_id" IS NOT NULL OR "transactions"."card_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`account_id`);--> statement-breakpoint
CREATE INDEX `transactions_card_idx` ON `transactions` (`card_id`);--> statement-breakpoint
CREATE INDEX `transactions_invoice_idx` ON `transactions` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `transactions_installment_group_idx` ON `transactions` (`installment_group_id`);