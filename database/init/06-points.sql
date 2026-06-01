-- =========================================================
-- REPORTS
-- =========================================================
CREATE TABLE reports (
    uuid CHAR(36) NOT NULL,
    room_id CHAR(36) NOT NULL,
    reporter_id CHAR(36) NOT NULL,
    reported_id CHAR(36) NOT NULL,
    reason ENUM('late','absent','harassing','other') NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    resolved_by CHAR(36) NULL,

    PRIMARY KEY (uuid),

    CONSTRAINT fk_reports_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_reports_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_reports_reported
        FOREIGN KEY (reported_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- POINT_TRANSACTIONS
-- =========================================================
CREATE TABLE point_transactions (
    uuid CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    delta INT NOT NULL,
    reason ENUM('attendance','late','absent','harassing','other','reset') NOT NULL,
    room_id CHAR(36) NULL,
    report_id CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (uuid),

    CONSTRAINT fk_pt_user
        FOREIGN KEY (user_id)
        REFERENCES users(uuid)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX idx_reports_room ON reports(room_id);
CREATE INDEX idx_reports_reported ON reports(reported_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_pt_user ON point_transactions(user_id);
CREATE INDEX idx_pt_room ON point_transactions(room_id);
