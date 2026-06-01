-- =========================================================
-- ROOM_MESSAGES（群組聊天訊息）
-- =========================================================
CREATE TABLE room_messages (
    id         BIGINT   NOT NULL AUTO_INCREMENT,
    room_id    CHAR(36) NOT NULL,
    user_id    CHAR(36) NOT NULL,
    body       VARCHAR(2000) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_msg_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_msg_user
        FOREIGN KEY (user_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 輪詢用：同一房間依 id 遞增撈新訊息
CREATE INDEX idx_msg_room_id ON room_messages(room_id, id);
