# Database Schema Design

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Pre-Development Blueprint

---

## Executive Summary

This document defines the complete database schema for the Incog browser application, including table definitions, relationships, encryption requirements, indexes, and migration strategies. The schema is designed for MySQL 8.0+ or TiDB with support for encrypted fields and efficient querying.

---

## 1. Database Overview

### 1.1 Design Principles

**Normalization:** Schema follows third normal form (3NF) to minimize redundancy and maintain data integrity.

**Encryption:** Sensitive fields are encrypted at the application level before storage.

**Indexing:** Strategic indexes on frequently queried columns optimize query performance.

**Audit Trail:** All tables include timestamp fields for audit purposes.

**Soft Deletes:** Deleted records are marked but retained for compliance and recovery.

### 1.2 Database Configuration

```sql
CREATE DATABASE incog_browser
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE incog_browser;

-- Enable required features
SET GLOBAL event_scheduler = ON;
SET GLOBAL innodb_autoinc_lock_mode = 2;
```

---

## 2. Core Tables

### 2.1 Users Table

**Purpose:** Store user accounts and authentication information.

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  last_signed_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NULL,

  INDEX idx_open_id (open_id),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: Auto-incrementing primary key
- `open_id`: OAuth identifier from Manus OAuth (unique)
- `name`: User display name
- `email`: User email address
- `login_method`: Authentication method (oauth, etc.)
- `role`: User role (user or admin)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `last_signed_in`: Last login timestamp
- `deleted_at`: Soft delete timestamp

### 2.2 Accounts Table

**Purpose:** Store user browsing accounts with isolation context.

```sql
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARBINARY(255) NOT NULL,
  description VARBINARY(1000),
  is_protected BOOLEAN DEFAULT FALSE NOT NULL,
  proxy_config_id VARCHAR(36),
  data_directory VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  last_accessed_at TIMESTAMP,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (proxy_config_id) REFERENCES proxy_configs(id),
  INDEX idx_user_id (user_id),
  INDEX idx_proxy_config_id (proxy_config_id),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `name`: Account name (encrypted)
- `description`: Account description (encrypted)
- `is_protected`: Whether biometric auth is required
- `proxy_config_id`: Foreign key to proxy configs
- `data_directory`: Unique suffix for storage isolation
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `last_accessed_at`: Last access timestamp
- `deleted_at`: Soft delete timestamp

### 2.3 Sessions Table

**Purpose:** Store active user sessions with account context.

```sql
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  INDEX idx_user_id (user_id),
  INDEX idx_account_id (account_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `account_id`: Foreign key to accounts table
- `created_at`: Session creation timestamp
- `expires_at`: Session expiration timestamp
- `last_activity_at`: Last activity timestamp
- `ip_address`: Client IP address
- `user_agent`: Client user agent
- `deleted_at`: Soft delete timestamp

---

## 3. Proxy Configuration Tables

### 3.1 Proxy Configs Table

**Purpose:** Store proxy configurations with encryption for credentials.

```sql
CREATE TABLE proxy_configs (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  name VARBINARY(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INT NOT NULL,
  username VARBINARY(255),
  password VARBINARY(255),
  v2ray_config LONGTEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  last_tested_at TIMESTAMP,
  test_result_success BOOLEAN,
  test_result_latency INT,
  test_result_error TEXT,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `name`: Proxy name (encrypted)
- `type`: Proxy protocol type
- `host`: Proxy hostname or IP
- `port`: Proxy port number
- `username`: Proxy username (encrypted)
- `password`: Proxy password (encrypted)
- `v2ray_config`: V2Ray configuration JSON (encrypted)
- `is_active`: Whether proxy is active
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `last_tested_at`: Last test timestamp
- `test_result_success`: Last test result
- `test_result_latency`: Last test latency
- `test_result_error`: Last test error message
- `deleted_at`: Soft delete timestamp

---

## 4. Browser Tab Tables

### 4.1 Browser Tabs Table

**Purpose:** Store browser tabs and navigation state per account.

```sql
CREATE TABLE browser_tabs (
  id VARCHAR(36) PRIMARY KEY,
  account_id VARCHAR(36) NOT NULL,
  user_id INT NOT NULL,
  title TEXT,
  url TEXT,
  is_active BOOLEAN DEFAULT FALSE NOT NULL,
  is_incognito BOOLEAN DEFAULT FALSE NOT NULL,
  favicon LONGBLOB,
  thumbnail LONGBLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NULL,

  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_account_id (account_id),
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active),
  INDEX idx_is_incognito (is_incognito),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: UUID primary key
- `account_id`: Foreign key to accounts table
- `user_id`: Foreign key to users table
- `title`: Tab title
- `url`: Current tab URL
- `is_active`: Whether tab is currently active
- `is_incognito`: Whether tab is in incognito mode
- `favicon`: Tab favicon (binary)
- `thumbnail`: Tab screenshot thumbnail (binary)
- `created_at`: Tab creation timestamp
- `last_accessed_at`: Last access timestamp
- `deleted_at`: Soft delete timestamp

### 4.2 Tab State Table

**Purpose:** Store WebView state for tab restoration.

```sql
CREATE TABLE tab_states (
  id VARCHAR(36) PRIMARY KEY,
  tab_id VARCHAR(36) NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  user_id INT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  scroll_position_x INT DEFAULT 0,
  scroll_position_y INT DEFAULT 0,
  zoom_level DECIMAL(3, 2) DEFAULT 1.00,
  navigation_history LONGTEXT,
  form_data LONGTEXT,
  state_data LONGBLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY (tab_id) REFERENCES browser_tabs(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_tab_id (tab_id),
  INDEX idx_account_id (account_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: UUID primary key
- `tab_id`: Foreign key to browser tabs
- `account_id`: Foreign key to accounts
- `user_id`: Foreign key to users
- `url`: Tab URL
- `title`: Tab title
- `scroll_position_x`: Horizontal scroll position
- `scroll_position_y`: Vertical scroll position
- `zoom_level`: Zoom level
- `navigation_history`: Navigation history JSON
- `form_data`: Form data JSON
- `state_data`: Serialized WebView state
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

---

## 5. Audit & Logging Tables

### 5.1 Audit Logs Table

**Purpose:** Track all user actions for security and compliance.

```sql
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  account_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(36),
  changes JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status ENUM('success', 'failure') DEFAULT 'success' NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  INDEX idx_user_id (user_id),
  INDEX idx_account_id (account_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `account_id`: Foreign key to accounts table (optional)
- `action`: Action performed (e.g., 'account.create')
- `resource`: Resource type (e.g., 'account')
- `resource_id`: Resource identifier
- `changes`: JSON object with field changes
- `ip_address`: Client IP address
- `user_agent`: Client user agent
- `status`: Action status (success or failure)
- `error_message`: Error message if failed
- `created_at`: Log timestamp

### 5.2 Security Events Table

**Purpose:** Track security-related events for monitoring.

```sql
CREATE TABLE security_events (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT,
  event_type VARCHAR(100) NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Fields:**

- `id`: UUID primary key
- `user_id`: Foreign key to users table (optional)
- `event_type`: Type of security event
- `severity`: Event severity level
- `description`: Event description
- `ip_address`: Client IP address
- `user_agent`: Client user agent
- `metadata`: Additional event metadata
- `created_at`: Event timestamp

---

## 6. Encryption Requirements

### 6.1 Encrypted Fields

The following fields MUST be encrypted before storage:

| Table         | Field        | Encryption  | Key         |
| ------------- | ------------ | ----------- | ----------- |
| accounts      | name         | AES-256-GCM | Account key |
| accounts      | description  | AES-256-GCM | Account key |
| proxy_configs | name         | AES-256-GCM | User key    |
| proxy_configs | username     | AES-256-GCM | User key    |
| proxy_configs | password     | AES-256-GCM | User key    |
| proxy_configs | v2ray_config | AES-256-GCM | User key    |

### 6.2 Key Derivation

```typescript
// Derive account key from user key and account ID
async function deriveAccountKey(
  userId: number,
  accountId: string
): Promise<CryptoKey> {
  const masterKey = await getMasterKey();
  const material = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(`${userId}:${accountId}`),
      iterations: 100000,
      hash: "SHA-256",
    },
    masterKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return material;
}

// Derive user key from master key and user ID
async function deriveUserKey(userId: number): Promise<CryptoKey> {
  const masterKey = await getMasterKey();
  const material = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(`user:${userId}`),
      iterations: 100000,
      hash: "SHA-256",
    },
    masterKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return material;
}
```

---

## 7. Indexes Strategy

### 7.1 Primary Indexes

**User Queries:**

```sql
-- Find user by OAuth ID
CREATE INDEX idx_users_open_id ON users(open_id);

-- List users by role
CREATE INDEX idx_users_role ON users(role);
```

**Account Queries:**

```sql
-- Find accounts by user
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Find account by proxy config
CREATE INDEX idx_accounts_proxy_config_id ON accounts(proxy_config_id);
```

**Session Queries:**

```sql
-- Find active sessions
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Find sessions by user
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### 7.2 Composite Indexes

**Frequently Used Combinations:**

```sql
-- Find tabs by account and status
CREATE INDEX idx_tabs_account_active ON browser_tabs(account_id, is_active);

-- Find audit logs by user and action
CREATE INDEX idx_audit_user_action ON audit_logs(user_id, action, created_at);

-- Find proxy configs by user and type
CREATE INDEX idx_proxy_user_type ON proxy_configs(user_id, type, is_active);
```

---

## 8. Query Patterns

### 8.1 Common Queries

**Get user with accounts:**

```sql
SELECT u.*, COUNT(a.id) as account_count
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id AND a.deleted_at IS NULL
WHERE u.id = ? AND u.deleted_at IS NULL
GROUP BY u.id;
```

**Get account with tabs:**

```sql
SELECT a.*, COUNT(t.id) as tab_count
FROM accounts a
LEFT JOIN browser_tabs t ON a.id = t.account_id AND t.deleted_at IS NULL
WHERE a.id = ? AND a.user_id = ? AND a.deleted_at IS NULL;
```

**Get active session:**

```sql
SELECT s.*
FROM sessions s
WHERE s.id = ? AND s.expires_at > NOW() AND s.deleted_at IS NULL
LIMIT 1;
```

### 8.2 Aggregation Queries

**User activity stats:**

```sql
SELECT
  u.id,
  u.name,
  COUNT(DISTINCT a.id) as account_count,
  COUNT(DISTINCT s.id) as active_session_count,
  MAX(u.last_signed_in) as last_login
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id AND a.deleted_at IS NULL
LEFT JOIN sessions s ON u.id = s.user_id AND s.expires_at > NOW()
WHERE u.deleted_at IS NULL
GROUP BY u.id;
```

**Proxy usage stats:**

```sql
SELECT
  p.id,
  p.name,
  p.type,
  COUNT(a.id) as account_count,
  AVG(p.test_result_latency) as avg_latency
FROM proxy_configs p
LEFT JOIN accounts a ON p.id = a.proxy_config_id AND a.deleted_at IS NULL
WHERE p.user_id = ? AND p.deleted_at IS NULL
GROUP BY p.id;
```

---

## 9. Migration Strategy

### 9.1 Initial Migration

```sql
-- Run all table creation scripts
-- Verify all tables created successfully
-- Create all indexes
-- Verify all indexes created successfully
```

### 9.2 Schema Updates

**Versioning:**

```sql
CREATE TABLE schema_versions (
  version INT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO schema_versions (version, description) VALUES
(1, 'Initial schema'),
(2, 'Add security_events table'),
(3, 'Add indexes for performance');
```

**Update Procedure:**

```sql
-- 1. Add new column
ALTER TABLE accounts ADD COLUMN new_field VARCHAR(255);

-- 2. Backfill data
UPDATE accounts SET new_field = 'default_value';

-- 3. Add constraint
ALTER TABLE accounts MODIFY COLUMN new_field VARCHAR(255) NOT NULL;

-- 4. Update schema version
INSERT INTO schema_versions (version, description) VALUES
(4, 'Add new_field to accounts table');
```

---

## 10. Performance Optimization

### 10.1 Query Optimization

**Use EXPLAIN to analyze queries:**

```sql
EXPLAIN SELECT * FROM accounts WHERE user_id = ? AND deleted_at IS NULL;
```

**Expected execution plan:**

- Type: ref (uses index)
- Rows: small number
- Extra: Using where

### 10.2 Connection Pooling

```typescript
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function getConnection() {
  return pool.getConnection();
}
```

---

## 11. Backup & Recovery

### 11.1 Backup Strategy

**Daily automated backups:**

```bash
# Full backup
mysqldump -u root -p incog_browser > backup_$(date +%Y%m%d).sql

# Incremental backup (binary log)
mysqlbinlog --start-position=X mysql-bin.000001 > incremental.sql
```

**Backup retention:**

- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

### 11.2 Recovery Procedure

**Point-in-time recovery:**

```bash
# Restore from full backup
mysql -u root -p incog_browser < backup_20251201.sql

# Apply incremental backups
mysql -u root -p incog_browser < incremental.sql
```

---

## References

[1] MySQL Documentation: https://dev.mysql.com/doc/
[2] Drizzle ORM: https://orm.drizzle.team/
[3] Database Normalization: https://en.wikipedia.org/wiki/Database_normalization
[4] SQL Indexing: https://use-the-index-luke.com/

---

**Next Document:** [API Contract Documentation](../api/01-TRPC-API-CONTRACTS.md)
