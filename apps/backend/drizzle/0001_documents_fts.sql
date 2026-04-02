CREATE VIRTUAL TABLE `documents_fts` USING fts5(
  name,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);
--> statement-breakpoint

CREATE TABLE `documents_fts_rowid_map` (
  `document_id` TEXT PRIMARY KEY NOT NULL,
  `user_id` TEXT NOT NULL,
  `fts_rowid` INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_fts_rowid_map_user_id_idx` ON `documents_fts_rowid_map` (`user_id`);
--> statement-breakpoint

CREATE TRIGGER `documents_fts_after_insert`
AFTER INSERT ON `documents`
BEGIN
  INSERT INTO `documents_fts` (`name`, `body`)
    VALUES (NEW.`name`, '');
  INSERT INTO `documents_fts_rowid_map` (`document_id`, `user_id`, `fts_rowid`)
    VALUES (NEW.`id`, NEW.`user_id`, last_insert_rowid());
END;
--> statement-breakpoint

CREATE TRIGGER `documents_fts_after_update_name`
AFTER UPDATE OF `name` ON `documents`
BEGIN
  UPDATE `documents_fts`
    SET `name` = NEW.`name`
    WHERE `rowid` = (
      SELECT `fts_rowid` FROM `documents_fts_rowid_map` WHERE `document_id` = OLD.`id`
    );
END;
--> statement-breakpoint

CREATE TRIGGER `documents_fts_after_update_current_revision`
AFTER UPDATE OF `current_revision_id` ON `documents`
WHEN NEW.`current_revision_id` IS NOT NULL
BEGIN
  UPDATE `documents_fts`
    SET `body` = (
      SELECT `text` FROM `revisions` WHERE `id` = NEW.`current_revision_id`
    )
    WHERE `rowid` = (
      SELECT `fts_rowid` FROM `documents_fts_rowid_map` WHERE `document_id` = NEW.`id`
    );
END;
--> statement-breakpoint

CREATE TRIGGER `documents_fts_after_delete`
AFTER DELETE ON `documents`
BEGIN
  DELETE FROM `documents_fts`
    WHERE `rowid` = (
      SELECT `fts_rowid` FROM `documents_fts_rowid_map` WHERE `document_id` = OLD.`id`
    );
  DELETE FROM `documents_fts_rowid_map` WHERE `document_id` = OLD.`id`;
END;
--> statement-breakpoint

INSERT INTO `documents_fts` (`rowid`, `name`, `body`)
SELECT
  ROW_NUMBER() OVER (ORDER BY d.`rowid`) AS rn,
  d.`name`,
  COALESCE(r.`text`, '') AS body
FROM `documents` d
LEFT JOIN `revisions` r ON r.`id` = d.`current_revision_id`;
--> statement-breakpoint

INSERT INTO `documents_fts_rowid_map` (`document_id`, `user_id`, `fts_rowid`)
SELECT
  d.`id`,
  d.`user_id`,
  ROW_NUMBER() OVER (ORDER BY d.`rowid`) AS rn
FROM `documents` d;
