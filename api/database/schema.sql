-- ==========================================================
-- VALERIE JEWELS — Relational Database Schema (MySQL / MariaDB)
-- Production Target: Hostinger Premium (MySQL 8.0 / MariaDB 10.4+)
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `valerie_jewels` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `valerie_jewels`;

-- Disable foreign key checks during schema generation
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- 1. USERS & STAFF ACCOUNTS
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `admin_activity_log`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `bundle_items`;
DROP TABLE IF EXISTS `bundles`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `phone` VARCHAR(25) DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('customer', 'staff', 'admin') NOT NULL DEFAULT 'customer',
    `is_blocked_rto` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Flagged for frequent courier returns',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_rto` (`is_blocked_rto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. CATEGORIES
-- ----------------------------------------------------------
CREATE TABLE `categories` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL UNIQUE,
    `description` TEXT DEFAULT NULL,
    `image_url` VARCHAR(255) DEFAULT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_categories_slug` (`slug`),
    INDEX `idx_categories_active_order` (`is_active`, `display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. PRODUCTS (Catalog Core)
-- ----------------------------------------------------------
CREATE TABLE `products` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(220) NOT NULL UNIQUE,
    `short_description` VARCHAR(255) DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `mrp` DECIMAL(10,2) NOT NULL COMMENT 'Original price for strike-through MRP display',
    `price` DECIMAL(10,2) NOT NULL COMMENT 'Actual selling price in INR',
    `cost_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'Internal cost for margin reporting',
    `sku` VARCHAR(80) NOT NULL UNIQUE,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `is_anti_tarnish` TINYINT(1) NOT NULL DEFAULT 1,
    `material` VARCHAR(150) NOT NULL DEFAULT '18K Gold Plated Stainless Steel (Anti-Tarnish)',
    `is_bestseller` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `meta_title` VARCHAR(255) DEFAULT NULL,
    `meta_description` TEXT DEFAULT NULL,
    `video_url` VARCHAR(255) DEFAULT NULL COMMENT 'Product demo / try-on short video',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_products_slug` (`slug`),
    INDEX `idx_products_category` (`category_id`),
    INDEX `idx_products_price` (`price`),
    INDEX `idx_products_status` (`is_active`, `is_bestseller`),
    CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. PRODUCT VARIANTS (Sizes, Finish, Dimensions)
-- ----------------------------------------------------------
CREATE TABLE `product_variants` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `sku` VARCHAR(90) NOT NULL UNIQUE,
    `title` VARCHAR(120) NOT NULL COMMENT 'e.g. Size 6 / 16-inch Chain / Rose Gold',
    `option1_name` VARCHAR(50) DEFAULT 'Size',
    `option1_value` VARCHAR(60) DEFAULT NULL,
    `mrp` DECIMAL(10,2) DEFAULT NULL,
    `price` DECIMAL(10,2) DEFAULT NULL,
    `stock_quantity` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_variants_product` (`product_id`),
    CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. PRODUCT IMAGES (Multi-image Gallery with Drag Reordering)
-- ----------------------------------------------------------
CREATE TABLE `product_images` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `alt_text` VARCHAR(255) DEFAULT NULL,
    `display_order` INT NOT NULL DEFAULT 0,
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_images_product` (`product_id`, `display_order`),
    CONSTRAINT `fk_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. BUNDLES / COMBO OFFERS (Per Competitor Flow & SRS Spec)
-- ----------------------------------------------------------
CREATE TABLE `bundles` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(180) NOT NULL,
    `slug` VARCHAR(200) NOT NULL UNIQUE,
    `description` TEXT DEFAULT NULL,
    `bundle_price` DECIMAL(10,2) NOT NULL,
    `compare_price` DECIMAL(10,2) NOT NULL,
    `badge_text` VARCHAR(60) NOT NULL DEFAULT 'Curated Combo Set',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_bundles_slug` (`slug`),
    INDEX `idx_bundles_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bundle_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `bundle_id` INT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    INDEX `idx_bundle_items_bundle` (`bundle_id`),
    CONSTRAINT `fk_bundle_items_bundle` FOREIGN KEY (`bundle_id`) REFERENCES `bundles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_bundle_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. COUPONS & PROMOTIONS
-- ----------------------------------------------------------
CREATE TABLE `coupons` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    `discount_value` DECIMAL(10,2) NOT NULL,
    `min_order_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `max_discount_amount` DECIMAL(10,2) DEFAULT NULL,
    `usage_limit` INT DEFAULT NULL,
    `used_count` INT NOT NULL DEFAULT 0,
    `valid_from` DATETIME DEFAULT NULL,
    `valid_until` DATETIME DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_coupons_code` (`code`),
    INDEX `idx_coupons_active` (`is_active`, `valid_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. ORDERS (Integrated with Fastrr Checkout & Shiprocket Specs)
-- ----------------------------------------------------------
CREATE TABLE `orders` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(50) NOT NULL UNIQUE,
    `user_id` BIGINT UNSIGNED DEFAULT NULL,
    `customer_name` VARCHAR(120) NOT NULL,
    `customer_email` VARCHAR(150) NOT NULL,
    `customer_phone` VARCHAR(25) NOT NULL,
    `shipping_address_line1` VARCHAR(255) NOT NULL,
    `shipping_address_line2` VARCHAR(255) DEFAULT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `pincode` VARCHAR(12) NOT NULL,
    `subtotal` DECIMAL(10,2) NOT NULL,
    `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `shipping_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(10,2) NOT NULL,
    `payment_type` ENUM('full_prepaid', 'partial', 'cod') NOT NULL DEFAULT 'full_prepaid',
    `amount_paid_upfront` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `amount_due_on_delivery` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `refund_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `payment_status` ENUM('pending', 'paid', 'partial_paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    `order_status` ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rto') NOT NULL DEFAULT 'pending',
    `fastrr_risk_tier` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'low',
    `fastrr_order_id` VARCHAR(100) DEFAULT NULL,
    `shiprocket_order_id` VARCHAR(100) DEFAULT NULL,
    `shiprocket_shipment_id` VARCHAR(100) DEFAULT NULL,
    `shiprocket_awb` VARCHAR(100) DEFAULT NULL,
    `courier_name` VARCHAR(80) DEFAULT 'Bluedart Express',
    `tracking_url` VARCHAR(255) DEFAULT NULL,
    `estimated_delivery_date` DATE DEFAULT NULL,
    `cancelled_at` DATETIME DEFAULT NULL,
    `cancellation_reason` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_orders_number` (`order_number`),
    INDEX `idx_orders_user` (`user_id`),
    INDEX `idx_orders_email` (`customer_email`),
    INDEX `idx_orders_status` (`order_status`),
    INDEX `idx_orders_payment_status` (`payment_status`),
    INDEX `idx_orders_shiprocket_awb` (`shiprocket_awb`),
    CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8b. ORDER TRACKING EVENTS (Milestone History)
-- ----------------------------------------------------------
CREATE TABLE `order_tracking_events` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `location` VARCHAR(100) DEFAULT 'Mumbai Fulfillment Atelier',
    `occurred_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_events_order` (`order_id`),
    CONSTRAINT `fk_events_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------
-- 9. ORDER ITEMS
-- ----------------------------------------------------------
CREATE TABLE `order_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `variant_id` BIGINT UNSIGNED DEFAULT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `variant_title` VARCHAR(120) DEFAULT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10,2) NOT NULL,
    `total_price` DECIMAL(10,2) NOT NULL,
    INDEX `idx_order_items_order` (`order_id`),
    CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 10. REVIEWS (Stub per SRS Spec)
-- ----------------------------------------------------------
CREATE TABLE `reviews` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED DEFAULT NULL,
    `reviewer_name` VARCHAR(120) NOT NULL,
    `rating` TINYINT UNSIGNED NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
    `title` VARCHAR(150) DEFAULT NULL,
    `comment` TEXT DEFAULT NULL,
    `is_verified_buyer` TINYINT(1) NOT NULL DEFAULT 1,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reviews_product` (`product_id`, `status`),
    CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 11. ADMIN ACTIVITY LOG (Audit Trail for Destructive/Financial Actions)
-- ----------------------------------------------------------
CREATE TABLE `admin_activity_log` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `admin_id` BIGINT UNSIGNED DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL COMMENT 'e.g. price_edit, cancel_order, process_refund, delete_product',
    `target_entity` VARCHAR(60) NOT NULL COMMENT 'e.g. products, orders, coupons',
    `target_id` VARCHAR(80) DEFAULT NULL,
    `details` LONGTEXT DEFAULT NULL COMMENT 'JSON payload of before/after changes',
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_admin_log_admin` (`admin_id`),
    INDEX `idx_admin_log_action` (`action`),
    INDEX `idx_admin_log_created` (`created_at`),
    CONSTRAINT `fk_admin_log_user` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 12. EMAIL LOGS (Idempotency & Audit Trail for Lifecycle Emails)
-- ----------------------------------------------------------
CREATE TABLE `email_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` BIGINT UNSIGNED DEFAULT NULL,
    `email_type` ENUM('order_confirmation', 'order_shipped', 'order_cancelled', 'abandoned_cart') NOT NULL,
    `recipient_email` VARCHAR(150) NOT NULL,
    `recipient_name` VARCHAR(120) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `status` ENUM('sent', 'failed', 'simulated') NOT NULL DEFAULT 'sent',
    `error_message` TEXT DEFAULT NULL,
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_order_email` (`order_id`, `email_type`),
    INDEX `idx_email_recipient` (`recipient_email`),
    CONSTRAINT `fk_email_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

