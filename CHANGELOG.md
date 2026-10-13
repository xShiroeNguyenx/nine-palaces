# Nhật ký thay đổi

Ghi lại các thay đổi người chơi thấy được. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), đánh số phiên bản theo [SemVer](https://semver.org/lang/vi/).

Workflow **Release** lấy nguyên mục `## [X.Y.Z]` tương ứng làm ghi chú của GitHub Release, nên hãy viết mục này trước khi gắn tag.

## [Unreleased]

## [0.2.0] - 2026-10-13

### Bảo Khố (gacha cho vui)

- Tab **Bảo Khố** trong Bộ sưu tập: quay ×1 (100 xu) hoặc ×10 (900 xu) để nhận đồ trang trí. Mọi món hiện có vẫn mở được bằng trận thắng như cũ.
- Xu chỉ kiếm bằng cách chơi: mỗi ván với máy (thắng nhiều hơn, cấp cao nhiều hơn), quà đăng nhập hằng ngày (ngày thứ 7 liên tiếp thưởng thêm), thành tựu (kể cả thành tựu đã đạt trước đây), quà chào mừng 300 xu. Không bán xu, không quảng cáo.
- Bảng tỉ lệ công khai: Thường 70%, Hiếm 24%, Sử thi 5%, Huyền thoại 1%. Bảo hiểm: lượt thứ 10 chắc chắn Sử thi trở lên, lượt thứ 50 chắc chắn Huyền thoại.
- Quay trùng đồ đã có thì nhận mảnh; đổi mảnh lấy món tự chọn ở Tiệm mảnh.
- Đồ mới chỉ có trong Bảo Khố: khung danh hiệu (tre, mây, đèn lồng, phượng hoàng, rồng vàng…), lời chiếu tướng thay chữ "CHIẾU!", âm thanh khi đi quân. Chọn trong tab **Phụ kiện**.
- Huy hiệu xu trên thanh trên cùng, thẻ "Quà hôm nay" ở Trang chủ, số xu nhận được hiện trong bảng kết quả ván.
- Có thể tắt hẳn Bảo Khố trong Cài đặt.
- Mã sao lưu mang theo xu, mảnh và đồ đã quay. Bản cũ hơn của Cửu Cung không đọc được mã sao lưu mới.

### Giữ tiến trình

- Hồ sơ → **Mã sao lưu**: đóng gói tiến trình, thế cờ đã gặp và cài đặt thành một đoạn mã (chép, hoặc tải file .txt). Sang máy khác dán mã để khôi phục; dữ liệu được gộp, không mất trận thắng đang có.
- Xin trình duyệt giữ dữ liệu lâu dài, để tiến trình không bị tự xoá khi máy thiếu bộ nhớ.

### Chơi trên web

- Link chơi công khai: https://xshiroenguyenx.github.io/nine-palaces/

### Bàn cờ và bộ quân

- Bàn Giấy dó, Sơn mài, Neon Cyber có tranh vẽ mới.
- Bộ quân Băng và Sơn mài đỏ đen được vẽ lại.

### Sửa lỗi

- Khôi phục mã sao lưu không còn chọn được bàn cờ, bộ quân hay hiệu ứng chưa mở khoá.

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

[Unreleased]: https://github.com/xshiroenguyenx/nine-palaces/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/xshiroenguyenx/nine-palaces/releases/tag/v0.2.0
[0.1.0]: https://github.com/xshiroenguyenx/nine-palaces/releases/tag/v0.1.0
