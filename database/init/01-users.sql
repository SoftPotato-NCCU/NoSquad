-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE users (
    uuid CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    last_activity DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    rating_avg DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,

    PRIMARY KEY (uuid),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
