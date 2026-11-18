USE music_app_db;
DROP TABLE IF EXISTS `quiz_attempts`;
DROP TABLE IF EXISTS `user_instruments`;
DROP TABLE IF EXISTS `friends`;
DROP TABLE IF EXISTS `friend_requests`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `instruments`;

CREATE TABLE `instruments` (
  `instrument_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`instrument_id`),
  UNIQUE KEY `instrument_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Instruments supported by the quizzes.
INSERT INTO `instruments` (`name`) VALUES
  ('Piano'), ('Violin'), ('Guitar'), ('Trumpet');

CREATE TABLE `users` (
  `user_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `creation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total_points` bigint unsigned NOT NULL DEFAULT 0,
  `total_quizzes_completed` bigint unsigned NOT NULL DEFAULT 0,
  `total_first_try_correct` bigint unsigned NOT NULL DEFAULT 0,
  `total_questions_answered` bigint unsigned NOT NULL DEFAULT 0,
  `total_quiz_time_seconds` bigint unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `quiz_attempts` (
  `attempt_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `instrument_id` bigint unsigned NOT NULL,
  `quiz_type` varchar(50) NOT NULL,
  `points_earned` bigint unsigned DEFAULT NULL,
  `first_try_correct` int unsigned DEFAULT NULL,
  `total_questions` int unsigned NOT NULL,
  `started_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`attempt_id`),
  KEY `fk_quiz_attempts_user` (`user_id`),
  KEY `fk_quiz_attempts_instrument` (`instrument_id`),
  CONSTRAINT `fk_quiz_attempts_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_quiz_attempts_instrument` FOREIGN KEY (`instrument_id`)
    REFERENCES `instruments` (`instrument_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `user_instruments`
--

CREATE TABLE `user_instruments` (
  `user_id` bigint unsigned NOT NULL,
  `instrument_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`user_id`, `instrument_id`),
  KEY `fk_user_instruments_instrument` (`instrument_id`),
  CONSTRAINT `fk_user_instruments_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_user_instruments_instrument` FOREIGN KEY (`instrument_id`)
    REFERENCES `instruments` (`instrument_id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table structure for table `friends`
CREATE TABLE `friends` (
  `friendship_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `friend_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`friendship_id`),
  UNIQUE KEY `unique_friendship` (`user_id`, `friend_id`),
  KEY `fk_friends_friend` (`friend_id`),
  CONSTRAINT `fk_friends_friend` FOREIGN KEY (`friend_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_friends_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


--
-- Table structure for table `friend_requests`
--

CREATE TABLE `friend_requests` (
  `request_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `requester_id` bigint unsigned NOT NULL,
  `receiver_id` bigint unsigned NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `unique_request` (`requester_id`, `receiver_id`),
  KEY `fk_fr_receiver` (`receiver_id`),
  CONSTRAINT `fk_fr_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fr_requester` FOREIGN KEY (`requester_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
