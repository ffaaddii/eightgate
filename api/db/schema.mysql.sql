CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
);

CREATE TABLE IF NOT EXISTS user_devices (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  label VARCHAR(128) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  approved_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_devices_user_device (user_id, device_id),
  KEY idx_user_devices_user (user_id)
);

CREATE TABLE IF NOT EXISTS hscodes (
  id CHAR(36) NOT NULL,
  code VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  notes TEXT NULL,
  full_import_fee DECIMAL(12,2) NULL,
  consumption_spending_fee DECIMAL(12,2) NULL,
  tax_advance DECIMAL(12,2) NULL,
  unit_type VARCHAR(64) NULL,
  classification_note_name VARCHAR(255) NULL,
  classification_note_path VARCHAR(500) NULL,
  product_image_name VARCHAR(255) NULL,
  product_image_path VARCHAR(500) NULL,
  status VARCHAR(32) NOT NULL,
  created_by CHAR(36) NOT NULL,
  updated_by CHAR(36) NOT NULL,
  audited_by CHAR(36) NULL,
  audited_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hscodes_code (code),
  KEY idx_hscodes_status (status),
  KEY idx_hscodes_updated_at (updated_at)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  actor_user_id CHAR(36) NULL,
  actor_username VARCHAR(64) NULL,
  target_type VARCHAR(32) NULL,
  target_id VARCHAR(64) NULL,
  summary TEXT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_created_at (created_at),
  KEY idx_audit_logs_event_type (event_type),
  KEY idx_audit_logs_actor (actor_user_id)
);
