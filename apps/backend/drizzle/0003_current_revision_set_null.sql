PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`icon` text,
	`position` text,
	`current_revision_id` text,
	`user_id` text NOT NULL,
	`parent_id` text,
	`document_type` text DEFAULT 'note' NOT NULL,
	`space_id` text,
	`is_container` integer DEFAULT false NOT NULL,
	`client_id` text,
	FOREIGN KEY (`current_revision_id`) REFERENCES `revisions`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `documents`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`space_id`) REFERENCES `documents`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "created_at", "updated_at", "name", "handle", "icon", "position", "current_revision_id", "user_id", "parent_id", "document_type", "space_id", "is_container", "client_id") SELECT "id", "created_at", "updated_at", "name", "handle", "icon", "position", "current_revision_id", "user_id", "parent_id", "document_type", "space_id", "is_container", "client_id" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint

CREATE TRIGGER `documents_sync_document_search_index_after_insert`
AFTER INSERT ON `documents`
BEGIN
	INSERT INTO `document_search_index` (
		`id`,
		`created_at`,
		`updated_at`,
		`document_id`,
		`user_id`,
		`current_revision_id`,
		`title`,
		`body`
	) VALUES (
		NEW.`id`,
		NEW.`created_at`,
		NEW.`updated_at`,
		NEW.`id`,
		NEW.`user_id`,
		NEW.`current_revision_id`,
		NEW.`name`,
		COALESCE((SELECT `text` FROM `revisions` WHERE `id` = NEW.`current_revision_id`), '')
	);
END;
--> statement-breakpoint

CREATE TRIGGER `documents_sync_document_search_index_after_update_name`
AFTER UPDATE OF `name` ON `documents`
BEGIN
	UPDATE `document_search_index`
		SET
			`title` = NEW.`name`,
			`updated_at` = NEW.`updated_at`
		WHERE `document_id` = NEW.`id`;
END;
--> statement-breakpoint

CREATE TRIGGER `documents_sync_document_search_index_after_update_user`
AFTER UPDATE OF `user_id` ON `documents`
BEGIN
	UPDATE `document_search_index`
		SET
			`user_id` = NEW.`user_id`,
			`updated_at` = NEW.`updated_at`
		WHERE `document_id` = NEW.`id`;
END;
--> statement-breakpoint

CREATE TRIGGER `documents_sync_document_search_index_after_update_current_revision`
AFTER UPDATE OF `current_revision_id` ON `documents`
BEGIN
	UPDATE `document_search_index`
		SET
			`current_revision_id` = NEW.`current_revision_id`,
			`body` = COALESCE((SELECT `text` FROM `revisions` WHERE `id` = NEW.`current_revision_id`), ''),
			`updated_at` = NEW.`updated_at`
		WHERE `document_id` = NEW.`id`;
END;
--> statement-breakpoint

CREATE TRIGGER `documents_sync_document_search_index_after_delete`
AFTER DELETE ON `documents`
BEGIN
	DELETE FROM `document_search_index` WHERE `document_id` = OLD.`id`;
END;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
