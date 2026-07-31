-- ============================================================
-- CREDIT — Student Credit & Reward Management System
-- Database schema (MySQL 8 / Aiven MySQL compatible)
-- ============================================================

CREATE DATABASE IF NOT EXISTS cmsweb;
USE cmsweb;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------- Schools ----------------
CREATE TABLE IF NOT EXISTS schools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- Houses ----------------
CREATE TABLE IF NOT EXISTS houses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  color_hex VARCHAR(20) DEFAULT '#7c3aed',
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- ---------------- Users (admin / teacher / parent / student) ----------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','teacher','parent','student') NOT NULL DEFAULT 'student',
  avatar_url VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- ---------------- Students ----------------
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  school_id INT NOT NULL,
  house_id INT,
  parent_id INT,               -- users.id of parent
  class_name VARCHAR(40),
  roll_no VARCHAR(40),
  total_credits INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------- Credit categories ----------------
CREATE TABLE IF NOT EXISTS credit_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,      -- e.g. Discipline in Class, Helped Friend, 100% Attendance, Extra Curricular
  default_points INT DEFAULT 10,
  icon VARCHAR(40) DEFAULT 'star',
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- ---------------- Credits (transactions) ----------------
CREATE TABLE IF NOT EXISTS credits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  category_id INT,
  awarded_by INT,                 -- users.id (teacher)
  points INT NOT NULL,
  note VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES credit_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (awarded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------- Rewards catalog ----------------
CREATE TABLE IF NOT EXISTS rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  points_required INT NOT NULL,
  stock INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- ---------------- Reward redemptions ----------------
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  student_id INT NOT NULL,
  reward_id INT NOT NULL,
  points_used INT NOT NULL,
  status ENUM('pending','approved','rejected','delivered') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
);

-- ---------------- Attendance ----------------
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  att_date DATE NOT NULL,
  status ENUM('present','absent','late') DEFAULT 'present',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_student_date (student_id, att_date)
);

-- ---------------- Announcements ----------------
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- ---------------- Platform settings (editable marketing metrics) ----------------
CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
);

-- ---------------- Lead capture: Book a Live Demo ----------------
CREATE TABLE IF NOT EXISTS demo_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  organization_name VARCHAR(180) NOT NULL,
  address VARCHAR(400) NOT NULL,
  status ENUM('new','contacted','converted','rejected') DEFAULT 'new',
  admin_notes VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- Lead capture: Start 45-Day Free Pilot ----------------
CREATE TABLE IF NOT EXISTS pilot_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL,
  organization_name VARCHAR(180) NOT NULL,
  address VARCHAR(400) NOT NULL,
  status ENUM('new','contacted','converted','rejected') DEFAULT 'new',
  admin_notes VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- Pricing plans (editable, feeds the Pricing page/section) ----------------
CREATE TABLE IF NOT EXISTS pricing_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_name VARCHAR(80) NOT NULL,
  price_label VARCHAR(60) NOT NULL,      -- e.g. "Rs 999/month" or "Custom Pricing"
  billing_note VARCHAR(120),
  features_json TEXT NOT NULL,           -- JSON array of feature strings
  is_highlighted TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- General contact messages (Contact page) ----------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(150) NOT NULL,
  designation VARCHAR(100),
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  student_count VARCHAR(40),
  city_state VARCHAR(150),
  message VARCHAR(1000),
  status ENUM('new','contacted','resolved') NOT NULL DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Seed: one demo school so the app has somewhere to log into.
-- All dashboard numbers are computed LIVE from real rows —
-- nothing in the app layer is hardcoded.
-- ============================================================
INSERT INTO schools (name, city) VALUES ('Greenfield International School', 'Kolkata')
  ON DUPLICATE KEY UPDATE name = name;

INSERT INTO houses (school_id, name, color_hex) VALUES
  (1,'Blue House','#2563eb'),
  (1,'Green House','#16a34a'),
  (1,'Red House','#dc2626'),
  (1,'Yellow House','#ca8a04')
  ON DUPLICATE KEY UPDATE name = name;

-- Default admin login: admin@greenfield.edu / Admin@123
-- (password_hash is a bcrypt hash generated by the seed script, not this file)
