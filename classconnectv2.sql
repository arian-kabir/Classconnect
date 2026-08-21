-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 18, 2026 at 02:23 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `classconnect_db`
--
CREATE DATABASE IF NOT EXISTS `classconnect_db`;
USE `classconnect_db`;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `user_id` INT PRIMARY KEY AUTO_INCREMENT,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `role` ENUM('student', 'teacher', 'admin') DEFAULT 'student',
    `profile_picture` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_active` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--
INSERT INTO `users` (`user_id`, `email`, `password_hash`, `full_name`, `role`, `profile_picture`) VALUES
(1, 'john.doe@university.edu', 'hashed_password_1', 'John Doe', 'student', NULL),
(2, 'jane.smith@university.edu', 'hashed_password_2', 'Jane Smith', 'student', NULL),
(3, 'prof.wilson@university.edu', 'hashed_password_3', 'Prof. Robert Wilson', 'teacher', NULL),
(4, 'alice.johnson@university.edu', 'hashed_password_4', 'Alice Johnson', 'student', NULL),
(5, 'dr.brown@university.edu', 'hashed_password_5', 'Dr. Sarah Brown', 'teacher', NULL),
(6, 'mike.ross@university.edu', 'hashed_password_6', 'Mike Ross', 'student', NULL),
(7, 'rachel.zane@university.edu', 'hashed_password_7', 'Rachel Zane', 'student', NULL),
(8, 'prof.davis@university.edu', 'hashed_password_8', 'Prof. James Davis', 'teacher', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
    `department_id` INT PRIMARY KEY AUTO_INCREMENT,
    `department_name` VARCHAR(100) UNIQUE NOT NULL,
    `description` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--
INSERT INTO `departments` (`department_id`, `department_name`, `description`) VALUES
(1, 'Computer Science', 'Department of Computer Science and Engineering'),
(2, 'Mathematics', 'Department of Mathematics'),
(3, 'Physics', 'Department of Physics');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
    `course_id` INT PRIMARY KEY AUTO_INCREMENT,
    `course_code` VARCHAR(20) UNIQUE NOT NULL,
    `course_name` VARCHAR(100) NOT NULL,
    `department_id` INT,
    `credits` INT DEFAULT 3,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--
INSERT INTO `courses` (`course_id`, `course_code`, `course_name`, `department_id`, `credits`) VALUES
(1, 'CS101', 'Introduction to Computer Science', 1, 3),
(2, 'CS201', 'Data Structures and Algorithms', 1, 3),
(3, 'CS301', 'Database Management Systems', 1, 3),
(4, 'MATH101', 'Calculus I', 2, 4),
(5, 'MATH201', 'Linear Algebra', 2, 3),
(6, 'PHY101', 'Physics I', 3, 3);

-- --------------------------------------------------------

--
-- Table structure for table `sections`
--
DROP TABLE IF EXISTS `sections`;
CREATE TABLE `sections` (
    `section_id` INT PRIMARY KEY AUTO_INCREMENT,
    `course_id` INT NOT NULL,
    `section_code` VARCHAR(20) NOT NULL,
    `semester` VARCHAR(20) NOT NULL,
    `year` YEAR NOT NULL,
    `teacher_id` INT,
    `max_students` INT DEFAULT 30,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE CASCADE,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_section` (`course_id`, `section_code`, `semester`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sections`
--
INSERT INTO `sections` (`section_id`, `course_id`, `section_code`, `semester`, `year`, `teacher_id`, `max_students`) VALUES
(1, 1, 'A', 'Fall', 2026, 3, 30),
(2, 1, 'B', 'Fall', 2026, 5, 30),
(3, 2, 'A', 'Spring', 2026, 3, 25),
(4, 3, 'A', 'Fall', 2026, 8, 30),
(5, 4, 'A', 'Fall', 2026, 5, 35),
(6, 5, 'A', 'Spring', 2026, 5, 30);

-- --------------------------------------------------------

--
-- Table structure for table `section_enrollments`
--
DROP TABLE IF EXISTS `section_enrollments`;
CREATE TABLE `section_enrollments` (
    `enrollment_id` INT PRIMARY KEY AUTO_INCREMENT,
    `section_id` INT NOT NULL,
    `student_id` INT NOT NULL,
    `enrollment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('active', 'dropped', 'completed') DEFAULT 'active',
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_enrollment` (`section_id`, `student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `section_enrollments`
--
INSERT INTO `section_enrollments` (`enrollment_id`, `section_id`, `student_id`, `status`) VALUES
(1, 1, 1, 'active'),
(2, 1, 2, 'active'),
(3, 1, 4, 'active'),
(4, 3, 1, 'active'),
(5, 3, 4, 'active'),
(6, 4, 1, 'active'),
(7, 4, 2, 'active'),
(8, 4, 6, 'active'),
(9, 4, 7, 'active'),
(10, 5, 2, 'active'),
(11, 5, 6, 'active'),
(12, 6, 1, 'active'),
(13, 6, 7, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `chat_rooms`
--
DROP TABLE IF EXISTS `chat_rooms`;
CREATE TABLE `chat_rooms` (
    `room_id` INT PRIMARY KEY AUTO_INCREMENT,
    `section_id` INT UNIQUE NOT NULL,
    `room_name` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_rooms`
--
INSERT INTO `chat_rooms` (`room_id`, `section_id`, `room_name`) VALUES
(1, 1, 'Chat - CS101 Section A (Fall 2026)'),
(2, 2, 'Chat - CS101 Section B (Fall 2026)'),
(3, 3, 'Chat - CS201 Section A (Spring 2026)'),
(4, 4, 'Chat - CS301 Section A (Fall 2026)'),
(5, 5, 'Chat - MATH101 Section A (Fall 2026)'),
(6, 6, 'Chat - MATH201 Section A (Spring 2026)');

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--
DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
    `message_id` INT PRIMARY KEY AUTO_INCREMENT,
    `room_id` INT NOT NULL,
    `sender_id` INT NOT NULL,
    `message_text` TEXT NOT NULL,
    `message_type` ENUM('text', 'image', 'file') DEFAULT 'text',
    `file_url` VARCHAR(255),
    `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_read` BOOLEAN DEFAULT FALSE,
    `reply_to_message_id` INT,
    FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`room_id`) ON DELETE CASCADE,
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`reply_to_message_id`) REFERENCES `chat_messages`(`message_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_messages`
--
INSERT INTO `chat_messages` (`message_id`, `room_id`, `sender_id`, `message_text`, `message_type`, `sent_at`) VALUES
(1, 1, 1, 'Hello everyone! Welcome to CS101', 'text', '2026-01-15 09:00:00'),
(2, 1, 3, 'Good morning class! Please review chapter 1 before next lecture.', 'text', '2026-01-15 09:05:00'),
(3, 1, 2, 'I have a question about the assignment.', 'text', '2026-01-15 09:10:00'),
(4, 1, 4, 'When is the first exam?', 'text', '2026-01-15 09:15:00'),
(5, 1, 3, 'The exam will be in Week 6.', 'text', '2026-01-15 09:20:00'),
(6, 3, 3, 'Welcome to CS201! This will be challenging but exciting.', 'text', '2026-01-20 10:00:00'),
(7, 4, 5, 'Please bring your textbooks to the next class.', 'text', '2026-01-25 11:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `message_read_status`
--
DROP TABLE IF EXISTS `message_read_status`;
CREATE TABLE `message_read_status` (
    `read_id` INT PRIMARY KEY AUTO_INCREMENT,
    `message_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`message_id`) REFERENCES `chat_messages`(`message_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_read` (`message_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `message_read_status`
--
INSERT INTO `message_read_status` (`read_id`, `message_id`, `user_id`, `read_at`) VALUES
(1, 1, 2, '2026-01-15 09:01:00'),
(2, 1, 3, '2026-01-15 09:02:00'),
(3, 1, 4, '2026-01-15 09:03:00'),
(4, 2, 1, '2026-01-15 09:06:00'),
(5, 2, 2, '2026-01-15 09:07:00'),
(6, 2, 4, '2026-01-15 09:08:00');

-- --------------------------------------------------------

--
-- Table structure for table `typing_status`
--
DROP TABLE IF EXISTS `typing_status`;
CREATE TABLE `typing_status` (
    `typing_id` INT PRIMARY KEY AUTO_INCREMENT,
    `room_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `is_typing` BOOLEAN DEFAULT FALSE,
    `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`room_id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_typing` (`room_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notes`
--
DROP TABLE IF EXISTS `notes`;
CREATE TABLE `notes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `content` JSON,
    `text_content` TEXT,
    `user_id` INT NOT NULL,
    `section_id` INT NOT NULL,
    `is_archived` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE,
    INDEX `idx_user_section` (`user_id`, `section_id`),
    INDEX `idx_user` (`user_id`),
    INDEX `idx_section` (`section_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notes`
--
INSERT INTO `notes` (`id`, `title`, `content`, `text_content`, `user_id`, `section_id`) VALUES
(1, 'My First Canvas Note', '{"type":"excalidraw","elements":[]}', 'This is a sample note with canvas and text content', 1, 1),
(2, 'Lecture Notes - Day 1', '{"type":"excalidraw","elements":[]}', 'Today we covered the basics of programming', 1, 1),
(3, 'Study Guide', '{"type":"excalidraw","elements":[]}', 'Key concepts to review: variables, loops, functions', 2, 3),
(4, 'Assignment Notes', '{"type":"excalidraw","elements":[]}', 'Database design principles for assignment 2', 4, 4);

-- --------------------------------------------------------

--
-- Table structure for table `routines`
--
DROP TABLE IF EXISTS `routines`;
CREATE TABLE `routines` (
    `routine_id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `section_id` INT NOT NULL,
    `day_of_week` ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `room_number` VARCHAR(20),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE,
    INDEX `idx_user_routine` (`user_id`, `day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `routines`
--
INSERT INTO `routines` (`routine_id`, `user_id`, `section_id`, `day_of_week`, `start_time`, `end_time`, `room_number`) VALUES
-- Student routines
(1, 1, 1, 'Monday', '09:00:00', '10:30:00', 'Room 101'),
(2, 1, 3, 'Wednesday', '11:00:00', '12:30:00', 'Room 203'),
(3, 1, 4, 'Friday', '14:00:00', '15:30:00', 'Room 305'),
(4, 2, 1, 'Monday', '09:00:00', '10:30:00', 'Room 101'),
(5, 2, 5, 'Tuesday', '10:00:00', '11:30:00', 'Room 102'),
(6, 4, 3, 'Wednesday', '11:00:00', '12:30:00', 'Room 203'),
(7, 4, 4, 'Thursday', '13:00:00', '14:30:00', 'Room 305'),
(8, 6, 4, 'Monday', '14:00:00', '15:30:00', 'Room 305'),
(9, 6, 6, 'Tuesday', '09:00:00', '10:30:00', 'Room 204'),
(10, 7, 4, 'Tuesday', '14:00:00', '15:30:00', 'Room 305'),
(11, 7, 6, 'Thursday', '11:00:00', '12:30:00', 'Room 204'),
-- Teacher routines
(12, 3, 1, 'Monday', '09:00:00', '10:30:00', 'Room 101'),
(13, 3, 3, 'Wednesday', '11:00:00', '12:30:00', 'Room 203'),
(14, 5, 2, 'Tuesday', '09:00:00', '10:30:00', 'Room 102'),
(15, 5, 4, 'Thursday', '13:00:00', '14:30:00', 'Room 305'),
(16, 8, 4, 'Friday', '14:00:00', '15:30:00', 'Room 305');

-- --------------------------------------------------------

--
-- Table structure for table `study_plans`
--
DROP TABLE IF EXISTS `study_plans`;
CREATE TABLE `study_plans` (
    `plan_id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `start_date` DATE NOT NULL,
    `end_date` DATE,
    `priority` ENUM('low', 'medium', 'high') DEFAULT 'medium',
    `status` ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    INDEX `idx_user_plan` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `study_plans`
--
INSERT INTO `study_plans` (`plan_id`, `user_id`, `title`, `description`, `start_date`, `end_date`, `priority`, `status`) VALUES
(1, 1, 'CS101 Exam Prep', 'Prepare for midterm exam covering chapters 1-5', '2026-09-01', '2026-09-15', 'high', 'pending'),
(2, 1, 'CS201 Assignment', 'Complete data structures assignment', '2026-09-05', '2026-09-20', 'high', 'in-progress'),
(3, 2, 'Math Revision', 'Review calculus concepts', '2026-09-10', '2026-09-25', 'medium', 'pending'),
(4, 4, 'Database Project', 'Work on database design project', '2026-09-01', '2026-09-30', 'high', 'in-progress'),
(5, 6, 'Physics Lab Report', 'Complete lab report for PHY101', '2026-09-15', '2026-09-22', 'medium', 'pending'),
(6, 7, 'Linear Algebra Study', 'Study linear algebra concepts', '2026-09-20', '2026-10-10', 'low', 'pending');

-- --------------------------------------------------------

--
-- Table structure for table `study_plan_tasks`
--
DROP TABLE IF EXISTS `study_plan_tasks`;
CREATE TABLE `study_plan_tasks` (
    `task_id` INT PRIMARY KEY AUTO_INCREMENT,
    `plan_id` INT NOT NULL,
    `task_title` VARCHAR(255) NOT NULL,
    `task_description` TEXT,
    `due_date` DATE,
    `is_completed` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`plan_id`) ON DELETE CASCADE,
    INDEX `idx_plan_task` (`plan_id`, `is_completed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `study_plan_tasks`
--
INSERT INTO `study_plan_tasks` (`task_id`, `plan_id`, `task_title`, `task_description`, `due_date`, `is_completed`) VALUES
(1, 1, 'Review Chapter 1', 'Review basic programming concepts', '2026-09-05', TRUE),
(2, 1, 'Review Chapter 2', 'Review control structures', '2026-09-08', FALSE),
(3, 1, 'Review Chapter 3', 'Review functions and arrays', '2026-09-12', FALSE),
(4, 2, 'Research', 'Research data structures for assignment', '2026-09-10', TRUE),
(5, 2, 'Implementation', 'Implement data structures in code', '2026-09-18', FALSE),
(6, 3, 'Review Calculus', 'Review derivatives and integrals', '2026-09-20', FALSE),
(7, 4, 'Design Schema', 'Design database schema for project', '2026-09-10', TRUE),
(8, 4, 'Implement Queries', 'Implement complex queries', '2026-09-25', FALSE);

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--
DROP TABLE IF EXISTS `assignments`;
CREATE TABLE `assignments` (
    `assignment_id` INT PRIMARY KEY AUTO_INCREMENT,
    `section_id` INT NOT NULL,
    `teacher_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `submission_link` VARCHAR(500), -- External API submission link
    `max_score` DECIMAL(5,2),
    `due_date` DATETIME NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    INDEX `idx_section_assignment` (`section_id`),
    INDEX `idx_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignments`
--
INSERT INTO `assignments` (`assignment_id`, `section_id`, `teacher_id`, `title`, `description`, `submission_link`, `max_score`, `due_date`) VALUES
(1, 1, 3, 'Programming Assignment 1', 'Write a program to calculate the factorial of a number', 'https://submit-api.com/assignments/CS101-A/1', 100.00, '2026-09-20 23:59:59'),
(2, 1, 3, 'Programming Assignment 2', 'Implement a simple calculator', 'https://submit-api.com/assignments/CS101-A/2', 100.00, '2026-10-05 23:59:59'),
(3, 3, 3, 'Data Structures Assignment', 'Implement a binary search tree', 'https://submit-api.com/assignments/CS201-A/1', 100.00, '2026-09-25 23:59:59'),
(4, 4, 8, 'Database Design Project', 'Design a database for a library management system', 'https://submit-api.com/assignments/CS301-A/1', 150.00, '2026-10-15 23:59:59'),
(5, 5, 5, 'Calculus Assignment', 'Solve integration problems', 'https://submit-api.com/assignments/MATH101-A/1', 50.00, '2026-09-30 23:59:59'),
(6, 6, 5, 'Linear Algebra Assignment', 'Solve matrix problems', 'https://submit-api.com/assignments/MATH201-A/1', 50.00, '2026-10-10 23:59:59');

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--
DROP TABLE IF EXISTS `assignment_submissions`;
CREATE TABLE `assignment_submissions` (
    `submission_id` INT PRIMARY KEY AUTO_INCREMENT,
    `assignment_id` INT NOT NULL,
    `student_id` INT NOT NULL,
    `submission_link` VARCHAR(500), -- Link to external submission
    `submission_text` TEXT, -- Optional text submission
    `file_url` VARCHAR(255), -- Optional file upload
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `score` DECIMAL(5,2),
    `feedback` TEXT,
    `status` ENUM('submitted', 'graded', 'returned') DEFAULT 'submitted',
    FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`assignment_id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_submission` (`assignment_id`, `student_id`),
    INDEX `idx_student_submission` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `assignment_submissions`
--
INSERT INTO `assignment_submissions` (`submission_id`, `assignment_id`, `student_id`, `submission_link`, `submission_text`, `score`, `feedback`, `status`) VALUES
(1, 1, 1, 'https://submit-api.com/submissions/1/1', 'Factorial program implemented in Python', 85.00, 'Good work! Add error handling.', 'graded'),
(2, 1, 2, 'https://submit-api.com/submissions/1/2', 'Factorial program in Java', 90.00, 'Excellent implementation!', 'graded'),
(3, 1, 4, 'https://submit-api.com/submissions/1/4', 'Factorial program in C++', 78.00, 'Needs improvement in memory management', 'graded'),
(4, 2, 1, NULL, 'Calculator program in Python', NULL, NULL, 'submitted'),
(5, 3, 4, NULL, 'BST implementation in Java', NULL, NULL, 'submitted'),
(6, 5, 2, NULL, 'Solved integration problems', NULL, NULL, 'submitted');

-- --------------------------------------------------------

--
-- Table structure for table `note_shares`
--
DROP TABLE IF EXISTS `note_shares`;
CREATE TABLE `note_shares` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `note_id` INT NOT NULL,
    `shared_with_user_id` INT NOT NULL,
    `permission` ENUM('view', 'edit') DEFAULT 'view',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`shared_with_user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_note_share` (`note_id`, `shared_with_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Schema additions for: Automated External Spreadsheet Routine Intake
-- (Module 1 — Faria Fairooz Zahan)
--

-- Add teacher initials lookup column to users
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `initials` VARCHAR(10) DEFAULT NULL COMMENT 'Teacher initials matching spreadsheet (e.g. AQU, MSMA)';

-- Track whether a routine row came from manual entry or spreadsheet sync
ALTER TABLE `routines`
  ADD COLUMN IF NOT EXISTS `source` ENUM('manual','spreadsheet') DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS `spreadsheet_row_ref` INT DEFAULT NULL COMMENT '1-based row index in the source spreadsheet';

-- Unique constraint enabling idempotent UPSERT
ALTER TABLE `routines`
  ADD UNIQUE KEY IF NOT EXISTS `uq_user_section_day` (`user_id`, `section_id`, `day_of_week`);

-- --------------------------------------------------------

--
-- Table structure for table `section_schedules`
-- Master schedule populated from the university spreadsheet.
-- One row per section+day+timeslot. Students' routines are fanned out from here.
--
CREATE TABLE IF NOT EXISTS `section_schedules` (
  `schedule_id`         INT PRIMARY KEY AUTO_INCREMENT,
  `section_id`          INT NOT NULL,
  `day_of_week`         ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time`          TIME NOT NULL,
  `end_time`            TIME NOT NULL,
  `room_number`         VARCHAR(30) DEFAULT 'TBA',
  `teacher_id`          INT DEFAULT NULL,
  `spreadsheet_row_ref` INT DEFAULT NULL,
  `last_synced_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  UNIQUE KEY `uq_section_day_start` (`section_id`, `day_of_week`, `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `routine_intake_log`
-- Audit log of every spreadsheet sync run.
--
CREATE TABLE IF NOT EXISTS `routine_intake_log` (
  `log_id`          INT PRIMARY KEY AUTO_INCREMENT,
  `spreadsheet_id`  VARCHAR(255),
  `sheet_range`     VARCHAR(100),
  `total_raw_rows`  INT DEFAULT 0,
  `inserted`        INT DEFAULT 0,
  `updated`         INT DEFAULT 0,
  `skipped`         INT DEFAULT 0,
  `warnings_count`  INT DEFAULT 0,
  `errors_count`    INT DEFAULT 0,
  `ran_at`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Schema additions for: Cross-Role Section Staffing & Allocation Ledger
-- (Module 2 — Faria Fairooz Zahan)
--

ALTER TABLE `sections`
  ADD COLUMN IF NOT EXISTS `section_type` ENUM('LECTURE', 'LAB', 'TUTORIAL', 'COMBINED') DEFAULT 'LECTURE';

--
-- Table structure for table `section_staff`
-- Maps primary instructors, teaching assistants, lab assistants, and student tutors to sections.
--
CREATE TABLE IF NOT EXISTS `section_staff` (
  `allocation_id` INT PRIMARY KEY AUTO_INCREMENT,
  `section_id`    INT NOT NULL,
  `user_id`       INT NOT NULL,
  `role_type`     ENUM('primary_instructor', 'teaching_assistant', 'lab_assistant', 'student_tutor') NOT NULL,
  `assigned_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `assigned_by`   INT DEFAULT NULL,
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_section_user_role` (`section_id`, `user_id`, `role_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Schema additions for: Contextual Student Routine Builder & Study Scheduler
-- (Module 3 — Faria Fairooz Zahan)
--

--
-- Table structure for table `study_sessions`
--
CREATE TABLE IF NOT EXISTS `study_sessions` (
  `session_id`        INT PRIMARY KEY AUTO_INCREMENT,
  `user_id`           INT NOT NULL,
  `course_id`         INT DEFAULT NULL,
  `title`             VARCHAR(255) NOT NULL,
  `description`       TEXT DEFAULT NULL,
  `day_of_week`       ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
  `start_time`        TIME NOT NULL,
  `end_time`          TIME NOT NULL,
  `session_date`      DATE DEFAULT NULL,
  `priority`          ENUM('low','medium','high','urgent') DEFAULT 'medium',
  `status`            ENUM('scheduled','completed','skipped') DEFAULT 'scheduled',
  `duration_minutes`  INT DEFAULT 60,
  `color_tag`         VARCHAR(20) DEFAULT '#002626',
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE SET NULL,
  INDEX `idx_user_day` (`user_id`, `day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `reminders`
--
CREATE TABLE IF NOT EXISTS `reminders` (
  `reminder_id`        INT PRIMARY KEY AUTO_INCREMENT,
  `user_id`            INT NOT NULL,
  `entity_type`        ENUM('assignment','study_session','custom') NOT NULL,
  `entity_id`          INT DEFAULT NULL,
  `title`              VARCHAR(255) NOT NULL,
  `message`            TEXT DEFAULT NULL,
  `due_at`             DATETIME NOT NULL,
  `alert_offset_hours` INT DEFAULT 24,
  `is_dismissed`       BOOLEAN DEFAULT FALSE,
  `is_read`            BOOLEAN DEFAULT FALSE,
  `created_at`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_user_alerts` (`user_id`, `is_dismissed`, `due_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;