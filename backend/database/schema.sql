-- MySQL schema for Smart-Infra
CREATE DATABASE IF NOT EXISTS smart_infra CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_infra;

CREATE TABLE IF NOT EXISTS detections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_path VARCHAR(512) NOT NULL,
  label VARCHAR(128),
  confidence FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
