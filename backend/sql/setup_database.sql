-- ============================================================================
-- TREASURE CASINO - MySQL / MariaDB Database Setup & Migration Script
-- Target DBMS: XAMPP MySQL / MariaDB (10.4+)
-- Database: treasure_db
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `treasure_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `treasure_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(32) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
  `email_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `phone_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `two_factor_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `two_factor_secret` VARCHAR(255) DEFAULT NULL,
  `referral_code` VARCHAR(50) NOT NULL,
  `referred_by` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  UNIQUE KEY `idx_users_referral_code` (`referral_code`),
  INDEX `idx_users_status` (`status`),
  INDEX `idx_users_referred_by` (`referred_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. USER PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `display_name` VARCHAR(100) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `date_of_birth` DATE DEFAULT NULL,
  `country` VARCHAR(60) DEFAULT 'India',
  `address` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `zip_code` VARCHAR(20) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_profiles_user_id` (`user_id`),
  CONSTRAINT `fk_user_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. USER SESSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `token` VARCHAR(500) NOT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_user_sessions_user_id` (`user_id`),
  INDEX `idx_user_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_user_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. IDENTITY VERIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `identity_verifications` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'SELFIE') NOT NULL,
  `document_url` VARCHAR(255) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `reviewed_by` VARCHAR(36) DEFAULT NULL,
  `reviewed_at` DATETIME(3) DEFAULT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_id_verifications_user_id` (`user_id`),
  INDEX `idx_id_verifications_status` (`status`),
  CONSTRAINT `fk_id_verifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. WALLETS TABLE (Ledger Balance & Reserved Balance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wallets` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `balance` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `reserved_balance` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `version` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wallets_user_id` (`user_id`),
  CONSTRAINT `fk_wallets_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. WALLET TRANSACTIONS TABLE (Immutable Ledger Log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `wallet_id` VARCHAR(36) NOT NULL,
  `type` ENUM('DEPOSIT', 'WITHDRAWAL', 'REWARD', 'GAME_WIN', 'GAME_BET', 'REFUND') NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `balance_before` DECIMAL(18, 2) NOT NULL,
  `balance_after` DECIMAL(18, 2) NOT NULL,
  `reference_id` VARCHAR(100) DEFAULT NULL,
  `reference_type` VARCHAR(50) DEFAULT NULL,
  `idempotency_key` VARCHAR(191) DEFAULT NULL,
  `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_wallet_tx_idempotency` (`idempotency_key`),
  INDEX `idx_wallet_tx_wallet_id` (`wallet_id`),
  INDEX `idx_wallet_tx_type` (`type`),
  INDEX `idx_wallet_tx_status` (`status`),
  INDEX `idx_wallet_tx_created_at` (`created_at`),
  CONSTRAINT `fk_wallet_transactions_wallet`
    FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. PAYMENT ORDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `provider` VARCHAR(50) NOT NULL DEFAULT 'SIMULATED',
  `provider_order_id` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `metadata` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_payment_orders_user_id` (`user_id`),
  INDEX `idx_payment_orders_status` (`status`),
  CONSTRAINT `fk_payment_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. DEPOSITS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `deposits` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `payment_order_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `status` ENUM('PENDING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `transaction_id` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_deposits_user_id` (`user_id`),
  INDEX `idx_deposits_status` (`status`),
  CONSTRAINT `fk_deposits_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_deposits_payment_order`
    FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. WITHDRAWALS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `withdrawals` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `bank_details` LONGTEXT DEFAULT NULL,
  `reviewed_by` VARCHAR(36) DEFAULT NULL,
  `reviewed_at` DATETIME(3) DEFAULT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `transaction_id` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_withdrawals_user_id` (`user_id`),
  INDEX `idx_withdrawals_status` (`status`),
  CONSTRAINT `fk_withdrawals_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. GAME PROVIDERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_providers` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `api_base_url` VARCHAR(255) DEFAULT NULL,
  `api_key` VARCHAR(255) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_game_providers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. GAMES TABLE (Also referenced as game_catalog)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `games` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `thumbnail_url` VARCHAR(255) DEFAULT NULL,
  `category` ENUM('SLOTS', 'ARCADE', 'CARD', 'CASUAL', 'FISHING', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `provider_id` VARCHAR(36) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_demo` BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order` INT NOT NULL DEFAULT 0,
  `rtp` DECIMAL(5, 2) DEFAULT 96.50,
  `min_bet` DECIMAL(18, 2) DEFAULT 1.00,
  `max_bet` DECIMAL(18, 2) DEFAULT 5000.00,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_games_category` (`category`),
  INDEX `idx_games_provider_id` (`provider_id`),
  INDEX `idx_games_is_active` (`is_active`),
  CONSTRAINT `fk_games_provider`
    FOREIGN KEY (`provider_id`) REFERENCES `game_providers` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compatibility VIEW for game_catalog
CREATE OR REPLACE VIEW `game_catalog` AS SELECT * FROM `games`;

-- ----------------------------------------------------------------------------
-- 12. GAME SESSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_sessions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `game_id` VARCHAR(36) NOT NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ended_at` DATETIME(3) DEFAULT NULL,
  `bet_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `win_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  INDEX `idx_game_sessions_user_id` (`user_id`),
  INDEX `idx_game_sessions_game_id` (`game_id`),
  INDEX `idx_game_sessions_started_at` (`started_at`),
  CONSTRAINT `fk_game_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_game_sessions_game`
    FOREIGN KEY (`game_id`) REFERENCES `games` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. GAME FAVORITES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_favorites` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `game_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_game_favorites_user_game` (`user_id`, `game_id`),
  CONSTRAINT `fk_game_favorites_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_game_favorites_game`
    FOREIGN KEY (`game_id`) REFERENCES `games` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. REWARDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rewards` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `type` ENUM('DAILY', 'PROMO', 'VIP', 'REFERRAL', 'COUPON') NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `coupon_code` VARCHAR(50) DEFAULT NULL,
  `min_vip_level` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `starts_at` DATETIME(3) DEFAULT NULL,
  `expires_at` DATETIME(3) DEFAULT NULL,
  `max_claims` INT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_rewards_coupon_code` (`coupon_code`),
  INDEX `idx_rewards_type` (`type`),
  INDEX `idx_rewards_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 15. REWARD CLAIMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reward_claims` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `reward_id` VARCHAR(36) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `claimed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_reward_claims_user_id` (`user_id`),
  INDEX `idx_reward_claims_reward_id` (`reward_id`),
  CONSTRAINT `fk_reward_claims_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reward_claims_reward`
    FOREIGN KEY (`reward_id`) REFERENCES `rewards` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 16. VIP LEVELS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vip_levels` (
  `id` VARCHAR(36) NOT NULL,
  `level` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `required_points` INT NOT NULL DEFAULT 0,
  `cashback_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `bonus_multiplier` DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  `benefits` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_vip_levels_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17. REFERRALS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `referrals` (
  `id` VARCHAR(36) NOT NULL,
  `referrer_id` VARCHAR(36) NOT NULL,
  `referee_id` VARCHAR(36) NOT NULL,
  `status` ENUM('PENDING', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  `reward_claimed` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_referrals_referee_id` (`referee_id`),
  INDEX `idx_referrals_referrer_id` (`referrer_id`),
  CONSTRAINT `fk_referrals_referrer`
    FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_referrals_referee`
    FOREIGN KEY (`referee_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('SYSTEM', 'PROMOTION', 'TRANSACTION', 'SECURITY', 'SUPPORT') NOT NULL DEFAULT 'SYSTEM',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `data` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_notifications_user_id` (`user_id`),
  INDEX `idx_notifications_is_read` (`is_read`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 19. SUPPORT TICKETS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `assigned_to` VARCHAR(36) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_support_tickets_user_id` (`user_id`),
  INDEX `idx_support_tickets_status` (`status`),
  INDEX `idx_support_tickets_priority` (`priority`),
  CONSTRAINT `fk_support_tickets_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 20. ADMIN ROLES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_roles` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_admin_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 21. ADMIN PERMISSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_permissions` (
  `id` VARCHAR(36) NOT NULL,
  `role_id` VARCHAR(36) NOT NULL,
  `resource` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_admin_permissions_role_res_act` (`role_id`, `resource`, `action`),
  CONSTRAINT `fk_admin_permissions_role`
    FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 22. ADMIN USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role_id` VARCHAR(36) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `mfa_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `mfa_secret` VARCHAR(255) DEFAULT NULL,
  `last_login_at` DATETIME(3) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_admin_users_email` (`email`),
  INDEX `idx_admin_users_role_id` (`role_id`),
  CONSTRAINT `fk_admin_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 23. ADMIN AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `admin_user_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `resource` VARCHAR(100) NOT NULL,
  `resource_id` VARCHAR(100) DEFAULT NULL,
  `details` LONGTEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_admin_audit_logs_admin_id` (`admin_user_id`),
  INDEX `idx_admin_audit_logs_action` (`action`),
  INDEX `idx_admin_audit_logs_created_at` (`created_at`),
  CONSTRAINT `fk_admin_audit_logs_admin`
    FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 24. SYSTEM SETTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` VARCHAR(36) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_by` VARCHAR(36) DEFAULT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_system_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Roles
INSERT INTO `admin_roles` (`id`, `name`, `description`) VALUES
('role-superadmin', 'SuperAdmin', 'Unrestricted administrative access to all system resources'),
('role-finance', 'FinanceManager', 'Manages deposits, withdrawals, and financial reconciliations'),
('role-support', 'SupportAgent', 'Reviews support tickets and user inquiries'),
('role-operator', 'GameOperator', 'Manages game catalog, banners, and promotional campaigns')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- Default SuperAdmin User (Password: Admin123!)
INSERT INTO `admin_users` (`id`, `email`, `password_hash`, `name`, `role_id`, `is_active`) VALUES
('admin-001', 'admin@treasure.com', '$2y$10$xm/xQ64p48QjyS50YYSE9Okky2aJcrLPFXXc3xp/8wF1ldSms475G', 'Master Administrator', 'role-superadmin', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- VIP Levels
INSERT INTO `vip_levels` (`id`, `level`, `name`, `required_points`, `cashback_percent`, `bonus_multiplier`, `benefits`) VALUES
('vip-0', 0, 'Standard', 0, 0.00, 1.00, '{"perks":["Standard customer support","Access to all demo games"]}'),
('vip-1', 1, 'Bronze', 1000, 1.00, 1.10, '{"perks":["1% Daily Cashback","Bronze badge","Weekly bonus"]}'),
('vip-2', 2, 'Silver', 5000, 2.50, 1.25, '{"perks":["2.5% Daily Cashback","Silver badge","Priority queue support"]}'),
('vip-3', 3, 'Gold', 20000, 5.00, 1.50, '{"perks":["5% Daily Cashback","Gold badge","Personal Account Manager"]}'),
('vip-4', 4, 'Platinum', 50000, 8.00, 1.75, '{"perks":["8% Daily Cashback","Higher withdrawal limits","Exclusive VIP games"]}'),
('vip-5', 5, 'Diamond', 100000, 12.00, 2.00, '{"perks":["12% Daily Cashback","Instant withdrawal processing","VIP Luxury gifts"]}')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Game Providers
INSERT INTO `game_providers` (`id`, `name`, `api_base_url`, `is_active`) VALUES
('prov-inhouse', 'Treasure In-House', 'https://api.treasure.local/games/internal', TRUE),
('prov-evo', 'Evolution Gaming', 'https://api.evolution.local/v1', TRUE),
('prov-prag', 'Pragmatic Play', 'https://api.pragmatic.local/v1', TRUE)
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`);

-- Games Catalog (Reset / Empty — Ready for future authorized game registrations)
-- Previous legacy games have been retired.

-- System Rewards
INSERT INTO `rewards` (`id`, `name`, `description`, `type`, `amount`, `coupon_code`, `min_vip_level`, `is_active`) VALUES
('rew-daily-01', 'Daily Check-in Bonus', 'Free daily mystery reward credited directly to your gaming wallet.', 'DAILY', 50.00, NULL, 0, TRUE),
('rew-welcome-01', 'New Player Welcome Gift', 'Instant bonus chips to kick off your casino journey.', 'PROMO', 200.00, 'TREASURE200', 0, TRUE),
('rew-vip-01', 'VIP Bronze Tier Bonus', 'Exclusive promotion for Bronze tier members and above.', 'VIP', 500.00, NULL, 1, TRUE),
('rew-ref-01', 'Friend Invitation Reward', 'Rewarded to referrer when invited player registers and verifies.', 'REFERRAL', 100.00, NULL, 0, TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- System Settings
INSERT INTO `system_settings` (`id`, `key`, `value`, `description`) VALUES
('set-01', 'maintenance_mode', 'false', 'When true, non-admin API traffic is halted with 503 Service Unavailable'),
('set-02', 'simulated_payments_only', 'true', 'Restricts real-money operations; all deposits and withdrawals are simulated'),
('set-03', 'min_deposit_amount', '100.00', 'Minimum permitted deposit in INR'),
('set-04', 'max_deposit_amount', '100000.00', 'Maximum permitted deposit in INR'),
('set-05', 'min_withdrawal_amount', '500.00', 'Minimum permitted withdrawal in INR'),
('set-06', 'max_withdrawal_amount', '50000.00', 'Maximum permitted withdrawal in INR'),
('set-07', 'app_currency', 'INR', 'Default system currency code'),
('set-08', 'daily_reward_amount', '50.00', 'Standard daily claim reward amount')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

