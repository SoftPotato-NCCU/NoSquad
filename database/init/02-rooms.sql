-- =========================================================
-- ROOMS
-- =========================================================
CREATE TABLE rooms (
    uuid CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('open','full','closed','cancelled') DEFAULT 'open',

    creator_id CHAR(36) NOT NULL,
    max_members INT DEFAULT 1,

    event_time DATETIME,
    event_end_time DATETIME,
    location VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (uuid),

    CONSTRAINT fk_rooms_creator
        FOREIGN KEY (creator_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
