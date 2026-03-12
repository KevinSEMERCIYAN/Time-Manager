CREATE INDEX IF NOT EXISTS `Clock_date_idx` ON `Clock`(`date`);
CREATE INDEX IF NOT EXISTS `Clock_date_userId_idx` ON `Clock`(`date`, `userId`);
