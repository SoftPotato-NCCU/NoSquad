-- =========================================================
-- ROOM_MEMBERS
-- =========================================================
CREATE TABLE room_members (
    room_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (room_id, user_id),

    CONSTRAINT fk_rm_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_rm_user
        FOREIGN KEY (user_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
