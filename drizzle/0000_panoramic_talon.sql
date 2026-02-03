CREATE TABLE `highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`domains` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`metrics` text DEFAULT '[]' NOT NULL,
	`is_hidden` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`logo_url` text,
	`website` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
