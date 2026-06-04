-- =========================================================
-- CREDIT SCORE LOGS
-- =========================================================
CREATE TABLE credit_score_logs (
    uuid CHAR(36) NOT NULL,
    room_id CHAR(36) NOT NULL,
    target_user_id CHAR(36) NOT NULL,
    reporter_id CHAR(36) NOT NULL,
    reason ENUM(
        -- 出席問題
        'late',              -- 遲到            -1
        'last_minute_cancel',-- 臨時取消         -1
        'ghost',             -- 爽約無通知       -1
        'no_show',           -- 無故缺席         -1
        'early_leave',       -- 提早離場         -1
        'midway_leave',      -- 中途落跑         -1
        -- 人員問題
        'proxy_register',    -- 替人報名但本人沒來 -1
        'bring_extra',       -- 臨時帶人來        -1
        -- 行為問題
        'attack',            -- 攻擊行為         -1
        'harassment',        -- 騷擾             -1
        'verbal_abuse',      -- 言語不當         -1
        'property_damage',   -- 損壞財物         -1
        'discrimination',    -- 歧視行為         -1
        'rule_violation',    -- 違反規定         -1
        -- 費用問題
        'payment_default',   -- 不付費/拖欠費用   -1
        'payment_dispute',   -- AA制臨時反悔      -1
        -- 獎勵
        'bonus'              -- 良好表現         +1
    ) NOT NULL,
    points_change INT NOT NULL,  -- negative = deduction, positive = bonus
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (uuid),
    INDEX idx_room_id (room_id),
    UNIQUE KEY uq_credit_log_room_user_reason (room_id, target_user_id, reporter_id, reason),
    FOREIGN KEY (room_id) REFERENCES rooms(uuid),
    FOREIGN KEY (target_user_id) REFERENCES users(uuid),
    FOREIGN KEY (reporter_id) REFERENCES users(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
