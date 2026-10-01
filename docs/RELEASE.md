# Quy trình CI và phát hành

Tài liệu này mô tả các workflow GitHub Actions của dự án, những gì cần cài đặt trên GitHub trước lần phát hành đầu, và các bước phát hành một phiên bản.

## 1. Các workflow

| Workflow | File | Khi nào chạy | Làm gì |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | Push lên `main`, mỗi pull request, chạy tay | Cài phụ thuộc, typecheck 6 gói, chạy test, build web, lưu bản build 7 ngày |
| Release | `.github/workflows/release.yml` | Push tag `vX.Y.Z`, hoặc chạy tay với một tag có sẵn | Kiểm tra tag khớp `package.json`, chạy lại typecheck/test/build, nén bản web thành zip, tạo GitHub Release |
| Pages | `.github/workflows/pages.yml` | Push lên `main`, chạy tay | Build web và đưa lên GitHub Pages: link chơi công khai |
| Deploy | `.github/workflows/deploy.yml` | Chạy tay | Migrate D1, deploy API lên Workers, build và deploy web lên Cloudflare Pages |
| Backup D1 | `.github/workflows/backup-d1.yml` | Thứ Hai hằng tuần, hoặc chạy tay | Xuất CSDL D1 thành artifact, giữ 90 ngày |

Phiên bản Node lấy từ `.nvmrc` (20.19.0), phiên bản pnpm lấy từ trường `packageManager` trong `package.json` (9.15.4). Đổi một chỗ là mọi workflow dùng theo.

Dependabot nhắc cập nhật phiên bản các GitHub Action mỗi tháng. Thư viện npm không tự cập nhật.

## 2. Link chơi công khai (GitHub Pages)

Bản phát hành đầu không có server (chế độ online tắt), nên web là trang tĩnh và chạy miễn phí trên GitHub Pages.

**Bật một lần:** *Settings → Pages → Build and deployment → Source* chọn **GitHub Actions**.

Sau đó mỗi lần push lên `main`, workflow **Pages** build lại và cập nhật web trong khoảng 2–3 phút. Link chơi:

```
https://xshiroenguyenx.github.io/nine-palaces/
```

Chi tiết:

- Web nằm trong thư mục con `/nine-palaces/`. Workflow tự build với `VITE_BASE=/nine-palaces/`.
- Mở thẳng một link con (ví dụ `/nine-palaces/ai`) vẫn vào được nhờ file `404.html` là bản sao của `index.html`. Lần đầu trình duyệt ghi nhận mã 404 trong console nhưng game vẫn mở bình thường. Từ lần sau, bộ nhớ offline phục vụ trực tiếp.
- **Tên miền riêng (tuỳ chọn):** tạo biến repo `PAGES_DOMAIN` (ví dụ `co.example.com`), trỏ bản ghi CNAME của tên miền tới `xshiroenguyenx.github.io`, rồi nhập tên miền ở *Settings → Pages → Custom domain*. Khi có tên miền, web chạy ở gốc `/`.
- Build trên máy Windows bằng Git Bash: Git Bash tự đổi `/nine-palaces/` thành đường dẫn ổ đĩa. Dùng PowerShell (`$env:VITE_BASE='/nine-palaces/'; pnpm build`). GitHub Actions chạy Linux nên không bị.
- Repo phải công khai thì GitHub Pages mới miễn phí.

## 3. Cài đặt một lần trên GitHub

### Để CI và Release chạy được

Không cần secret nào. Release dùng token có sẵn của GitHub Actions (`contents: write` đã khai báo trong workflow).

Trong **Settings → Actions → General**, mục *Workflow permissions*, để mặc định là được.

### Bảo vệ nhánh `main` (khuyến nghị)

**Settings → Branches → Add rule** cho `main`:

- Bật *Require a pull request before merging* nếu làm việc nhóm.
- Bật *Require status checks to pass*, chọn check **Typecheck · Test · Build**.

### Để Deploy chạy được (khi sẵn sàng đưa lên Cloudflare)

**Settings → Secrets and variables → Actions**:

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Token Cloudflare có quyền Workers, Pages, D1 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | ID tài khoản Cloudflare |
| Variable | `PAGES_PROJECT` | Tên dự án Cloudflare Pages |
| Variable | `VITE_API_URL` | Địa chỉ API, ví dụ `https://api.example.com`. Để trống khi online tắt |
| Variable | `VITE_ONLINE` | Để trống ở bản phát hành đầu. Đặt `1` khi bật lại chế độ online |

Secret của Worker (`JWT_SECRET`, `GOOGLE_CLIENT_SECRET`) đặt bằng `wrangler secret put`, không để trên GitHub. Xem README.

## 4. Phát hành một phiên bản

Ví dụ phát hành `0.1.0`.

1. **Cập nhật version** trong `package.json` ở thư mục gốc. Workflow Release từ chối tag không khớp version này.
2. **Viết ghi chú** trong `CHANGELOG.md`: chuyển nội dung dưới `[Unreleased]` sang mục mới `## [0.1.0] - YYYY-MM-DD`. Nội dung mục này thành ghi chú của GitHub Release. Nếu thiếu, GitHub tự tạo ghi chú từ danh sách commit.
3. **Kiểm tra trên máy** như CI:

   ```bash
   pnpm install --frozen-lockfile
   pnpm typecheck
   pnpm test
   pnpm build
   ```

4. **Commit, gắn tag, đẩy lên GitHub:**

   ```bash
   git add -A
   git commit -m "Phát hành v0.1.0"
   git tag -a v0.1.0 -m "Cửu Cung v0.1.0"
   git push origin main
   git push origin v0.1.0
   ```

5. **Theo dõi** tab *Actions*: workflow Release chạy khoảng 3–5 phút. Xong thì tab *Releases* có bản `v0.1.0` kèm hai file:
   - `cuu-cung-web-v0.1.0.zip`: toàn bộ web đã build, chép lên bất kỳ máy chủ tĩnh nào là chạy.
   - `cuu-cung-web-v0.1.0.zip.sha256`: mã kiểm tra.

   Các bản `0.x` được đánh dấu *Pre-release*. Từ `1.0.0` trở đi là bản chính thức.

6. **Deploy (tuỳ chọn):** tab *Actions* → *Deploy* → *Run workflow* trên nhánh `main`.

### Tạo lại Release cho một tag có sẵn

Nếu workflow Release lỗi giữa chừng (ví dụ thiếu mục CHANGELOG), sửa rồi vào *Actions → Release → Run workflow*, nhập tag (ví dụ `v0.1.0`). Nếu Release đã được tạo một phần, xoá nó trong tab *Releases* trước.

## 5. Quy ước đánh số phiên bản

| Thay đổi | Tăng | Ví dụ |
|---|---|---|
| Sửa lỗi, chỉnh giao diện nhỏ | PATCH | 0.1.0 → 0.1.1 |
| Thêm tính năng, bàn cờ, bộ quân, hiệu ứng | MINOR | 0.1.1 → 0.2.0 |
| Thay đổi làm mất tương thích dữ liệu người chơi, hoặc bản chính thức đầu tiên | MAJOR | 0.9.0 → 1.0.0 |

## 6. Trước khi công khai repo

- **Giấy phép:** repo chưa có file `LICENSE`. Repo công khai mà không có giấy phép thì người khác được xem nhưng không được dùng lại code. Chọn giấy phép (ví dụ MIT) hoặc để repo riêng tư.
- **Ảnh AI:** ảnh bàn cờ, hồn quân, bộ quân tre và hiệu ứng chiến thắng do chủ dự án cung cấp. Nếu tạo bằng công cụ AI, kiểm tra điều khoản của công cụ đó trước khi phát hành. Xem `docs/CREDITS.md`.
- **Bí mật:** `apps/api/.dev.vars` và `.env.local` đã nằm trong `.gitignore`. Kiểm tra lại bằng `git status` trước commit đầu tiên.
- **Chế độ online:** đang tắt bằng công tắc `VITE_ONLINE`. Chơi online ở Việt Nam có thể cần giấy phép game G1. Xem ghi chú pháp lý trong lịch sử dự án trước khi bật.
- **Link trong CHANGELOG:** thay `OWNER` ở cuối `CHANGELOG.md` bằng tên tài khoản hoặc tổ chức GitHub.
