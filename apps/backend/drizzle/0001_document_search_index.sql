CREATE TABLE `document_search_index` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`document_id` text NOT NULL,
	`user_id` text NOT NULL,
	`current_revision_id` text,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`current_revision_id`) REFERENCES `revisions`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_search_index_document_id_unique` ON `document_search_index` (`document_id`);--> statement-breakpoint
CREATE INDEX `document_search_index_user_id_idx` ON `document_search_index` (`user_id`);--> statement-breakpoint
CREATE INDEX `document_search_index_current_revision_id_idx` ON `document_search_index` (`current_revision_id`);--> statement-breakpoint

INSERT INTO `document_search_index` (
	`id`,
	`created_at`,
	`updated_at`,
	`document_id`,
	`user_id`,
	`current_revision_id`,
	`title`,
	`body`
)
SELECT
	d.`id`,
	d.`created_at`,
	d.`updated_at`,
	d.`id`,
	d.`user_id`,
	d.`current_revision_id`,
	d.`name`,
	COALESCE(r.`text`, '')
FROM `documents` d
LEFT JOIN `revisions` r ON r.`id` = d.`current_revision_id`;
--> statement-breakpoint

CREATE VIRTUAL TABLE `document_search_fts` USING fts5(
	title,
	body,
	content='document_search_index',
	content_rowid='rowid',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint

CREATE TRIGGER `document_search_index_ai`
AFTER INSERT ON `document_search_index`
BEGIN
	INSERT INTO `document_search_fts` (`rowid`, `title`, `body`)
		VALUES (NEW.`rowid`, NEW.`title`, NEW.`body`);
END;
--> statement-breakpoint

CREATE TRIGGER `document_search_index_ad`
AFTER DELETE ON `document_search_index`
BEGIN
	INSERT INTO `document_search_fts` (`document_search_fts`, `rowid`, `title`, `body`)
		VALUES ('delete', OLD.`rowid`, OLD.`title`, OLD.`body`);
END;
--> statement-breakpoint

CREATE TRIGGER `document_search_index_au`
AFTER UPDATE ON `document_search_index`
BEGIN
	INSERT INTO `document_search_fts` (`document_search_fts`, `rowid`, `title`, `body`)
		VALUES ('delete', OLD.`rowid`, OLD.`title`, OLD.`body`);
	INSERT INTO `document_search_fts` (`rowid`, `title`, `body`)
		VALUES (NEW.`rowid`, NEW.`title`, NEW.`body`);
END;
--> statement-breakpoint

INSERT INTO `document_search_fts` (`document_search_fts`) VALUES ('rebuild');
--> statement-breakpoint

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

CREATE TRIGGER `revisions_sync_document_search_index_after_update_text`
AFTER UPDATE OF `text` ON `revisions`
BEGIN
	UPDATE `document_search_index`
		SET
			`body` = NEW.`text`,
			`updated_at` = NEW.`updated_at`
		WHERE `current_revision_id` = NEW.`id`;
END;