CREATE TABLE `ideas` (
	`id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`author` enum('el','ea') NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `ideas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`from_user` enum('el','ea') NOT NULL,
	`to_user` enum('el','ea') NOT NULL,
	`title` varchar(120) NOT NULL,
	`message` text NOT NULL,
	`location` varchar(200) NOT NULL,
	`starts_at` datetime NOT NULL,
	`dress_code` varchar(120),
	`theme` enum('toamna','iarna','amandoua') NOT NULL,
	`status` enum('pending','accepted','declined','reschedule','cancelled') NOT NULL DEFAULT 'pending',
	`proposed_at` datetime,
	`response_note` varchar(500),
	`idea_id` char(36) CHARACTER SET ascii COLLATE ascii_bin,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`ip_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`window_start` datetime NOT NULL,
	`count` int NOT NULL,
	CONSTRAINT `login_attempts_ip_hash` PRIMARY KEY(`ip_hash`)
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`invitation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`author` enum('el','ea') NOT NULL,
	`note` text NOT NULL,
	`rating` tinyint NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `memories_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_invitation_author` UNIQUE(`invitation_id`,`author`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`recipient` enum('el','ea') NOT NULL,
	`type` enum('invite_new','invite_response','reschedule_accepted','invite_cancelled','memory_added','idea_added') NOT NULL,
	`invitation_id` char(36) CHARACTER SET ascii COLLATE ascii_bin,
	`read_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`memory_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	`blob_url` varchar(500) NOT NULL,
	`blob_pathname` varchar(500) NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`width` int,
	`height` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_idea_id_ideas_id_fk` FOREIGN KEY (`idea_id`) REFERENCES `ideas`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memories` ADD CONSTRAINT `memories_invitation_id_invitations_id_fk` FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_invitation_id_invitations_id_fk` FOREIGN KEY (`invitation_id`) REFERENCES `invitations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_memory_id_memories_id_fk` FOREIGN KEY (`memory_id`) REFERENCES `memories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_created` ON `ideas` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_status_starts` ON `invitations` (`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_idea` ON `invitations` (`idea_id`);--> statement-breakpoint
CREATE INDEX `idx_recipient_unread` ON `notifications` (`recipient`,`read_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_memory` ON `photos` (`memory_id`,`created_at`);