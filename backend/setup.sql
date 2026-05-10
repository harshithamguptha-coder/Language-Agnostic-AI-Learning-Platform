CREATE DATABASE IF NOT EXISTS chatbot_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'chatbot_user'@'localhost'
  IDENTIFIED BY 'secure_password';

GRANT ALL PRIVILEGES ON chatbot_db.* TO 'chatbot_user'@'localhost';
FLUSH PRIVILEGES;

USE chatbot_db;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE chat_history
  ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(160) NOT NULL DEFAULT 'New chat',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_chat_sessions_user_id (user_id),
  CONSTRAINT fk_chat_sessions_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

ALTER TABLE chat_history
  ADD COLUMN IF NOT EXISTS session_id INT NULL;

CREATE INDEX IF NOT EXISTS ix_chat_history_session_id
  ON chat_history (session_id);
