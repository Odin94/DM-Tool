CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`scene_id` text,
	`priority` integer NOT NULL,
	`tone` text NOT NULL,
	`position` integer NOT NULL,
	`role` text NOT NULL,
	`hp` text NOT NULL,
	`detail` text NOT NULL,
	`notes` text NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `music` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`scene_id` text,
	`priority` integer NOT NULL,
	`tone` text NOT NULL,
	`position` integer NOT NULL,
	`source` text NOT NULL,
	`loop` integer NOT NULL,
	`volume` integer DEFAULT 100 NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text,
	`text` text NOT NULL,
	`created_at` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`chapter` text NOT NULL,
	`background` text NOT NULL,
	`video` integer NOT NULL,
	`music_id` text,
	`lighting_id` text,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`name` text NOT NULL,
	`session` integer NOT NULL,
	`active_scene_id` text NOT NULL,
	`pinned` text NOT NULL,
	`music_volume` integer NOT NULL,
	`sound_volume` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sounds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`scene_id` text,
	`priority` integer NOT NULL,
	`tone` text NOT NULL,
	`position` integer NOT NULL,
	`source` text NOT NULL,
	`loop` integer NOT NULL,
	`volume` integer DEFAULT 100 NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE no action
);
