# Nhật ký thay đổi

Ghi lại các thay đổi người chơi thấy được. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), đánh số phiên bản theo [SemVer](https://semver.org/lang/vi/).

Workflow **Release** lấy nguyên mục `## [X.Y.Z]` tương ứng làm ghi chú của GitHub Release, nên hãy viết mục này trước khi gắn tag.

## [Unreleased]

## [0.1.0] - 2026-09-30

Bản phát hành đầu tiên. Chơi hoàn toàn trên thiết bị, không cần tài khoản; chế độ online tạm tắt.

### Chơi

- Đánh với máy 10 cấp (từ Nhập môn tới Tông sư), mở khoá dần theo số trận thắng. Máy chạy ngay trên thiết bị, không cần mạng.
- 2 người 1 máy: cờ tướng và cờ úp.
- Đi lại theo cấp máy: 20 lần ở cấp 1, giảm dần còn 2 lần ở cấp 10.
- Luật chiếu mãi: cảnh báo ở lần lặp thứ hai, xử thua ở lần thứ ba.
- Nút quay lại trên mọi màn chơi, hỏi xác nhận khi ván đang dở.

### Học và phân tích

- Luyện Trình: chạm vào quân để xem các nước đi, % lợi thế và 4–5 nước tiếp theo.
- Phân tích ván sau khi chơi: độ chính xác, biểu đồ lợi thế, tách riêng nước sai của bạn và của máy.
- Bàn xếp thế cờ tự do.
- Nhận diện 79 thế cờ (khai cuộc, thế hình quân, sát cục) và hiện tên ngay khi xuất hiện.

### Hiệu ứng và sưu tập

- Hiệu ứng chiếu tướng theo quân, 4 bậc: Cơ bản, Bạc, Vàng, Huyền thoại (hồn quân nhiều tư thế, rồng bay khi chiếu bí).
- Hiệu ứng chiến thắng trên bàn cờ.
- 12 bàn cờ (8 bàn vẽ tranh) và 13 bộ quân, mở khoá bằng trận thắng và thành tựu.
- 13 thành tựu, danh hiệu theo XP.

### Khác

- Cài như ứng dụng (PWA) và chơi offline.
- Giao diện tiếng Việt, tiếng Anh, tiếng Trung.
- Xuất ảnh thế cờ.

[Unreleased]: https://github.com/OWNER/nine-palaces/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OWNER/nine-palaces/releases/tag/v0.1.0
