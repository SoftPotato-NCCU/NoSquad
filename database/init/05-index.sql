-- =========================================================
-- INDEX（效能）
-- =========================================================
CREATE INDEX idx_rooms_creator ON rooms(creator_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rm_user ON room_members(user_id);
CREATE INDEX idx_rm_room ON room_members(room_id);
CREATE INDEX idx_token_user ON user_tokens(user_id);
CREATE INDEX idx_token_value ON user_tokens(token);
