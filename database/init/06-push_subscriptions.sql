-- =========================================================
-- PUSH_SUBSCRIPTIONS
-- =========================================================
CREATE TABLE push_subscriptions (
    uuid CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    endpoint VARCHAR(512) NOT NULL,
    platform VARCHAR(20) DEFAULT 'web',

    p256dh TEXT,
    auth TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (uuid),
    UNIQUE KEY unique_endpoint (endpoint),

    CONSTRAINT fk_push_subscriptions_user
        FOREIGN KEY (user_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
