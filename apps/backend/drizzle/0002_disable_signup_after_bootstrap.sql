CREATE TRIGGER `users_single_bootstrap_guard`
BEFORE INSERT ON `users`
WHEN EXISTS (SELECT 1 FROM `users` LIMIT 1)
BEGIN
	SELECT RAISE(ABORT, 'signup_disabled');
END;
