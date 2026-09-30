-- Thành tựu người chơi (danh sách mã, JSON)
ALTER TABLE progress ADD COLUMN achievements TEXT NOT NULL DEFAULT '[]';
