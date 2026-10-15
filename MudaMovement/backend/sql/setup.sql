-- Setup MUDA Movement untuk MySQL 8+ atau TiDB.
-- Jalankan seluruh file ini dari awal sampai akhir menggunakan akun DB yang memiliki izin
-- CREATE DATABASE, CREATE TABLE, ALTER TABLE, dan INSERT.

CREATE DATABASE IF NOT EXISTS Muda_movement
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE Muda_movement;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(24) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  KEY users_phone_index (phone),
  KEY users_created_at_index (created_at)
);

-- Migrasi aman untuk tabel users yang sudah ada: menambahkan kolom yang belum tersedia
-- tanpa menghapus akun, mengubah role admin menjadi user, atau menimpa data profil.
SET @phone_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'phone'
);
SET @phone_column_sql = IF(
  @phone_column_exists = 0,
  "ALTER TABLE users ADD COLUMN phone VARCHAR(24) NOT NULL DEFAULT '' AFTER email",
  'SELECT 1'
);
PREPARE phone_column_statement FROM @phone_column_sql;
EXECUTE phone_column_statement;
DEALLOCATE PREPARE phone_column_statement;

SET @session_version_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'session_version'
);
SET @session_version_column_sql = IF(
  @session_version_column_exists = 0,
  'ALTER TABLE users ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE session_version_column_statement FROM @session_version_column_sql;
EXECUTE session_version_column_statement;
DEALLOCATE PREPARE session_version_column_statement;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

SET @phone_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'users_phone_index'
);
SET @phone_index_sql = IF(
  @phone_index_exists = 0,
  'CREATE INDEX users_phone_index ON users (phone)',
  'SELECT 1'
);
PREPARE phone_index_statement FROM @phone_index_sql;
EXECUTE phone_index_statement;
DEALLOCATE PREPARE phone_index_statement;

SET @created_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'users_created_at_index'
);
SET @created_index_sql = IF(
  @created_index_exists = 0,
  'CREATE INDEX users_created_at_index ON users (created_at)',
  'SELECT 1'
);
PREPARE created_index_statement FROM @created_index_sql;
EXECUTE created_index_statement;
DEALLOCATE PREPARE created_index_statement;

-- Status setup awal dikunci oleh backend; akun admin pertama dibuat melalui halaman React.
CREATE TABLE IF NOT EXISTS admin_setup_state (
  id TINYINT UNSIGNED NOT NULL,
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id)
);

INSERT IGNORE INTO admin_setup_state (id, setup_complete) VALUES (1, FALSE);

-- Tabel token reset password tidak lagi digunakan karena pemulihan password dilakukan
-- melalui email ke admin. Jika tabel lama masih ada, penghapusannya opsional:
-- DROP TABLE IF EXISTS password_reset_tokens;
