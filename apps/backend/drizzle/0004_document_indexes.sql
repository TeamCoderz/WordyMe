CREATE INDEX `documents_user_id_idx` ON `documents` (`user_id`);--> statement-breakpoint
CREATE INDEX `documents_parent_id_idx` ON `documents` (`parent_id`);--> statement-breakpoint
CREATE INDEX `documents_space_id_idx` ON `documents` (`space_id`);--> statement-breakpoint
CREATE INDEX `documents_handle_idx` ON `documents` (`handle`);--> statement-breakpoint
CREATE INDEX `documents_current_revision_id_idx` ON `documents` (`current_revision_id`);--> statement-breakpoint
CREATE INDEX `revisions_document_id_created_at_idx` ON `revisions` (`document_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `revisions_user_id_idx` ON `revisions` (`user_id`);