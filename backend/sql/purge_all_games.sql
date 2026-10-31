-- ============================================================================
-- TREASURE CASINO — SAFE DATABASE PURGE OF ALL EXISTING GAMES
-- ============================================================================
-- IMPORTANT:
-- 1. Safely removes all legacy game catalogue entries.
-- 2. Preserves ALL user accounts, credentials, and profiles.
-- 3. Preserves ALL wallet balances, deposit and withdrawal records.
-- 4. Preserves ALL financial transactions and ledger records.
-- 5. Preserves ALL admin users, audit logs, and system settings.
-- ============================================================================

USE `treasure_db`;

-- 1. Remove game sessions for retired games
DELETE FROM `game_sessions`;

-- 2. Remove game favorites for retired games
DELETE FROM `game_favorites`;

-- 3. Safely delete all legacy game catalogue records
DELETE FROM `games`;

-- 4. Verify user, wallet, and transaction counts remain intact
SELECT 'Users preserved' AS status, COUNT(*) AS total_count FROM `users`;
SELECT 'Wallets preserved' AS status, COUNT(*) AS total_count FROM `wallets`;
SELECT 'Transactions preserved' AS status, COUNT(*) AS total_count FROM `wallet_transactions`;
SELECT 'Deposits preserved' AS status, COUNT(*) AS total_count FROM `deposits`;
SELECT 'Withdrawals preserved' AS status, COUNT(*) AS total_count FROM `withdrawals`;
SELECT 'Remaining Games' AS status, COUNT(*) AS total_count FROM `games`;

