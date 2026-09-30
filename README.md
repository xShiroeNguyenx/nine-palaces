# Nine Palaces — Cửu Cung

Game cờ tướng trên web (ưu tiên điện thoại):

- 2 người cùng máy, đánh với máy 10 cấp (mở khóa dần), phòng online ghép bằng mã QR, ghép trận nhanh, xem trận, xếp hạng Elo, đi trước (premove).
- **Luyện Trình**: trỏ/chạm vào quân thấy % lợi thế từng nước và chuỗi 5 nước tiếp theo; phân tích lại ván sau khi đánh.
- Hiệu ứng theo quân chiếu (Xe/Mã/Pháo/Tốt), chiếu bí, nhận diện 79 thế cờ (Pháo đầu, Bá vương xe, Xe tuần hà, Mã hậu pháo…), 4 bậc hiệu ứng.
- 8 bàn cờ, 8 bộ quân, 14 thành tựu mở khóa theo trận thắng.
- **Cờ úp** (2 người 1 máy và online), chơi offline (PWA), tiếng Việt / English / 中文, điều khiển bằng bàn phím.

Kế hoạch chi tiết: [PLAN.md](PLAN.md).

## Cấu trúc

```
apps/web        React + Vite (PWA) → Cloudflare Pages
apps/api        Cloudflare Workers + Durable Objects + D1 (Hono)
packages/rules    Luật cờ tướng + cờ úp thuần TypeScript (dùng chung client/server)
packages/ai       Engine máy (alpha-beta, 10 cấp), Luyện Trình, đánh giá sau ván — chạy trong Web Worker
packages/patterns Nhận diện thế cờ (DSL + danh mục khai cuộc, thế hình quân, sát cục)
packages/shared   Giao thức WebSocket, kiểu dữ liệu; schema zod ở @np/shared/schemas (chỉ server)
docs/           ADR, CREDITS
```

## Chạy local

Yêu cầu: Node 20+, pnpm 9.

```bash
pnpm install

# 1) API
cp apps/api/.dev.vars.example apps/api/.dev.vars   # đặt JWT_SECRET, DEV_LOGIN=1
pnpm db:migrate:local
pnpm dev:api            # http://localhost:8787

# 2) Web (terminal khác)
pnpm dev:web            # http://localhost:5173
```

Thử trên điện thoại cùng mạng Wi-Fi (chỉ trong mạng LAN, không mở ra Internet):

1. Lấy IP máy tính (PowerShell: `ipconfig`, dòng IPv4 của Wi-Fi), ví dụ `192.168.10.40`.
2. Thêm origin đó vào `WEB_ORIGIN` trong `apps/api/.dev.vars`, ví dụ `WEB_ORIGIN=http://localhost:5173,http://192.168.10.40:5173` (khởi động lại `pnpm dev:api`).
3. Trên điện thoại mở `http://192.168.10.40:5173`.

Web tự chuyển tiếp `/api` và WebSocket sang API ở `127.0.0.1:8787` (proxy trong `vite.config.ts`), nên không cần đặt `VITE_API_URL` và tường lửa không cần mở cổng 8787. Camera quét QR trong app chỉ chạy trên HTTPS hoặc localhost; dùng camera của điện thoại để quét thì vẫn được.

## Kiểm thử

```bash
pnpm test          # luật (perft, chiếu mãi, ký hiệu, PGN) + engine
pnpm typecheck
pnpm --filter @np/api smoke              # đầu cuối API, cần `pnpm dev:api` đang chạy
SMOKE_SLOW=1 pnpm --filter @np/api smoke # thêm hết giờ & bỏ cuộc (~65 giây)
```

## CI và phát hành

GitHub Actions kiểm tra mọi push và pull request (typecheck, test, build). Gắn tag `vX.Y.Z` sẽ tạo GitHub Release kèm bản web đã build. Quy trình đầy đủ, các secret cần đặt và checklist trước khi công khai repo: [docs/RELEASE.md](docs/RELEASE.md). Nhật ký thay đổi: [CHANGELOG.md](CHANGELOG.md).

Chế độ online đang tắt cho bản phát hành đầu. Bật lại bằng `VITE_ONLINE=1` khi build.

## Triển khai (toàn bộ gói miễn phí)

1. Tạo D1: `cd apps/api && npx wrangler d1 create nine-palaces`, dán `database_id` vào `wrangler.toml`.
2. `pnpm --filter @np/api db:migrate:remote`
3. Bí mật: `npx wrangler secret put JWT_SECRET` và `npx wrangler secret put GOOGLE_CLIENT_SECRET`.
4. Sửa `[vars]` trong `wrangler.toml`: `WEB_ORIGIN`, `API_ORIGIN`, `GOOGLE_CLIENT_ID`, `DEV_LOGIN = "0"`.
5. `pnpm deploy:api`
6. Web: tạo project Cloudflare Pages trỏ tới repo, build command `pnpm --filter @np/web build`, output `apps/web/dist`, biến môi trường `VITE_API_URL=<địa chỉ API>`.
7. Tên miền: xem PLAN.md mục 16.4.

### Google OAuth

Trong Google Cloud Console tạo OAuth Client ID loại Web application:

- Authorized redirect URI: `<API_ORIGIN>/api/auth/google/callback`
- Điền màn hình đồng ý OAuth với tên "Nine Palaces".
