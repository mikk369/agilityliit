-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'ORGANIZER', 'COMPETITOR') NOT NULL DEFAULT 'COMPETITOR',
    `password_changed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_token_hash_key`(`token_hash`),
    INDEX `password_reset_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `handlers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `handler_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `club_name` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL DEFAULT 'EST',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `handlers_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `handler_id` INTEGER NOT NULL,
    `nick_name` VARCHAR(191) NOT NULL,
    `official_name` VARCHAR(191) NULL,
    `breed` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `birthday` DATETIME(3) NULL,
    `size_est` VARCHAR(191) NULL,
    `size_fci` VARCHAR(191) NULL,
    `size_official` VARCHAR(191) NULL,
    `size_official_fci` VARCHAR(191) NULL,
    `agility_class` VARCHAR(191) NULL,
    `jump_class` VARCHAR(191) NULL,
    `register_code` VARCHAR(191) NULL,
    `id_code` VARCHAR(191) NULL,
    `general_vaccination_end` DATETIME(3) NULL,
    `rabies_vaccination_end` DATETIME(3) NULL,
    `owners_name` VARCHAR(191) NULL,
    `agility_class_changed_at` DATETIME(3) NULL,
    `jump_class_changed_at` DATETIME(3) NULL,
    `info` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `qual_time` VARCHAR(191) NULL,
    `organizer_name` VARCHAR(191) NOT NULL,
    `club_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `referee` JSON NULL,
    `info` TEXT NULL,
    `competition_classes` TEXT NULL,
    `competition_officiality` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `reg_status` VARCHAR(191) NULL,
    `reg_close_date` DATETIME(3) NULL,
    `protocol_published` INTEGER NOT NULL DEFAULT 0,
    `teams_locked` INTEGER NOT NULL DEFAULT 0,
    `teams_published` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `description_est` LONGTEXT NULL,
    `description_eng` LONGTEXT NULL,
    `sponsor_image_urls` JSON NULL,
    `max_competitors_per_day` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `competition_info_booking_id_key`(`booking_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_tracks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `competition_date` DATETIME(3) NOT NULL,
    `letter` VARCHAR(191) NOT NULL,
    `track_type` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `officiality` VARCHAR(191) NOT NULL,
    `referee` VARCHAR(191) NULL,
    `size_standard` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_relay` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `handler_id` INTEGER NOT NULL,
    `dog_id` INTEGER NOT NULL,
    `competitor_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `remarks` TEXT NULL,
    `needs_measurement` BOOLEAN NOT NULL DEFAULT false,
    `needs_competition_book` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitor_tracks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competitor_id` INTEGER NOT NULL,
    `competition_track_id` INTEGER NOT NULL,
    `competition_date` DATETIME(3) NOT NULL,
    `size_standard` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `start_protocol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `competitor_id` INTEGER NOT NULL,
    `competition_track_id` INTEGER NOT NULL,
    `competition_date` DATETIME(3) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `start_number` INTEGER NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `track_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `competition_track_id` INTEGER NOT NULL,
    `size_group` VARCHAR(191) NOT NULL,
    `track_length` DECIMAL(8, 2) NULL,
    `track_speed` DECIMAL(8, 2) NULL,
    `ideal_time` DECIMAL(8, 2) NULL,
    `max_time` DECIMAL(8, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `track_results_competition_track_id_size_group_key`(`competition_track_id`, `size_group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competitor_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `start_protocol_id` INTEGER NULL,
    `competitor_id` INTEGER NOT NULL,
    `competition_track_id` INTEGER NOT NULL,
    `time_seconds` DECIMAL(8, 2) NULL,
    `faults` INTEGER NOT NULL DEFAULT 0,
    `is_dsq` BOOLEAN NOT NULL DEFAULT false,
    `is_dns` BOOLEAN NOT NULL DEFAULT false,
    `has_qualification` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `competitor_results_competitor_id_competition_track_id_key`(`competitor_id`, `competition_track_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `competition_date` DATETIME(3) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `track_type` VARCHAR(191) NULL,
    `team_name` VARCHAR(191) NOT NULL DEFAULT '',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_id` INTEGER NOT NULL,
    `competitor_id` INTEGER NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `team_members_team_id_competitor_id_key`(`team_id`, `competitor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `team_id` INTEGER NOT NULL,
    `competition_track_id` INTEGER NOT NULL,
    `time_seconds` DECIMAL(8, 2) NULL,
    `faults` INTEGER NOT NULL DEFAULT 0,
    `is_dsq` BOOLEAN NOT NULL DEFAULT false,
    `is_dns` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `team_results_team_id_competition_track_id_key`(`team_id`, `competition_track_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `awardings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `awarding_tracks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `awarding_id` INTEGER NOT NULL,
    `letter` VARCHAR(191) NOT NULL,
    `track_type` VARCHAR(191) NOT NULL,
    `competition_date` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dog_measurements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dog_id` INTEGER NOT NULL,
    `booking_id` INTEGER NOT NULL,
    `referee` VARCHAR(191) NOT NULL DEFAULT '',
    `measurement` VARCHAR(191) NOT NULL DEFAULT '',
    `measurement_cm` DECIMAL(5, 2) NULL,
    `measurement_fci` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `handlers` ADD CONSTRAINT `handlers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dogs` ADD CONSTRAINT `dogs_handler_id_fkey` FOREIGN KEY (`handler_id`) REFERENCES `handlers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_info` ADD CONSTRAINT `competition_info_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_tracks` ADD CONSTRAINT `competition_tracks_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitors` ADD CONSTRAINT `competitors_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitors` ADD CONSTRAINT `competitors_handler_id_fkey` FOREIGN KEY (`handler_id`) REFERENCES `handlers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitors` ADD CONSTRAINT `competitors_dog_id_fkey` FOREIGN KEY (`dog_id`) REFERENCES `dogs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_tracks` ADD CONSTRAINT `competitor_tracks_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_tracks` ADD CONSTRAINT `competitor_tracks_competition_track_id_fkey` FOREIGN KEY (`competition_track_id`) REFERENCES `competition_tracks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `start_protocol` ADD CONSTRAINT `start_protocol_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `start_protocol` ADD CONSTRAINT `start_protocol_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `start_protocol` ADD CONSTRAINT `start_protocol_competition_track_id_fkey` FOREIGN KEY (`competition_track_id`) REFERENCES `competition_tracks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `track_results` ADD CONSTRAINT `track_results_competition_track_id_fkey` FOREIGN KEY (`competition_track_id`) REFERENCES `competition_tracks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_results` ADD CONSTRAINT `competitor_results_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitor_results` ADD CONSTRAINT `competitor_results_competition_track_id_fkey` FOREIGN KEY (`competition_track_id`) REFERENCES `competition_tracks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `teams_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_competitor_id_fkey` FOREIGN KEY (`competitor_id`) REFERENCES `competitors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_results` ADD CONSTRAINT `team_results_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_results` ADD CONSTRAINT `team_results_competition_track_id_fkey` FOREIGN KEY (`competition_track_id`) REFERENCES `competition_tracks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `awardings` ADD CONSTRAINT `awardings_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `awarding_tracks` ADD CONSTRAINT `awarding_tracks_awarding_id_fkey` FOREIGN KEY (`awarding_id`) REFERENCES `awardings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dog_measurements` ADD CONSTRAINT `dog_measurements_dog_id_fkey` FOREIGN KEY (`dog_id`) REFERENCES `dogs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dog_measurements` ADD CONSTRAINT `dog_measurements_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

