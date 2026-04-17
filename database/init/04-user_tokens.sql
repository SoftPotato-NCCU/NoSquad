-- =========================================================
-- USER_TOKENS
-- =========================================================
CREATE TABLE user_tokens (
    uuid CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    token VARCHAR(512) NOT NULL,

    user_agent TEXT,
    ip_address VARCHAR(45),

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,

    PRIMARY KEY (uuid),

    CONSTRAINT fk_user_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;