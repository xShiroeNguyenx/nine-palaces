# ADR-001: Engine máy cho MVP

- Trạng thái: Đã chấp nhận (tạm thời cho MVP)
- Ngày: 2026-09-29

## Bối cảnh

PLAN.md dự kiến cấp 1–3 dùng engine JS tự viết, cấp 4–10 và Luyện Trình dùng Fairy-Stockfish hoặc Pikafish bản WASM. Việc chọn giữa hai engine WASM cần benchmark trên điện thoại tầm trung thật (tốc độ, dung lượng tải, hỗ trợ MultiPV/searchmoves), điều chưa làm được trong giai đoạn code MVP.

## Quyết định

MVP dùng **engine JS tự viết (`packages/ai`) cho cả 10 cấp**:

- Alpha-beta + iterative deepening, bảng băm Zobrist, null-move, LMR, killer/history, tìm kiếm tĩnh.
- Cấp 1–6: giới hạn độ sâu và thêm nhiễu (chọn ngẫu nhiên / top-3 / softmax theo điểm).
- Cấp 7–10: tìm kiếm theo thời gian 1,0–3,2 giây mỗi nước.
- Chạy trong Web Worker, không cần mạng, không vướng giấy phép GPL.
- Lọc nước ở gốc để máy không tự thua vì chiếu mãi.

Giao diện gọi engine qua `AiClient` (worker), nên thay engine sau này không đổi UI.

## Hệ quả và việc tiếp theo

- Cấp 8–10 có thể chưa đủ mạnh với người chơi giỏi; Elo ghi trong bảng cấp chỉ là ước tính.
- Trước Giai đoạn 4 (Luyện Trình): benchmark Fairy-Stockfish WASM và Pikafish WASM trên điện thoại thật, thêm adapter UCI vào `packages/ai`, dùng cho cấp 7–10 và phân tích MultiPV, giữ engine JS làm dự phòng.
