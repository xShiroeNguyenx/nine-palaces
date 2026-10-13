-- Ví gacha "Bảo Khố": xu, mảnh, đồ sở hữu, bảo hiểm (JSON, xem Economy trong @np/shared)
ALTER TABLE progress ADD COLUMN economy TEXT NOT NULL DEFAULT '{}';
