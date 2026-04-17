CREATE TABLE IF NOT EXISTS users (
  uuid           CHAR(36)      PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  username       VARCHAR(50)   NOT NULL UNIQUE,
  phone          VARCHAR(20)   NOT NULL UNIQUE,
  email          VARCHAR(255)  NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  last_activity  DATETIME      DEFAULT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rating_avg     DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  rating_count   INT           NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rooms (
  uuid          CHAR(36)      PRIMARY KEY,
  title         VARCHAR(200)  NOT NULL,
  description   TEXT          DEFAULT NULL,
  status        ENUM('active','closed') NOT NULL DEFAULT 'active',
  creator_id    CHAR(36)      NOT NULL,
  max_members   INT           NOT NULL DEFAULT 10,
  event_time     DATETIME     DEFAULT NULL,
  event_end_time DATETIME     DEFAULT NULL,
  location      VARCHAR(255)  DEFAULT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(uuid)
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id   CHAR(36)  NOT NULL,
  user_id   CHAR(36)  NOT NULL,
  joined_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(uuid) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(uuid)
);

CREATE TABLE IF NOT EXISTS user_tokens (
  uuid         CHAR(36)     PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  token        VARCHAR(512) NOT NULL,
  device_type  VARCHAR(50)  DEFAULT NULL,
  device_name  VARCHAR(100) DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME     DEFAULT NULL,
  expires_at   DATETIME     DEFAULT NULL,
  revoked_at   DATETIME     DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(uuid)
);
