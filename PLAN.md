# NINE PALACES (Cửu Cung) — Kế hoạch phát triển game Cờ Tướng

> Phiên bản: 0.3 — Cập nhật: 2026-09-29
> Trạng thái: **Đã chốt toàn bộ yêu cầu**, sẵn sàng bắt đầu Giai đoạn 0.

---

## 0. Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Tên chính thức | **Nine Palaces — Cửu Cung** |
| Loại cờ | **Cờ Tướng**. Giai đoạn sau thêm **Cờ Úp** (mục 18). Module luật thiết kế dạng "biến thể" (variant) ngay từ đầu. |
| Nền tảng ra mắt | **Web mobile (PWA) trước**, desktop dùng chung mã nhưng tối ưu sau. |
| Luật lặp nước | **Chiếu mãi = thua, có cảnh báo trước khi xử thua** (mục 12.2). Lặp nước không chiếu = hòa. |
| Tài khoản | **Guest chơi được mọi chế độ nhưng không xếp hạng. Xếp hạng bắt buộc đăng nhập.** Bản đầu **chỉ Google**; Facebook/Zalo để sau. |
| Thế cờ có hiệu ứng | **Bá vương xe** = hai Xe của cùng một bên nhìn thấy mặt nhau trong khai cuộc. Danh mục đầy đủ (khai cuộc, thế hình quân, sát cục) tổng hợp từ tài liệu cờ tướng phổ biến ở mục 9.3–9.5. |
| Tên miền | **Chủ dự án đã có tên miền**, sẽ cấp một subdomain (ví dụ `co.example.com`). Cách trỏ tên miền ở mục 16.4. |
| Ngân sách | **0 đồng cho tới khi có nhiều người chơi.** Toàn bộ hạ tầng dùng gói miễn phí, ~10 người chơi đồng thời (bạn bè). Lộ trình nâng cấp ở mục 16. |
| Âm thanh / chat | Có âm thanh (chiếu tướng, ăn quân, ...). Chat văn bản + emote. **Không** chat thoại/video. |
| Tài nguyên hình ảnh | Tìm nguồn miễn phí (CC0 / CC BY / OFL), ghi credit đầy đủ (mục 17). |
| Luyện Trình online | Dùng được trong ván giao hữu **khi cả hai đồng ý**; cấm ở ván xếp hạng. |
| Quy mô đội | 1–2 lập trình viên; không có designer riêng → skin ưu tiên làm bằng font + CSS + texture miễn phí. |

---

## 1. Tầm nhìn sản phẩm

Một game cờ tướng trên web có **đầy đủ tính năng thi đấu** (người–người, người–máy, xem trận), đồng thời **khác biệt bằng chế độ Luyện Trình**: người chơi trỏ vào quân là thấy ngay các nước đi khả dĩ, dự đoán 4–5 nước tiếp theo và phần trăm lợi thế của từng lựa chọn. Hệ thống **tiến trình mở khóa** (cấp độ máy, bàn cờ, quân cờ, hiệu ứng) giữ chân người chơi; **hiệu ứng theo ngữ cảnh** (chiếu bằng Xe khác chiếu bằng Mã, nhận diện thế cờ, sát cục) tạo cảm giác "đã tay" mà các game cờ tướng hiện có chưa làm.

- **MVP (Giai đoạn 1–3):** 2 người tại chỗ, đánh máy nhiều cấp, phòng online + QR, xem trận, đăng nhập Google + xếp hạng.
- **Bản đầy đủ (Giai đoạn 4–7):** Luyện Trình, hiệu ứng/thế cờ, mở khóa skin, offline PWA.
- **Sau ra mắt:** Cờ úp, giải đấu, puzzle.

---

## 2. Danh sách tính năng (Feature Map)

### 2.1 Tính năng nền tảng của một game cờ tướng chuẩn
- [ ] Bàn cờ 9×10, sông, cửu cung, đầy đủ 7 loại quân; Đỏ đi trước.
- [ ] Luật đi quân đầy đủ: Mã bị cản chân, Tượng bị cản mắt & không qua sông, Pháo ăn qua 1 ngòi, Tốt qua sông đi ngang, Tướng/Sĩ không ra khỏi cung, Tướng không được đối mặt.
- [ ] Phát hiện chiếu, chiếu bí, hết nước đi (thua), song chiếu.
- [ ] Luật kết thúc: chiếu mãi (cảnh báo → thua), lặp nước thường (hòa), 60 nước không ăn quân (hòa), hòa thỏa thuận, không đủ lực chiếu bí, đầu hàng, hết giờ.
- [ ] Đồng hồ: tổng giờ + gia tăng (Fischer), giờ mỗi nước, không giới hạn; preset 3+2, 5+3, 10+5, 15+10.
- [ ] Đi quân: chạm–chạm (mobile ưu tiên), kéo–thả, gợi ý ô hợp lệ, tô nước cuối, cảnh báo đang bị chiếu, premove khi online.
- [ ] Xoay bàn, đổi bên, tọa độ, ký hiệu nước đi tiếng Việt (P2-5, M8.7, X1/1) + WXF + ICCS.
- [ ] Lịch sử nước đi, xem lại, phát lại tự động, nhảy đến nước bất kỳ.
- [ ] Hoàn tác (đánh máy: có giới hạn; online: đối thủ đồng ý).
- [ ] Cầu hòa, đầu hàng, đánh lại (rematch).
- [ ] Lưu/Tải ván (PGN/FEN cờ tướng), chia sẻ link ván, xuất ảnh thế cờ.
- [ ] Bàn cờ phân tích (xếp thế cờ tùy ý).
- [ ] Gợi ý nước đi khi đánh máy; đánh giá ván sau khi kết thúc.
- [ ] Âm thanh (đi quân, ăn quân, chiếu, chiếu bí, hết giờ, cảnh báo chiếu mãi), rung nhẹ trên mobile, bật/tắt riêng từng nhóm.
- [ ] Hồ sơ, thống kê thắng/thua/hòa, ELO theo chế độ, bảng xếp hạng, lịch sử trận.
- [ ] Cài đặt: chủ đề sáng/tối, kích thước bàn, giảm chuyển động, ngôn ngữ.
- [ ] PWA cài lên màn hình chính; responsive dọc/ngang.
- [ ] Khả năng tiếp cận: bàn phím (desktop), ARIA, độ tương phản.

### 2.2 Chơi 2 người chung phòng (online)
- [ ] Tạo phòng → mã 6 ký tự + link + **mã QR**.
- [ ] Vào phòng bằng link, mã, hoặc quét QR (camera điện thoại hoặc trình quét trong app).
- [ ] Chọn bên (Đỏ/Đen/ngẫu nhiên), đồng hồ, xếp hạng hay giao hữu, phòng riêng/công khai, bật Luyện Trình (giao hữu, cả hai đồng ý).
- [ ] Server là nguồn sự thật: kiểm tra mọi nước đi, giữ đồng hồ, xử luật chiếu mãi.
- [ ] Kết nối lại khi rớt mạng (ân hạn 60s), xử lý bỏ cuộc.
- [ ] Chat văn bản, emote nhanh, chặn/báo cáo.
- [ ] Ghép trận nhanh ngẫu nhiên theo ELO (chỉ người đã đăng nhập) hoặc theo giao hữu (guest được).
- [ ] Người thứ 3 trở đi vào phòng → khán giả.

### 2.3 Đánh với máy nhiều cấp độ (mở khóa dần)
- [ ] 10 cấp từ "Nhập môn" đến "Tông sư" (mục 6).
- [ ] Thắng cấp N mở cấp N+1 (cấp 7+ cần thắng 2 lần).
- [ ] Máy chạy trong Web Worker, chơi offline được.
- [ ] Máy tuân luật chiếu mãi (không tự sát bằng chiếu mãi).

### 2.4 Chế độ Luyện Trình (điểm khác biệt)
- [ ] Trỏ / chạm giữ vào quân → mọi nước đi hợp lệ kèm **% lợi thế**.
- [ ] Nước tốt nhất hiển thị **chuỗi 4–5 nước tiếp theo** (mũi tên đánh số, quân mờ).
- [ ] Nhãn giải thích: "Ăn quân", "Chiếu", "Đổi quân", "Mất quân", "Phát triển", "Phòng thủ".
- [ ] Ba mức trợ giúp; XP giảm theo mức trợ giúp.
- [ ] Đánh giá sau ván: phân loại nước, điểm chính xác.
- [ ] Dùng được: đánh máy, hotseat, online giao hữu (cả hai đồng ý), khán giả (riêng mình).

### 2.5 Nhiều bàn cờ & bộ quân (mở khóa bằng số trận thắng)
- [x] 12 bàn cờ, 12 bộ quân (mục 8), làm từ font + SVG để không tốn tiền.
- [ ] Xem trước skin; hiển thị điều kiện còn thiếu.

### 2.6 Hiệu ứng theo ngữ cảnh
- [ ] Chiếu: khác nhau theo quân chiếu (Xe, Mã, Pháo, Tốt, Tướng lộ mặt, song chiếu).
- [ ] Chiếu bí / sát cục có tên → hiệu ứng riêng.
- [ ] Ăn quân, Tốt qua sông, hết giờ, cảnh báo chiếu mãi, thắng/thua/hòa.
- [ ] Thế cờ: khai cuộc (Pháo đầu, Mã độn, ...) và thế hình quân (Bá vương xe, Xe tuần hà, ...) → banner + hiệu ứng.
- [ ] 4 bậc hiệu ứng: Cơ bản → Bạc → Vàng → Huyền thoại.

### 2.7 Xem người khác đánh
- [ ] Danh sách trận công khai đang diễn ra.
- [ ] Vào xem bằng link/QR, đếm khán giả, chat khán giả riêng.
- [ ] Trận xếp hạng trễ 3 nước.
- [ ] Khán giả bật thanh đánh giá / Luyện Trình cho riêng mình.

### 2.8 Chơi offline
- [ ] PWA cache app + engine WASM.
- [ ] Đánh máy, hotseat, xem lại, Luyện Trình không cần mạng.
- [ ] Tiến trình lưu IndexedDB, đồng bộ khi có mạng và đã đăng nhập.

---

## 3. Kiến trúc tổng thể (toàn bộ gói miễn phí)

```
┌──────────────────────── Trình duyệt (PWA) — host trên Cloudflare Pages (free) ─────────────────────┐
│  React + TS + Vite                                                                                  │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────┐  ┌─────────────────────┐                   │
│  │ UI / Màn hình │  │ Bàn cờ (SVG)   │  │ Lớp hiệu ứng │  │ Store (Zustand)     │                   │
│  └──────┬────────┘  └──────┬─────────┘  │ (PixiJS)     │  └──────────┬──────────┘                   │
│  ┌──────▼──────────────────▼───────────────────────────────────────▼──────────┐                    │
│  │ @np/rules (luật, biến thể, FEN, ký hiệu)   @np/patterns (thế cờ, sát cục)   │                    │
│  └────────────────────────────────────────────────────────────────────────────┘                    │
│  ┌──────────────── Web Worker ────────────────┐   ┌──────────────────────┐   ┌──────────────────┐  │
│  │ @np/ai: simple-ai (JS) | Fairy-Stockfish   │   │ WebSocket client     │   │ IndexedDB (Dexie)│  │
│  │ WASM (UCI: MultiPV, searchmoves, Skill)    │   │ (native, JSON)       │   │ tiến trình local │  │
│  └────────────────────────────────────────────┘   └──────────┬───────────┘   └──────────────────┘  │
└──────────────────────────────────────────────────────────────┼─────────────────────────────────────┘
                                                               │ WSS / HTTPS
┌──────────────────────── Cloudflare Workers (free) ───────────▼─────────────────────────────────────┐
│  Hono router (REST: auth Google, hồ sơ, lịch sử, xếp hạng, mở khóa, tạo phòng)                       │
│  ├─ RoomDO      (Durable Object, 1 phòng = 1 object): trạng thái ván, WebSocket hibernation,        │
│  │                đồng hồ bằng alarm, validate bằng @np/rules, luật chiếu mãi, khán giả, chat        │
│  ├─ LobbyDO     (1 object): danh sách phòng công khai, hàng đợi ghép trận, presence                  │
│  └─ D1 (SQLite, free) qua Drizzle ORM: users, sessions, matches, ratings, progress, unlocks          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Vì sao chọn Cloudflare thay vì Node + Socket.IO trên máy chủ**
- Gói free của Workers + Durable Objects + D1 + Pages **không cần thẻ tín dụng, không "ngủ đông"** như Render/Railway free (cold start 30–60s rất khó chịu với game).
- Durable Object khớp tự nhiên với mô hình "1 phòng = 1 tiến trình": trạng thái trong bộ nhớ, WebSocket, alarm cho đồng hồ.
- Khi đông người chỉ cần bật gói Workers Paid (~5 USD/tháng), **không phải viết lại** (mục 16).
- Đánh đổi: không chạy được engine native trên server (không cần, AI chạy hoàn toàn ở client); dùng WebSocket thuần thay Socket.IO (giao thức tự định nghĩa, mục 10.4).

**Phương án dự phòng (nếu muốn Node truyền thống):** Fastify + Socket.IO trên Render free + Neon Postgres free + Upstash Redis free. Chấp nhận cold start; dùng cron-job.org ping giữ ấm. Kiến trúc `@np/rules`, giao thức, dữ liệu giữ nguyên.

**Nguyên tắc thiết kế**
1. **Một bộ luật duy nhất** (`@np/rules`) dùng chung client & server, thuần TypeScript, có khái niệm *variant* (xiangqi, jieqi sau này).
2. **Server authoritative** cho ván online.
3. **Sự kiện luật → hiệu ứng**: luật phát `GameEvent[]`, lớp hiệu ứng đăng ký theo bậc; không trộn.
4. **Engine AI trong Worker**, giao tiếp UCI; thay engine không đổi UI.
5. **Offline-first**.
6. **Không tốn tiền**: mọi dịch vụ phải có gói free không cần thẻ; theo dõi hạn mức (mục 16).

---

## 4. Công nghệ đề xuất

| Lớp | Lựa chọn | Chi phí | Ghi chú |
|---|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | 0 | |
| Frontend | React 19, TypeScript, Vite, TailwindCSS, Zustand, React Router | 0 | |
| Bàn cờ | SVG/DOM, quân = vòng tròn + chữ (font) | 0 | Skin chủ yếu bằng CSS/font/texture → không cần vẽ. |
| Hiệu ứng | PixiJS v8 (particle thủ tục, không cần sprite), Howler.js | 0 | |
| Chuyển động UI | Framer Motion | 0 | |
| AI cấp thấp | Engine JS tự viết (alpha-beta depth 1–3 + nhiễu) | 0 | |
| AI cấp cao & Luyện Trình | Fairy-Stockfish WASM (variant xiangqi), bản classical eval; NNUE tùy chọn | 0 | GPL-3: tải như worker riêng, không sửa, ghi credit (mục 17.4). Benchmark thêm Pikafish WASM. |
| QR | `qrcode` (tạo), `html5-qrcode` (quét) | 0 | |
| Backend | Cloudflare Workers + Hono + Durable Objects | 0 (free plan) | WebSocket Hibernation API, alarms. |
| CSDL | Cloudflare D1 (SQLite) + Drizzle ORM + drizzle-kit migrations | 0 | |
| Trạng thái phòng | Trong RoomDO (memory + DO storage) | 0 | Không cần Redis. |
| Auth | Google OAuth 2.0 (thư viện `arctic`); phiên = JWT gửi qua header `Authorization: Bearer` (lưu localStorage), WebSocket gửi token ở message đầu; guest = deviceId | 0 | Chỉ Google ở bản đầu. Dùng Bearer thay cookie để không phụ thuộc việc web và API có cùng site hay không (mục 16.4). |
| PWA | vite-plugin-pwa (Workbox), Dexie (IndexedDB) | 0 | |
| Hosting web | Cloudflare Pages (file `_headers` để bật COOP/COEP cho WASM đa luồng) | 0 | Subdomain riêng của chủ dự án trỏ CNAME về Pages; API ở subdomain kế bên hoặc `*.workers.dev` (mục 16.4). |
| Giám sát | Sentry free (5k lỗi/tháng), Cloudflare Workers Logs free | 0 | |
| CI/CD | GitHub Actions (free cho repo public; private có 2000 phút/tháng) + `wrangler deploy` | 0 | |
| Kiểm thử | Vitest, Playwright, `wrangler dev` (Miniflare) | 0 | |

---

## 5. Cấu trúc thư mục

```
nine-palaces/
├─ apps/
│  ├─ web/                    # React PWA → Cloudflare Pages
│  │  ├─ public/
│  │  │  ├─ _headers          # COOP/COEP
│  │  │  └─ engines/          # fairy-stockfish *.wasm/*.js (tải lười)
│  │  └─ src/
│  │     ├─ app/              # router, layout, providers
│  │     ├─ features/
│  │     │  ├─ board/         # Bàn cờ, quân, chạm/kéo, tọa độ
│  │     │  ├─ game/          # Vòng đời ván, đồng hồ, lịch sử, cảnh báo chiếu mãi
│  │     │  ├─ ai/            # Đánh máy, chọn cấp
│  │     │  ├─ online/        # Phòng, QR, ghép trận, khán giả, chat
│  │     │  ├─ training/      # Luyện Trình
│  │     │  ├─ effects/       # Cầu nối GameEvent → @np/effects
│  │     │  ├─ progression/   # XP, mở khóa, thành tựu, bộ sưu tập
│  │     │  ├─ review/        # Xem lại, đánh giá
│  │     │  ├─ auth/          # Google login, guest
│  │     │  └─ settings/
│  │     ├─ workers/          # ai.worker.ts, analysis.worker.ts
│  │     ├─ store/  ├─ i18n/  └─ assets/   # skin, âm thanh, CREDITS
│  └─ api/                    # Cloudflare Workers
│     ├─ src/
│     │  ├─ index.ts          # Hono app, routes REST
│     │  ├─ do/RoomDO.ts      # Phòng + ván cờ
│     │  ├─ do/LobbyDO.ts     # Danh sách phòng, ghép trận
│     │  ├─ auth/             # Google OAuth, session, guest
│     │  ├─ db/schema.ts      # Drizzle schema (D1)
│     │  ├─ rating/           # Elo/Glicko
│     │  └─ protocol/         # dùng @np/shared
│     ├─ migrations/          # drizzle-kit → wrangler d1 migrations
│     └─ wrangler.toml
├─ packages/
│  ├─ rules/                  # @np/rules — luật cờ tướng (+ variant), thuần TS
│  ├─ ai/                     # @np/ai — simple-ai, wasm-engine adapter, UCI parser
│  ├─ patterns/               # @np/patterns — thế cờ, sát cục (DSL + JSON)
│  ├─ effects/                # @np/effects — registry, PixiJS scenes
│  ├─ shared/                 # @np/shared — types, zod schemas, giao thức WS
│  └─ config/                 # eslint, tsconfig, tailwind preset
├─ docs/                      # ADR, giao thức, CREDITS.md (giấy phép tài nguyên)
└─ PLAN.md
```

---

## 6. Đánh với máy — thiết kế cấp độ

| Cấp | Tên | Engine | Giới hạn | Skill / Nhiễu | ELO ước tính | Điều kiện mở |
|---|---|---|---|---|---|---|
| 1 | Nhập môn | JS | depth 1 | 30% ngẫu nhiên trong nước hợp lệ | ~600 | Mặc định |
| 2 | Tập sự | JS | depth 2 | 20% chọn trong top-3 | ~800 | Thắng cấp 1 |
| 3 | Sơ cấp | JS | depth 3 + quiescence | 10% | ~1000 | Thắng cấp 2 |
| 4 | Trung cấp | WASM | 0.3s/nước | Skill 3 | ~1200 | Thắng cấp 3 |
| 5 | Khá | WASM | 0.5s | Skill 6 | ~1400 | Thắng cấp 4 |
| 6 | Giỏi | WASM | 0.8s | Skill 9 | ~1600 | Thắng cấp 5 |
| 7 | Cao thủ | WASM | 1.0s | Skill 12 | ~1800 | Thắng cấp 6 ×2 |
| 8 | Kỳ thủ | WASM | 1.5s | Skill 15 | ~2000 | Thắng cấp 7 ×2 |
| 9 | Đại sư | WASM | 2.0s | Skill 18 | ~2200 | Thắng cấp 8 ×2 |
| 10 | Tông sư | WASM (+NNUE nếu đã tải) | 3.0s | Skill 20 | 2400+ | Thắng cấp 9 ×2 |

- Engine JS: giá trị quân (Xe 9, Pháo 4.5, Mã 4, Sĩ/Tượng 2, Tốt 1 / 2 khi qua sông), bảng vị trí, alpha-beta, MVV-LVA, Zobrist; ưu tiên "sai lầm giống người".
- Engine WASM: `setoption Skill Level`, `go movetime`; cấp 4–6 chọn nước từ MultiPV theo xác suất để bớt "máy móc". Fairy-Stockfish xiangqi đã có luật chiếu mãi; engine JS thêm bộ lọc: bỏ nước dẫn tới bị xử thua vì chiếu mãi.
- Thời gian nghĩ tối thiểu 0.6s, hoạt ảnh "đang nghĩ". Máy cầm Đỏ hoặc Đen; chấp quân là tùy chọn nâng cao.
- Mở khóa lưu `progress.aiLevelUnlocked`; guest lưu local, đăng nhập thì đồng bộ (lấy max).

---

## 7. Chế độ Luyện Trình — thiết kế chi tiết

### 7.1 Trải nghiệm (mobile-first)
1. Chạm giữ 250ms vào quân của mình (desktop: hover).
2. Trong ≤150ms hiện các ô đích hợp lệ với vòng màu nhiệt (xanh = lợi, xám = cân bằng, đỏ = bất lợi) và số **%** (xác suất thắng của mình sau nước đó).
3. Nước tốt nhất: **mũi tên đậm** + chuỗi 4–5 nửa nước tiếp theo đánh số 1→5, nước đối thủ màu khác, quân mờ ở đích cuối.
4. Kéo ngón tay sang ô đích khác → chuỗi đổi theo; nút "Xem diễn biến" phát hoạt ảnh trên bàn phụ.
5. Nhãn ngắn dưới %: "Ăn Mã", "Chiếu", "Đổi Pháo", "Mất Xe!", "Phát triển", "Giữ cung".
6. Thanh đánh giá dọc cạnh bàn.

### 7.2 Thuật toán
```
onHoldPiece(square):
  moves = rules.legalMovesFrom(fen, square)          // ≤ 17 nước
  key   = zobrist(fen)
  if cache[key][square] còn hạn → render ngay, rồi tinh chỉnh
  worker.send({ cmd:'analyze', fen, searchmoves: moves, multipv: moves.length,
                depthSteps:[6,10,14], timeBudgetMs: 800 })   // streaming từng bước
onResult({ pvs }):
  for pv in pvs:
    cp   = pv.scoreCp ; mate → ±10000
    winP = 50 + 50 * (2 / (1 + exp(-k * cp)) - 1)     // k ≈ 0.004, hiệu chỉnh cho cờ tướng
    tag  = classify(pv.moves[0], fen)
  render(pvs)
```
- **Cache** theo Zobrist + độ sâu; khi rảnh, worker tính trước (depth thấp) cho mọi quân bên sắp đi.
- **Hủy** phân tích cũ khi đổi quân (`stop`).
- **Tag** dựa trên `rules` (ăn gì, có chiếu, quân đang bị đe dọa, SEE đơn giản).
- **Đánh giá sau ván**: chạy lại từng nước ở depth cố định; Δ ≤30cp Tốt, 30–90 Không chính xác, 90–200 Sai lầm, >200 Sai lầm nghiêm trọng; điểm chính xác kiểu Lichess.
- Trên điện thoại yếu: tự giảm depth (đo nodes/giây lúc khởi động).

### 7.3 Quy tắc
- Không tính xếp hạng. Online giao hữu: cả hai bật cờ `training: true` khi tạo/vào phòng; hiển thị biểu tượng "Luyện Trình" cho khán giả biết.
- Mức trợ giúp ảnh hưởng XP; khán giả bật riêng.

### 7.4 Mở rộng sau
- Thư viện khai cuộc có chú giải, bài tập sát cục sinh từ ván của mình, bình luận bằng câu văn từ tag.

---

## 8. Tiến trình & mở khóa

### 8.1 Thước đo
- **Thắng tính mở khóa**: thắng máy cấp ≥3, hoặc thắng online (giao hữu/xếp hạng). Hotseat không tính.
- **XP**: thắng 100, hòa 40, thua 15; nhân hệ số theo cấp máy/ELO đối thủ; trừ theo mức trợ giúp Luyện Trình.
- **Danh hiệu XP**: Tân binh → Tốt qua sông → Mã nhập cung → Pháo đầu → Song Xe → Kỳ vương.
- Guest vẫn tích lũy (local); đăng nhập sẽ hợp nhất.

### 8.2 Bàn cờ (làm từ texture CC0 + CSS)
| # | Tên | Mô tả | Mở khóa |
|---|---|---|---|
| 1 | Gỗ mộc | Gỗ sáng, kẻ mực đen | Mặc định |
| 2 | Tre xanh | Texture tre, viền lạt | 5 thắng |
| 3 | Giấy dó | Giấy cổ, chữ thư pháp mờ | 15 thắng |
| 4 | Đá cẩm thạch | Vân đá, kẻ vàng | 30 thắng |
| 5 | Sơn mài | Đen bóng, hoa văn vàng (SVG pattern) | 50 thắng |
| 6 | Ngọc bích | Xanh ngọc, ánh sáng gradient | 80 thắng |
| 7 | Neon Cyber | Nền tối, kẻ neon glow (CSS) | 120 thắng |
| 8 | Hoàng cung | Rồng phượng (SVG CC0), viền ngũ sắc | 200 thắng |
| 9 | Băng tuyết | Băng trong, nhũ băng, tinh thể băng hai lề, tuyết phủ | 260 thắng |
| 10 | Dung nham | Đá đen nứt lửa, cột đá dung nham, ngọn lửa liếm mép (animation) | 330 thắng |
| 11 | Ngân hà | Tinh vân, sao nhấp nháy, hành tinh có vành, mặt trăng, sao băng | 420 thắng |
| 12 | Hoa anh đào | Cành hoa hai góc, hoa 5 cánh, cánh hoa rơi | 520 thắng |

Mọi bàn đều dùng chung lớp 3D: cạnh trước có bề dày, bóng đổ xuống nền, ánh sáng chiếu từ góc trên trái, mặt chơi lõm (bóng trong), viền khung vát; mỗi bàn có vật thể 3D riêng ở hai lề (thân tre, cột đá/cột son, chuỗi hạt ngọc, ống đèn neon, bút lông + nghiên mực, nẹp vàng, móc khắc gỗ…).

### 8.3 Bộ quân (chủ yếu font + CSS)
| # | Tên | Cách làm | Mở khóa |
|---|---|---|---|
| 1 | Chữ Hán truyền thống | Font Noto Serif SC/TC, vòng gỗ | Mặc định |
| 2 | Chữ Việt | Font Be Vietnam Pro / Playfair | 3 thắng |
| 3 | Biểu tượng | Icon game-icons.net (CC BY 3.0) | 10 thắng |
| 4 | Gỗ khắc 3D | Chữ Hán + CSS emboss, bóng đổ | 25 thắng |
| 5 | Sơn mài đỏ đen | Nền sơn mài, chữ vàng | 40 thắng |
| 6 | Ngọc | Gradient ngọc + highlight | 70 thắng |
| 7 | Cyber | Hologram, viền neon, font Orbitron | 100 thắng |
| 8 | Thư pháp vàng | Font Ma Shan Zheng / Long Cang, mạ vàng lấp lánh | 150 thắng |
| 9 | Đồng cổ | Đồng xanh rêu, chữ đúc nổi, gỉ đồng | 200 thắng |
| 10 | Băng | Quân băng trong, hoa tuyết khắc, chữ khắc chìm | 260 thắng |
| 11 | Dung nham | Đá đen nứt lửa phát sáng, chữ rực neon | 330 thắng |
| 12 | Tinh vân | Quân tinh vân tím hồng/xanh, sao lấp lánh | 420 thắng |

### 8.4 Bậc hiệu ứng
| Bậc | Mở khóa | Khác biệt |
|---|---|---|
| Cơ bản | Mặc định | Quân khối 3D lao vào Tướng, thư pháp vàng, Tướng vỡ đôi |
| Bạc | 20 thắng | Hồn quân **ánh bạc** (ngựa, chiến xa, pháo, lính giáo) |
| Vàng | 60 thắng | Hồn quân **ánh vàng** + bóng mờ chuyển động, mực loang, phóng chậm, pháo hoa |
| Huyền thoại | 150 thắng hoặc thành tựu | **Hồn ma xanh tím ma mị**: nhấp nháy, mắt đỏ, lửa ma, sương mù, sét xanh, tiếng ma; tướng cưỡi ngựa, pháo đầu rồng; rồng vàng (mập) bay khi chiếu bí |

**Thành tựu mở hiệu ứng đặc biệt**: "Mã hậu pháo" lần đầu; thắng bằng Tốt chiếu bí ("Tốt đầu binh"); 10 thắng liên tiếp ("Bất bại"); thắng nhờ đối thủ chiếu mãi ("Bình tĩnh").

### 8.5 Đồng bộ
- Đăng nhập: server là nguồn sự thật. Guest: IndexedDB.
- Hợp nhất khi đăng nhập lần đầu: mở khóa = hợp, số thắng = max, XP = max. Không thu hồi.

---

## 9. Hệ thống hiệu ứng & nhận diện thế cờ

### 9.1 Kiến trúc
```
@np/rules  ──emit──▶ GameEvent[] sau mỗi nước
   { type:'check', by:'chariot'|'horse'|'cannon'|'soldier'|'king', double:boolean, ... }
   { type:'capture', piece, at } | { type:'checkmate', pattern? } | { type:'soldierCrossed', at }
   { type:'perpetualCheckWarning', side, count } | { type:'gameEnd', result, reason }
@np/patterns ──emit──▶ { type:'formation', id, side }   (khai cuộc & thế hình quân)
@np/effects ──registry──▶ EffectSpec = f(event, tier, skin, settings) → PixiJS + Howler + banner
```
- Registry là dữ liệu để chỉnh mà không sửa logic; tôn trọng `prefers-reduced-motion`.
- Ngân sách: ≤4ms/frame cho lớp hiệu ứng trên điện thoại tầm trung; ≤300 particle.

### 9.2 Hiệu ứng theo sự kiện (bậc Bạc; Cơ bản là bản rút gọn)
| Sự kiện | Hiệu ứng | Âm thanh |
|---|---|---|
| Chiếu bằng **Xe** | Vệt sáng thẳng Xe → Tướng, rung ngắn, chữ "CHIẾU" | Gươm rút |
| Chiếu bằng **Mã** | Đường chữ "nhật" phát sáng, dấu móng ngựa | Vó ngựa + hí |
| Chiếu bằng **Pháo** | Ngòi lửa cháy qua quân ngòi, nổ tại Tướng | Pháo nổ |
| Chiếu bằng **Tốt** | Nhấp nháy nhỏ, mũi tên ngắn | Kèn lệnh |
| Tướng lộ mặt | Hai Tướng lóe mắt, tia nối | Chiêng |
| Song chiếu | Kết hợp 2 hiệu ứng + "SONG CHIẾU" | Chồng âm |
| **Cảnh báo chiếu mãi** | Viền bàn nhấp nháy vàng, banner "Chiếu mãi 2/3 — lặp lại sẽ thua", đếm ngược | Trống cảnh báo |
| Chiếu bí | Slow-motion 0.5s, zoom Tướng, "TƯỚNG!" lớn, tên sát cục, pháo hoa | Nhạc thắng |
| Ăn quân | Quân vỡ mảnh theo skin, độ lớn theo giá trị | Theo quân |
| Tốt qua sông | Gợn sóng | Nước |
| Thế cờ | Banner tên thế, hoa văn cuộn, quân liên quan sáng 1s | Trống |
| Hết giờ | Đồng hồ vỡ | Chuông |
| Thắng/Thua/Hòa | Màn kết theo skin | |

### 9.3 Thế cờ được nhận diện — `@np/patterns`

**Quy tắc chung**
- Mỗi thế báo tối đa **1 lần/ván/bên**; người chơi tắt được banner thế cờ trong Cài đặt (hiệu ứng chiếu/ăn quân vẫn giữ).
- **Khai cuộc**: kiểm tra trong 12 nước đầu mỗi bên. **Thế hình quân**: kiểm tra trong 20 nước đầu mỗi bên (tránh spam giữa ván). **Sát cục**: kiểm tra khi chiếu bí, và khi Luyện Trình thấy chuỗi nước dẫn tới bí (hiện tên sát cục ngay trên mũi tên).
- Mẫu viết bằng **DSL JSON**, chỉnh không cần sửa code. Mỗi mẫu có cờ `enabled`.
- Cột **Trạng thái**: ✅ định nghĩa rõ, mã hóa ngay ở bản 1; ⚠️ định nghĩa còn mơ hồ trong tài liệu, đưa vào DSL với `enabled: false`, bật sau khi có ván mẫu kiểm chứng.
- Danh mục tổng hợp từ tài liệu phổ biến (mục 9.5). Tọa độ theo bên Đỏ (cột a–i từ trái, hàng 1–10 từ dưới); bên Đen đối xứng.

**A. Khai cuộc**
| ID | Tên | Nhận diện | Trạng thái |
|---|---|---|---|
| `phao_dau` | Pháo đầu (Trung pháo) | Một Pháo bình về cột 5 (P2-5 hoặc P8-5) | ✅ |
| `binh_phong_ma` | Bình phong mã (Mã độn) | Hai Mã lên c3 và g3 (M2.3 + M8.7) | ✅ |
| `phao_dau_ma_don` | Pháo đầu Mã độn | `phao_dau` + `binh_phong_ma` cùng bên | ✅ |
| `phao_dau_ma_doi` | Pháo đầu Mã đội (Giáp mã pháo) | Pháo đầu + hai Mã lên 3/7, rồi một Mã nhảy vào lộ 5 đội Tốt đầu (M3.5 hoặc M7.5) | ⚠️ |
| `phan_cung_ma` | Phản cung mã (Giáp pháo bình phong) | Bình phong mã + một Pháo về góc Sĩ (P8-6 hoặc P2-4) | ✅ |
| `thuan_phao` | Thuận pháo | Cả hai bên Pháo đầu, cùng cánh | ✅ |
| `nghich_phao` | Nghịch pháo (Liệt pháo) | Cả hai bên Pháo đầu, khác cánh | ✅ |
| `ban_do_nghich_phao` | Bán đồ nghịch pháo | Bên đi sau lên Mã trước, sau đó mới vào Pháo đầu khác cánh | ✅ |
| `si_giac_phao` | Sĩ giác pháo | Pháo về góc Sĩ cùng cánh (P2-4 hoặc P8-6) | ✅ |
| `qua_cung_phao` | Quá cung pháo | Pháo bình qua cung sang cánh kia (P2-6 hoặc P8-4) → hai Pháo cùng cánh | ✅ |
| `phi_tuong` | Phi tượng cục | Nước đầu Tượng 3/7 tấn 5 | ✅ |
| `khoi_ma` | Khởi mã cục | Nước đầu Mã 2 tấn 3 hoặc Mã 8 tấn 7 | ✅ |
| `tien_nhan_chi_lo` | Tiên nhân chỉ lộ | Nước đầu Tốt 3 hoặc 7 tấn 1 | ✅ |
| `don_de_ma` | Đơn đề mã | Một Mã lên 3/7, Mã kia nhảy biên (M2.1 hoặc M8.9) | ✅ |
| `xuyen_cung_ma` | Xuyên cung mã | Tượng lên trung (T3.5/T7.5) rồi Mã cùng cánh nhảy vào góc Sĩ (M2.4/M8.6) | ⚠️ |
| `quy_boi_phao` | Quy bối pháo | Pháo lùi về hàng 1 (P2/1 hoặc P8/1) trong 6 nước đầu, Xe giữ | ✅ |
| `thien_phong_phao` | Thiên phong pháo | Như Quy bối pháo nhưng Xe ra trước, Pháo lùi sau | ⚠️ |
| `ngoa_tam_phao` | Ngọa tâm pháo | Pháo đầu, Pháo thoái 1 về giữa cung (e2), Pháo kia cũng bình 5 → hai Pháo cùng cột 5 | ✅ |
| `uyen_uong_phao` | Uyên ương pháo | Xe tấn 1 (X1.1/X9.1) rồi Pháo bình sang cùng cánh, hai Pháo kề nhau có Xe giữ | ⚠️ |
| `thiet_hoat_xa` | Thiết hoạt xa | Bên tiên bỏ Mã sớm (mất Mã trước nước 5) để Xe ra nhanh giành tiên | ⚠️ |
| `song_phao_qua_ha` | Song pháo quá hà | Hai Pháo cùng qua sông | ✅ |
| `ngu_that_phao` | Ngũ thất pháo | Pháo đầu + Pháo còn lại bình 7 (hoặc 3) | ✅ |
| `ngu_luc_phao` | Ngũ lục pháo | Pháo đầu + Pháo còn lại bình 6 (hoặc 4) | ✅ |
| `ngu_cuu_phao` | Ngũ cửu pháo | Pháo đầu + Pháo còn lại bình 9 (hoặc 1) | ✅ |
| `ngu_bat_phao` | Ngũ bát pháo | Pháo đầu + Pháo còn lại ở cột 8 (hoặc 2) tấn lên qua sông | ⚠️ |
| `tam_bo_ho` | Tam bộ hổ | Trong 3 nước: Pháo bình 7/3, Xe biên bình vào cột Pháo vừa rời, Xe tấn lên | ⚠️ |

**B. Thế hình quân**
| ID | Tên | Nhận diện | Trạng thái |
|---|---|---|---|
| `ba_vuong_xe` | **Bá vương xe** (yêu cầu chủ dự án) | Hai Xe **cùng bên** trên cùng hàng hoặc cùng cột, không có quân nào chắn giữa (nhìn thấy mặt nhau), trong khai cuộc | ✅ |
| `xe_tuan_ha` | **Xe tuần hà** | Xe ở hàng sát sông phía mình (Đỏ: hàng 5; Đen: hàng 6) | ✅ |
| `xe_ky_ha` | Xe kỵ hà | Xe ở hàng sát sông phía đối phương (Đỏ: hàng 6) | ✅ |
| `qua_ha_xa` | Quá hà xa (Xe qua sông) | Xe vượt sông ở hàng bất kỳ; không báo nếu đã báo Xe kỵ hà | ✅ |
| `xe_tram_day` | Xe trầm đáy | Xe xuống hàng đáy đối phương (hàng 10) | ✅ |
| `song_xe_qua_ha` | Song xe quá hà | Hai Xe cùng qua sông | ✅ |
| `phao_tuan_ha` | Pháo tuần hà | Pháo ở hàng sát sông phía mình | ✅ |
| `phao_ky_ha` | Pháo kỵ hà | Pháo ở hàng sát sông phía đối phương | ✅ |
| `phao_tram_day` | Pháo trầm đáy | Pháo ở hàng đáy đối phương | ✅ |
| `phao_trung` | Pháo trùng | Hai Pháo cùng cột, không có quân giữa | ✅ |
| `phao_ngoa_tam` | Pháo ngọa tâm | Pháo ở ô giữa cung mình (e2) | ✅ |
| `khong_dau_phao` | Không đầu pháo | Pháo ở cột 5 đối diện Tướng địch, giữa không có quân | ✅ |
| `giac_phao` | Giác pháo | Pháo ở góc bàn cờ phía đối phương (a10/i10) | ⚠️ |
| `ma_ban_ha` | Mã bàn hà | Mã ở hàng sát sông phía mình, lộ 4 hoặc 6 (d5/f5) | ✅ |
| `ma_ky_ha` | Mã kỵ hà | Mã ở hàng sát sông phía đối phương | ✅ |
| `ma_ngoa_tao` | Mã ngọa tào | Mã đứng ô "ngọa tào" cạnh cung địch (c8 hoặc g8) | ✅ |
| `quai_giac_ma` | Quải giác mã | Mã ở góc trước cung địch (d8 hoặc f8) | ✅ |
| `dieu_ngu_ma` | Điếu ngư mã | Mã ở ô "câu cá" (c7 hoặc g7), cách cung địch một hàng | ✅ |
| `ma_tuong_ngu` | Mã tượng ngũ | Mã đứng ở ô Tượng giữa của mình (e3) | ✅ |
| `ma_quy` | Mã quỳ (Triển giác mã) | Mã đứng ở góc Sĩ của mình (d3/f3) | ⚠️ |
| `lien_hoan_ma` | Liên hoàn mã | Hai Mã bảo vệ lẫn nhau | ✅ |
| `hai_si_khuyet_tuong` | Hai Sĩ khuyết Tượng (cảnh báo "ngại Pháo công") | Mất cả hai Tượng, còn đủ hai Sĩ | ✅ |
| `hai_tuong_khuyet_si` | Hai Tượng khuyết Sĩ (cảnh báo "sợ Tốt đâm") | Mất cả hai Sĩ, còn đủ hai Tượng | ✅ |

**C. Sát cục (khi chiếu bí)** — theo bộ "33 sát pháp cơ bản" và tài liệu tiếng Việt; kiểm tra theo thứ tự cụ thể → chung, lấy mẫu khớp đầu tiên.
| ID | Tên (chữ Hán) | Cấu trúc quân | Trạng thái |
|---|---|---|---|
| `doi_dien_tieu` | Đối diện tiếu / Thiên lý chiếu diện / Bạch kiểm tướng (对面笑) | Tướng mình đứng cột trống đối diện Tướng địch (lộ mặt) khiến Tướng địch hết đường, quân khác chiếu bí | ✅ |
| `song_xe_thac` | Song xe thác (双车错) | Hai Xe thay nhau chiếu trên hai đường kề nhau | ✅ |
| `nhi_quy_phach_mon` | Nhị quỷ phách môn (二鬼拍门) | Hai Tốt đứng hai ô trước cung/góc cung địch (d8, f8 hoặc d9, f9) | ✅ |
| `thiet_mon_thuyen` | Thiết môn thuyên (铁门栓) | Pháo cột 5 khống chế qua Sĩ, Tướng bị khóa ở đáy, Xe/Mã/Tốt chiếu bên cạnh | ✅ |
| `dai_dam_xuyen_tam` | Đại đảm xuyên tâm (大胆穿心) | Xe thí ăn Sĩ giữa cung (e9) ≤ 3 nước trước khi bí | ⚠️ |
| `dai_dao_oan_tam` | Đại đao oan tâm (大刀剜心) | Xe ăn Sĩ giữa cung có Pháo cột 5 yểm trợ | ✅ |
| `tieu_dao_oan_tam` | Tiểu đao oan tâm (小刀剜心) | Tốt ăn Sĩ giữa cung có Pháo cột 5 yểm trợ | ✅ |
| `giap_xe_phao` | Giáp xe pháo (夹车炮) | Xe và Pháo kẹp Tướng từ hai phía cùng hàng/cột | ✅ |
| `hai_de_lao_nguyet` | Hải để lao nguyệt (海底捞月) | Xe + Pháo ở hàng đáy địch, Pháo lùi làm ngòi đẩy Xe địch, Xe chiếu bí (tàn cuộc) | ✅ |
| `phao_trien_dan_sa` | Pháo triển đan sa (炮辗丹沙) | Pháo phối hợp Xe càn quét Sĩ Tượng ở hàng đáy rồi bí | ⚠️ |
| `thien_dia_phao` | Thiên địa pháo (天地炮) | Một Pháo cột 5 (thiên) + một Pháo hàng đáy địch (địa) | ✅ |
| `trung_phao` | Trùng pháo (重炮) | Hai Pháo cùng cột, Pháo sau chiếu qua Pháo trước | ✅ |
| `muon_cung` | Muộn cung (闷宫) | Pháo chiếu bí dùng Sĩ địch làm ngòi, Tướng bị chính Sĩ/Tượng mình bịt lối | ✅ |
| `ma_ngoa_tao_sat` | Mã ngọa tào (卧槽马) | Mã chiếu từ c8/g8, Xe/Pháo khống chế lối thoát | ✅ |
| `ma_hau_phao` | Mã hậu pháo (马后炮) | Mã đứng cách Tướng địch 1 ô thẳng hàng, Pháo chiếu từ phía sau Mã | ✅ |
| `dieu_ngu_ma_sat` | Điếu ngư mã (钓鱼马) | Mã ở c7/g7 khống chế, Xe chiếu hàng đáy | ✅ |
| `quai_giac_ma_sat` | Quải giác mã (挂角马) | Mã ở d8/f8 chiếu Tướng đứng ở đáy | ✅ |
| `bat_giac_ma` | Bát giác mã (八角马) | Mã và Tướng địch ở hai góc đối chéo cung, Xe/Pháo chiếu | ✅ |
| `lap_ma_xa` | Lập mã xa (立马车) | Xe áp sát Tướng chiếu bí, Mã đứng cạnh bảo vệ Xe | ⚠️ |
| `bach_ma_hien_de` | Bạch mã hiện đề (白马现蹄) | Mã chiếu, Xe/Pháo phối hợp khống chế | ⚠️ |
| `song_ma_am_tuyen` | Song mã ẩm tuyền (双马饮泉) | Hai Mã thay nhau chiếu quanh cung (thường ngọa tào + quải giác) | ✅ |
| `tam_tu_quy_bien` | Tam tử quy biên (三子归边) | ≥ 3 quân tấn công dồn về hai cột biên phía Tướng địch | ⚠️ |
| `trac_dien_ho` | Trắc diện hổ (侧面虎) | Xe hàng đáy + Pháo ở tai Sĩ địch khống chế cạnh, Mã/Tốt chiếu | ⚠️ |
| `bat_hoang_ma` | Bạt hoàng mã (拔簧马) | Mã di chuyển mở đường cho Xe/Pháo chiếu (chiếu mở) | ⚠️ |
| `tong_phat_quy_dien` | Tống Phật quy điện (送佛归殿) | Tốt dồn Tướng địch về ô đáy rồi bí | ⚠️ |
| `lao_tot_suu_son` | Lão tốt sưu sơn (老卒搜山) | Tốt vào cung ăn Sĩ/Tượng phối hợp chiếu bí | ⚠️ |
| `xa_ma_lanh_chieu` | Xa mã lãnh chiêu (车马冷着) | Xe + Mã tàn cuộc | ⚠️ |
| `song_boi_hien_tuu` | Song bôi hiến tửu (双杯献酒) | Hai Pháo phối hợp ở hàng đáy | ⚠️ |
| `song_chieu_sat` | Song chiếu (双照将) | Nước cuối là song chiếu | ✅ |
| `tot_chieu_bi` | Tốt chiếu bí | Nước cuối là Tốt (thành tựu "Tốt đầu binh") | ✅ |
Không khớp → hiệu ứng chiếu bí chung theo quân chiếu.

**DSL mẫu**
```json
{ "id": "ba_vuong_xe", "name": "Bá vương xe", "kind": "shape", "scope": "opening", "maxPly": 40, "enabled": true,
  "requires": [ { "piece": "R", "side": "self", "count": 2, "relation": "same_line_clear" } ] }

{ "id": "xe_tuan_ha", "name": "Xe tuần hà", "kind": "shape", "scope": "opening", "maxPly": 40, "enabled": true,
  "requires": [ { "piece": "R", "side": "self", "rank": "own_river_bank" } ] }

{ "id": "ma_hau_phao", "name": "Mã hậu pháo", "kind": "mate", "enabled": true,
  "checker": "C",
  "requires": [ { "piece": "N", "side": "self", "relative_to": "enemy_king", "offset": "inline_1" },
                { "piece": "C", "side": "self", "relative_to": "that_knight", "behind": true } ] }
```

### 9.4 Cách xây dựng và kiểm chứng danh mục
1. Nhập toàn bộ mẫu vào `packages/patterns/data/*.json` với `enabled` theo cột Trạng thái.
2. Với mỗi mẫu ✅, viết ít nhất 2 ván mẫu (PGN) trong `packages/patterns/fixtures/`: 1 ván phải khớp, 1 ván gần giống nhưng không được khớp.
3. Với mẫu ⚠️, thu thập ván thật (từ ván người chơi hoặc sách) rồi mới chốt định nghĩa và bật.
4. Trang "Bộ sưu tập thế cờ" trong game hiển thị thế đã gặp, mô tả ngắn và hình minh họa → vừa là nội dung học, vừa là nơi người chơi báo "nhận diện sai".

### 9.5 Nguồn tham khảo danh mục thế cờ
- 15 thế khai cuộc: https://zigavn.com/cotuong/the-co-khai-cuoc-hay
- 13 cách khai cuộc: https://www.vn.xiangqi.com/articles/khai-cuoc-co-tuong
- Bình phong mã: https://vi.wikipedia.org/wiki/B%C3%ACnh_phong_m%C3%A3
- Thuật ngữ vị trí quân (tuần hà, kỵ hà, bàn hà, ngọa tào, ngọa tâm...): https://cotuongaz.blogspot.com/2015/06/thuat-ngu-chuyen-dung-trong-co-tuong.html và http://thanglongkydao.com/archive/index.php/t-7885.html
- 63 khẩu quyết (Xe tuần hà, Pháo trầm đáy, Mã bàn hà, hai Sĩ khuyết Tượng...): https://zigavn.com/cotuong/khau-quyet-co-tuong
- 33 sát pháp cơ bản: https://webcotuong.com/sat-phap-co-ban/ và https://sach.webcotuong.com/pdf-33-sat-phap-co-ban-trong-co-tuong/
- Hải để lao nguyệt: https://webcotuong.com/sat-phap-co-tuong-hai-de-lao-nguyet/
- Sát pháp sơ khởi, sát cục theo giai đoạn: https://zigavn.com/cotuong/sat-phap-so-khoi và https://kydao.net/sat-cuc
- Học khai cuộc theo hệ thống: https://kydao.net/khai-cuc

---

## 10. Online: phòng, QR, ghép trận, khán giả

### 10.1 Luồng "ghép trận nhanh bằng QR"
1. A nhấn **Tạo phòng nhanh** → Worker tạo RoomDO, mã 6 ký tự (bỏ O/0/I/1), ví dụ `K7X2PQ`, TTL chờ 10 phút.
2. Màn A: QR mã hóa `https://<domain>/j/K7X2PQ?t=<token>` + **Chia sẻ** (Web Share API) + **Sao chép link** + mã chữ.
3. B quét bằng camera điện thoại → mở PWA → tự tạo guest → vào phòng → đặt tên → **Sẵn sàng**.
4. A chọn bên/đồng hồ/Luyện Trình → cả hai sẵn sàng → bắt đầu.
5. Người thứ 3 quét → **xem**.
6. Nút **Quét QR** trong app cho người đã mở sẵn.
7. Token chống đoán mã; phòng riêng không xuất hiện ở danh sách công khai.

### 10.2 Quick match
- LobbyDO giữ hàng đợi theo (đồng hồ, xếp hạng/giao hữu, ELO); nới biên ±50 mỗi 5s (alarm), tối đa ±400.
- Xếp hạng: chỉ người đã đăng nhập. Giao hữu: guest được.

### 10.3 Vòng đời phòng
```
waiting ─(đủ 2 & ready)─▶ playing ─(mate/hết giờ/đầu hàng/hòa/chiếu mãi)─▶ ended ─(rematch)─▶ waiting
   │                          │
   └─(TTL 10 phút)─▶ closed   └─(rớt mạng > 60s & hết giờ)─▶ ended (bỏ cuộc)
```
- Mỗi nước có `seq`; server từ chối nếu lệch.
- Đồng hồ: RoomDO tính theo timestamp; `setAlarm()` tại thời điểm hết giờ của bên đang đi → xử thua kể cả khi không ai gửi gì.
- Reconnect: session token; RoomDO gửi lại `room:state` đầy đủ (FEN, lịch sử, đồng hồ, đề nghị đang mở, số lần chiếu mãi).
- RoomDO dùng WebSocket Hibernation để không tốn thời gian tính khi phòng im lặng (giữ free tier).

### 10.4 Giao thức WebSocket (JSON, `{ type, payload, seq? }`)
**Client → Server**
| `type` | Payload | Ghi chú |
|---|---|---|
| `room:create` (REST POST `/rooms`) | `{ timeControl, rated, private, side, training }` | Trả `{ code, token, joinUrl }` |
| `room:join` | `{ code, token?, as: 'player'\|'spectator' }` | Đầy → khán giả |
| `room:ready` | `{ ready }` | |
| `game:move` | `{ seq, from, to }` | Validate bằng `@np/rules` |
| `game:resign` | `{}` | |
| `game:offerDraw` / `game:respondDraw` | `{ accept }` | |
| `game:requestUndo` / `game:respondUndo` | `{ accept }` | Giao hữu |
| `game:rematch` | `{}` | |
| `chat:send` | `{ text, channel }` | Lọc từ, rate limit |
| `clock:ping` | `{ t }` | RTT |

**Server → Client**
| `type` | Payload |
|---|---|
| `room:state` | Toàn bộ trạng thái |
| `game:started` | `{ redId, blackId, timeControl, startAt, training }` |
| `game:moved` | `{ seq, move, fen, notation, clocks, events: GameEvent[] }` |
| `game:warning` | `{ kind: 'perpetualCheck', side, count, max: 3 }` |
| `game:ended` | `{ result, reason, ratingDelta? }` |
| `game:drawOffered` / `game:undoRequested` / `game:rematchOffered` | `{ by }` |
| `spectator:count` | `{ n }` |
| `chat:message` | `{ from, text, channel, at }` |
| `error` | `{ code, message }` |

### 10.5 Xem trận
- LobbyDO giữ danh sách trận công khai (RoomDO báo thay đổi qua RPC).
- Trận xếp hạng trễ 3 nước (RoomDO giữ buffer, phát nước k−3 khi có nước k, flush khi kết thúc).
- Khán giả bật thanh đánh giá/Luyện Trình trên máy mình.
- Xem lại trận đã kết thúc từ D1.

### 10.6 Chống gian lận & an toàn
- Server quyết mọi nước, đồng hồ, kết quả, luật chiếu mãi.
- Zod validate mọi message; rate limit trong DO (token bucket) + Cloudflare rate limiting rule (free).
- Luyện Trình bị khóa cứng ở ván xếp hạng (server không gửi cờ `training`).
- Phát hiện đánh giống engine: giai đoạn sau.
- Chat: lọc từ, chặn, báo cáo; khán giả không nhắn cho người chơi trong ván xếp hạng.

---

## 11. Mô hình dữ liệu (Drizzle / D1 SQLite, rút gọn)

```ts
users        (id, googleSub?, email?, displayName, avatar?, isGuest, deviceId?, createdAt, lastSeenAt)
sessions     (id, userId, expiresAt)
ratings      (userId, mode /*bullet|blitz|rapid*/, elo, games, wins, losses, draws)   PK(userId, mode)
progress     (userId PK, xp, totalWins, unlockWins, aiLevelUnlocked, streak, bestStreak)
unlocks      (userId, itemId /*board:*|pieces:*|fx:*/, unlockedAt)                     PK(userId, itemId)
achievements (userId, key, progress, achievedAt?)                                       PK(userId, key)
matches      (id, variant /*xiangqi|jieqi*/, mode /*ai|online|local*/, rated, aiLevel?, timeControl JSON,
              redId?, blackId?, result?, reason?, startFen, movesJson, startedAt, endedAt?,
              spectatorsPeak, formations JSON?, matePattern?, training)
move_evals   (matchId, ply, cp?, mateIn?, bestMove?, classification?)                  PK(matchId, ply)
```
Trạng thái phòng/ván đang chơi nằm trong RoomDO (memory + DO storage). Ghi vào D1 khi ván kết thúc.

---

## 12. Gói `@np/rules` — luật, biến thể, kiểm thử

### 12.1 Thiết kế
- Bàn: mảng 90 ô, quân 1 byte. FEN chuẩn: `rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1`.
- Giao diện `Variant` (`xiangqi` mặc định; `jieqi` sau): sinh nước, điều kiện kết thúc, thông tin ẩn (cờ úp).
- API: `initialPosition(variant)`, `parseFen/toFen`, `legalMoves`, `legalMovesFrom`, `makeMove/unmakeMove`, `isCheck/isCheckmate/isStalemate`, `gameStatus(history)`, `toNotation(move, 'vi'|'wxf'|'iccs')`, `events(before, move, after)`, `zobrist`.

### 12.2 Luật chiếu mãi (đã chốt: cảnh báo trước, lặp lại thì thua)
```
Sau mỗi nước của bên S:
  nếu nước đó là chiếu → checkStreak[S]++ ; ngược lại checkStreak[S] = 0
  posCount = số lần thế cờ hiện tại (kèm bên đi) đã xuất hiện trong chuỗi liên tục mà S chỉ toàn chiếu
  posCount == 2 → phát 'perpetualCheckWarning' { side:S, count:2, max:3 }  (banner + âm thanh cho cả hai)
  posCount == 3 → gameEnd { winner: đối thủ của S, reason:'perpetual_check' }
Lặp thế cờ 3 lần mà không phải chiếu mãi → hòa (repetition).
```
- "Chiếu mãi 1 nước" (đi đi lại lại cùng một nước chiếu) là trường hợp phổ biến nhất và rơi vào công thức trên; chuỗi chiếu dài hơn cũng bị xử.
- Bên chiếu có thể thoát bằng cách đi nước không chiếu → bộ đếm về 0.
- Luật "đuổi mãi" **không** áp dụng ở bản 1 (lặp → hòa). Ghi rõ trong màn "Luật chơi".
- Áp dụng giống nhau cho hotseat, đánh máy, online; máy phải tránh nước dẫn tới thua.

### 12.3 Kiểm thử
- Perft từ thế khởi đầu (depth 1 = 44, 2 = 1 920, 3 = 79 666, 4 = 3 290 240) và các thế đặc biệt (cản Mã, cản Tượng, lộ mặt tướng, Pháo ngòi kép).
- So khớp với `ffish.js` (Fairy-Stockfish) trên 10 000 thế cờ ngẫu nhiên.
- Bộ ván mẫu cho chiếu mãi: cảnh báo đúng lúc, xử thua đúng lúc, thoát đúng cách.
- Snapshot ký hiệu tiếng Việt (hai quân cùng cột: Xe trước/Xe sau).

---

## 13. Lộ trình triển khai

Đội 1–2 dev; mỗi giai đoạn có tiêu chí hoàn thành (DoD).

> **Tiến độ 2026-09-29:** Giai đoạn 0–6 và Cờ úp đã code xong, chạy được local. Các mục còn `[ ]`/`[~]` cần tài khoản hoặc thiết bị thật của chủ dự án (Cloudflare, Google OAuth, Sentry, điện thoại để benchmark WASM/60fps), hoặc được dời lại có ghi lý do.

### Giai đoạn 0 — Khởi tạo (Tuần 1)
- [ ] Tạo tài khoản Cloudflare (free), GitHub repo, Sentry free. *(chủ dự án làm)*
- [ ] Kiểm tra DNS tên miền của chủ dự án đang ở đâu → chọn cách trỏ theo mục 16.4; tạo Google OAuth Client ID. *(chủ dự án làm)*
- [x] Monorepo pnpm + Prettier, tsconfig, CI test (GitHub Actions). *Turborepo và ESLint chưa thêm: dùng `pnpm -r` là đủ ở quy mô hiện tại.*
- [x] `wrangler dev` chạy Worker + DO + D1 local.
- [x] Design tokens (biến CSS). *Không làm wireframe riêng, giao diện được dựng trực tiếp.*
- [~] ADR-001: MVP dùng engine JS cho cả 10 cấp; benchmark WASM trên điện thoại thật dời sang trước Giai đoạn 4 (docs/ADR-001-engine.md).
- [x] `docs/CREDITS.md`.
- **DoD**: `pnpm dev:api` + `pnpm dev:web` chạy được ✅; deploy preview chờ tài khoản Cloudflare.

### Giai đoạn 1 — Lõi luật & chơi tại chỗ (Tuần 2–4)
- [x] `@np/rules` + luật chiếu mãi có cảnh báo + perft (đúng tới độ sâu 4 = 3 290 240). *So khớp ffish.js chưa làm.*
- [x] Bàn cờ SVG mobile-first: chạm–chạm, kéo–thả, gợi ý ô, tô nước cuối, cảnh báo chiếu, xoay bàn.
- [x] Hotseat, đồng hồ, lịch sử, hoàn tác, xem lại (tua/tự phát), lưu/tải FEN/PGN.
- [x] Skin mặc định: bàn Gỗ mộc + quân Chữ Hán, Chữ Việt; âm thanh tổng hợp bằng Web Audio (khác nhau theo quân chiếu); hiệu ứng banner cơ bản.
- **DoD**: chơi trọn ván với mọi luật kết thúc ✅; test luật xanh ✅; Lighthouse chưa đo.

### Giai đoạn 2 — Đánh với máy (Tuần 5–7)
- [x] Engine JS cấp 1–10 trong Worker (có lọc chiếu mãi).
- [ ] WASM cấp 4–10 — dời theo ADR-001.
- [x] Màn chọn cấp, khóa/mở (cấp 7+ cần thắng 2 lần), lưu tiến trình local (localStorage thay Dexie) + đồng bộ server.
- [x] Gợi ý (mũi tên + chuỗi nước dự kiến), hoàn tác (tối đa 3), màn kết quả, XP.
- **DoD**: UI không đứng khi máy nghĩ ✅; độ mạnh cấp 10 cần người thử.

### Giai đoạn 3 — Online, QR, khán giả, đăng nhập (Tuần 8–11)
- [x] Worker Hono + RoomDO + LobbyDO + D1 (SQL migration thuần, không dùng Drizzle).
- [x] Guest (deviceId) + Google OAuth PKCE (Bearer JWT); xếp hạng yêu cầu đăng nhập; gộp tiến trình khách khi đăng nhập. *Google chưa thử thật vì cần Client ID.*
- [ ] Trỏ subdomain của chủ dự án về Pages/Workers (mục 16.4). *(chờ subdomain)*
- [x] Tạo/vào phòng, QR + deep link, Web Share, quét QR trong app, phòng riêng có khóa.
- [x] Ván online authoritative, đồng hồ bằng alarm, reconnect (60s ân hạn rồi xử thua), cầu hòa/đầu hàng/xin đi lại/đánh lại đổi màu, chat + emote + lọc từ.
- [x] Khán giả, danh sách trận công khai, độ trễ 3 nước ở ván xếp hạng, kênh chat khán giả.
- [x] Quick match (biên Elo nới dần) + Elo K=32, bảng xếp hạng, lịch sử & biên bản ván.
- [x] Cờ `training` cho giao hữu (tắt cứng ở ván xếp hạng).
- [x] Premove khi online (đã bổ sung ở đợt 2).
- [x] Bàn phân tích xếp thế tùy ý (/analysis), xuất ảnh thế cờ PNG (chia sẻ hoặc tải về).
- **DoD**: 2 điện thoại quét QR vào trận < 10s; rớt mạng 30s vẫn tiếp tục; 10 người bạn chơi 1 giờ ổn định; kiểm tra hạn mức Cloudflare còn dư > 80%.

### Giai đoạn 4 — Luyện Trình (Tuần 12–14) ✅
- [x] Analysis worker riêng: chấm từng nước của quân đang xem (tìm kiếm có giới hạn nước gốc), cache theo thế cờ, tính trước mọi quân của bên đi khi rảnh, hàng đợi ưu tiên quân đang xem.
- [x] Overlay trỏ chuột (máy tính) / chạm (điện thoại): % theo từng ô đích, mũi tên đánh số 1–5 cho chuỗi nước dự kiến, nhãn giải thích (Ăn Mã, Chiếu, Mất Xe!, Đổi quân, Thoát hiểm, Qua sông, Phát triển…), thanh đánh giá.
- [~] Hàm cp → %: dùng logistic k = 0,004; *chưa hiệu chỉnh bằng ván tự chơi*.
- [x] Đánh giá sau ván (trang /review): phân loại 5 mức, độ chính xác kiểu Lichess, biểu đồ lợi thế, nhảy tới sai lầm kế tiếp kèm mũi tên nước đúng; XP giảm khi dùng trợ giúp; khán giả bật riêng; online chỉ khi phòng bật Luyện Trình và không xếp hạng.
- **DoD**: đo trên máy phát triển, phân tích một quân mất khoảng 0,7 giây nếu chưa có trong cache; có cache thì hiện tức thì. *Chưa thử với người dùng thật.*

### Giai đoạn 5 — Hiệu ứng, thế cờ, mở khóa (Tuần 15–17) ✅
- [x] Lớp hiệu ứng Canvas 2D tự viết thay PixiJS (ADR-002), 4 bậc, tôn trọng reduced-motion.
- [x] Hiệu ứng bảng 9.2 theo 4 bậc rõ rệt: Cơ bản (quân khối 3D lao vào Tướng, thư pháp vàng, Tướng vỡ đôi), Bạc (hồn quân ánh **bạc**), Vàng (hồn quân ánh **vàng** + bóng mờ chuyển động, mực loang, phóng chậm, pháo hoa), Huyền thoại (hồn ma xanh tím ma mị: nhấp nháy, mắt đỏ, lửa ma, sương mù, sét xanh, tiếng ma; tướng cưỡi ngựa, pháo đầu rồng, rồng vàng mập bay khi chiếu bí). Cùng vỡ quân khi ăn, gợn sóng Tốt qua sông, lật quân (cờ úp), banner thế cờ (dải nhỏ ở mép trên, 1,8 giây). Xem ADR-002.
- [x] Bàn cờ 3D: cạnh trước có bề dày, bóng đổ xuống nền, ánh sáng góc trên trái, mặt chơi lõm, viền vát (viewBox 572×648). 12 bàn có vật thể 3D riêng ở hai lề (tre, cột son, cột đá cẩm thạch, chuỗi hạt ngọc, ống đèn neon, bút lông + nghiên mực, nẹp vàng, móc khắc gỗ, tinh thể băng, cột đá dung nham + lửa, hành tinh/mặt trăng, cành hoa anh đào); 12 bộ quân khối 3D (thêm Đồng cổ gỉ xanh, Băng hoa tuyết, Dung nham nứt lửa, Tinh vân sao).
- [x] Phòng thử hiệu ứng `/dev/fx` (chỉ bản dev): mọi bàn, bộ quân, bậc, 27 tình huống, banner 79 thế cờ, âm thanh, xem hồn quân theo từng bậc (Huyền thoại có chuyển động ma mị).
- [x] Sửa nhận diện "Pháo đầu Mã độn": cần đủ Pháo đầu + Bình phong mã + Tốt đầu đã tấn (trước đây báo ngay khi mới lên Bình phong mã).
- [x] Hiệu năng: bàn cờ tách 2 lớp SVG (nền tĩnh memo + quân), quân không dùng filter, hồn quân/rồng vẽ qua canvas tạm để chỉ làm mờ một lần, thư viện hồn quân trong phòng thử vẽ 6 khung/giây khi nhìn thấy. Đổi bàn 200–490 ms → 40–190 ms; bấm tình huống Huyền thoại từ "đứng hình" → ~100 ms (ADR-002 đợt 4).
- [x] `@np/patterns`: DSL + 79 mẫu (26 khai cuộc, 23 thế hình quân, 30 sát cục), 59 mẫu bật; test bằng ván mẫu cho các thế chính (Pháo đầu, Thuận/Nghịch pháo, Pháo đầu Mã độn, Bá vương xe, Xe tuần hà/kỵ hà/trầm đáy, Mã hậu pháo, Trùng pháo, Tốt chiếu bí). *Chưa đủ 2 ván mẫu cho mỗi thế.*
- [x] Bộ sưu tập: bàn cờ, quân cờ, hiệu ứng (xem thử), thành tựu, thế cờ đã gặp + nút báo nhận diện sai (API /api/feedback).
- [x] Mở khóa theo trận thắng + thành tựu (14 thành tựu), thông báo mở khóa, danh hiệu theo XP.
- [x] 12 bàn + 12 bộ quân vẽ bằng SVG/phông OFL; âm thanh tổng hợp (không cần CC0).
- **DoD**: *chưa đo 60fps trên điện thoại thật.*

### Giai đoạn 6 — Offline, đồng bộ, hoàn thiện (Tuần 18–19) ✅
- [x] PWA (vite-plugin-pwa): lưu sẵn app + engine; nút "Cài ứng dụng"; báo ngoại tuyến. Đã kiểm thử: tắt mạng vẫn mở app và đánh máy.
- [x] Đồng bộ local ↔ D1 (hợp nhất, không thu hồi; thành tựu hợp bằng phép hợp).
- [x] i18n vi/en/zh cho các màn hình chính (tên thế cờ và ký hiệu nước giữ nguyên thuật ngữ); điều khiển bàn cờ bằng bàn phím + đọc nước đi cho trình đọc màn hình; bundle ≈ 260KB gzip (trang đầu ≈ 120KB).
- [x] CSP, X-Frame-Options, rate limit chat, lọc từ; trang luật ghi rõ chiếu mãi + cờ úp.
- **DoD**: đạt. Lighthouse mobile: Accessibility 100, Best practices 100. Performance dao động 68–86 khi đo local, cần đo lại trên Cloudflare.

### Giai đoạn 7 — Beta bạn bè & ra mắt (Tuần 20)
- [ ] Beta ~10 người bạn, thu lỗi, cân bằng cấp máy. *(cần triển khai trước)*
- [~] Workflow backup D1 hằng tuần + workflow deploy đã có (.github/workflows); Sentry cần tài khoản.
- [x] Hướng dẫn luật chơi trong Cài đặt.

### Sau ra mắt (backlog, theo thứ tự)
1. ~~**Cờ úp** (mục 18)~~ ✅ đã làm: 2 người 1 máy + online giao hữu, server giữ bí mật quân úp.
2. Đóng gói app (Capacitor), thông báo tới lượt.
3. Giải đấu, bạn bè, kết bạn qua QR.
4. Thư viện khai cuộc, puzzle hằng ngày, luật đuổi mãi.
5. Phát hiện gian lận nâng cao; đăng nhập Facebook/Zalo.

---

## 14. Rủi ro & phương án

| Rủi ro | Ảnh hưởng | Phương án |
|---|---|---|
| Vượt hạn mức free của Cloudflare (requests/ngày, CPU DO) | Dịch vụ tạm ngừng tới ngày hôm sau | Hibernation, gộp message, cảnh báo ở 80% hạn mức; nâng lên Paid ~5 USD khi cần |
| Engine WASM nặng/chậm trên điện thoại yếu | Cấp cao & Luyện Trình chậm | Bản classical nhỏ, tải lười, tự giảm depth, cache |
| COOP/COEP cho WASM đa luồng | Chặn tài nguyên bên thứ 3 | Tự host mọi tài nguyên; fallback đơn luồng |
| Luật chiếu mãi gây tranh cãi | Trải nghiệm | Cảnh báo rõ, đếm 2/3, trang luật, log để đối chiếu |
| Hiệu ứng ảnh hưởng hiệu năng/pin | Giật | Ngân sách frame, bậc, reduced-motion |
| Giấy phép tài nguyên/engine (GPL, CC BY) | Pháp lý | CREDITS.md, engine là worker riêng không sửa, chỉ dùng CC0/CC BY/OFL |
| Không có designer | Skin kém đẹp | Ưu tiên font + CSS + texture; làm 3 bàn + 3 quân đẹp trước, bổ sung dần |
| Chỉ 1–2 dev | Tiến độ | MVP = Giai đoạn 1–3; các giai đoạn sau có thể kéo dài mà không ảnh hưởng người chơi |
| Cờ úp cần AI riêng | Trì hoãn | Bản đầu cờ úp chỉ người–người |

---

## 15. Câu hỏi đã chốt & việc cần chủ dự án cung cấp

| Câu hỏi | Kết luận |
|---|---|
| Đăng nhập | Chỉ Google ở bản đầu. |
| Tên miền | Chủ dự án đã có, sẽ gửi subdomain sau. |
| Bá vương xe | Hai Xe của cùng một bên nhìn thấy mặt nhau trong khai cuộc. |
| Danh mục thế cờ | Chủ dự án không cần biết hết; đội phát triển tổng hợp từ tài liệu (mục 9.3–9.5), bật dần theo kiểm chứng. |

**Cần cung cấp khi tới Giai đoạn 3**
1. Tên subdomain dùng cho web (ví dụ `co.example.com`) và cho API (ví dụ `api.co.example.com`).
2. Tên miền đang quản lý DNS ở đâu (Cloudflare hay nhà cung cấp khác) — quyết định cách trỏ ở mục 16.4.
3. Tài khoản Google Cloud để tạo OAuth Client ID (miễn phí; cần điền màn hình đồng ý OAuth với tên "Nine Palaces").

---

## 16. Hạ tầng miễn phí & lộ trình nâng cấp

### 16.1 Hạn mức gói free (kiểm tra lại khi triển khai; số liệu có thể thay đổi)
| Dịch vụ | Hạn mức free đáng chú ý | Đủ cho ~10 người? |
|---|---|---|
| Cloudflare Pages | Băng thông không giới hạn, 500 build/tháng | Dư |
| Cloudflare Workers | 100 000 request/ngày, 10ms CPU/request | Dư (REST ít) |
| Durable Objects (SQLite-backed, free plan) | ~100 000 request/ngày, giới hạn thời gian tính/ngày, 5GB lưu trữ; WebSocket message tính theo tỷ lệ gộp | Dư nếu dùng hibernation |
| D1 | 5 triệu dòng đọc/ngày, 100 000 dòng ghi/ngày, 5GB | Dư |
| Sentry | 5 000 lỗi/tháng | Dư |
| GitHub Actions | Free repo public; private 2 000 phút/tháng | Dư |
| Google OAuth | Miễn phí | |

### 16.2 Cách giữ chi phí = 0
- Không dùng dịch vụ cần thẻ tín dụng; không dùng Render/Railway/Fly (ngủ đông hoặc hết credit).
- Không phân tích engine trên server; mọi AI ở client.
- Hibernation cho WebSocket; đồng hồ bằng alarm thay vì tick liên tục.
- Ảnh/skin tự host trên Pages; không CDN trả phí.
- Bảng theo dõi hạn mức (Cloudflare dashboard) + cảnh báo email ở 80%.

### 16.3 Khi đông người (theo thứ tự)
| Mốc | Hành động | Chi phí ước tính |
|---|---|---|
| > 50 người đồng thời hoặc chạm 80% hạn mức | Workers Paid (bao gồm DO, D1 hạn mức cao hơn nhiều) | ~5 USD/tháng |
| > 1 000 người đồng thời | Tối ưu DO, tách LobbyDO theo khu vực, D1 read replicas | Theo dùng |
| Cần phân tích sâu server / chống gian lận nặng | VPS nhỏ chạy Pikafish native | ~5 USD/tháng |
Kiến trúc không thay đổi ở mọi mốc.

### 16.4 Trỏ tên miền (chủ dự án đã có tên miền, chi phí 0)
| Tình huống | Web (Pages) | API (Workers) | Ghi chú |
|---|---|---|---|
| **DNS của tên miền đang ở Cloudflare** (khuyến nghị) | Thêm custom domain `co.example.com` trong Pages, Cloudflare tự tạo bản ghi | Workers Custom Domain `api.co.example.com` | Đơn giản nhất, HTTPS tự động. |
| DNS ở nhà cung cấp khác, **không muốn chuyển** | Thêm custom domain trong Pages rồi tạo bản ghi `CNAME co → <project>.pages.dev` tại nhà cung cấp | Dùng `<name>.workers.dev` (free, có HTTPS) | Workers Custom Domain yêu cầu zone trên Cloudflare, nên API dùng workers.dev. Vì auth dùng Bearer token (không cookie) nên web và API khác site vẫn hoạt động. |
| DNS ở nơi khác nhưng **đồng ý chuyển nameserver sang Cloudflare** (free) | Như hàng 1 | Như hàng 1 | Chuyển nameserver không mất phí, tên miền vẫn thuộc nhà đăng ký cũ. |

- Cloudflare free **không** hỗ trợ chỉ ủy quyền một subdomain (subdomain zone là gói Enterprise), nên nếu muốn custom domain cho API thì phải chuyển cả zone.
- CORS: Worker chỉ cho phép origin của web; WebSocket kiểm tra header `Origin`.

---

## 17. Nguồn tài nguyên miễn phí

### 17.1 Hình ảnh & texture
| Nhu cầu | Nguồn | Giấy phép |
|---|---|---|
| Quân cờ chữ Hán (SVG) | Wikimedia Commons (bộ "Xiangqi pieces") | CC BY-SA / PD — kiểm tra từng file |
| Icon quân (bộ "Biểu tượng") | game-icons.net | CC BY 3.0 (ghi credit) |
| Texture gỗ, tre, đá, giấy, sơn mài | ambientCG, Poly Haven | CC0 |
| Hoa văn, rồng phượng (SVG) | OpenGameArt, Wikimedia Commons, svgrepo (lọc CC0) | CC0 / CC BY |
| UI icon | Lucide | ISC |
| Ảnh nền | Unsplash, Pexels | Giấy phép riêng, miễn phí thương mại |

### 17.2 Font (Google Fonts, OFL)
- Chữ Hán: Noto Serif SC/TC, Ma Shan Zheng, Long Cang, Zhi Mang Xing, ZCOOL XiaoWei.
- Chữ Việt: Be Vietnam Pro, Playfair Display, Lora.
- Cyber: Orbitron, Share Tech Mono.

### 17.3 Âm thanh
- freesound.org (lọc CC0), Kenney.nl (CC0), Pixabay (Pixabay License), OpenGameArt (CC0).
- Nhạc thắng/thua ngắn: tự tổng hợp bằng Web Audio API hoặc Pixabay.
- Danh sách cần: đi quân, ăn quân (theo quân), chiếu (5 loại), song chiếu, chiếu bí, cảnh báo chiếu mãi, hết giờ, thắng/thua/hòa, mở khóa, thế cờ (trống), Tốt qua sông (nước), UI click.

### 17.4 Engine & thư viện
- Fairy-Stockfish WASM, ffish.js: GPL-3.0 → tải như worker/file riêng, không sửa mã, kèm link mã nguồn trong trang "Về ứng dụng".
- Pikafish (nếu chọn): GPL-3.0, tương tự.
- Các thư viện npm còn lại: MIT/ISC/Apache-2.0.

### 17.5 Quy trình
- Mỗi tài nguyên thêm vào phải có dòng trong `docs/CREDITS.md`: tên, tác giả, nguồn, giấy phép, chỉnh sửa (nếu có).
- Trang "Về ứng dụng" trong game hiển thị credit.

---

## 18. Cờ úp (giai đoạn sau) — phác thảo

- **Luật (Cờ tướng úp / Jieqi phổ biến ở Việt Nam)**: 15 quân mỗi bên (trừ Tướng) úp mặt, xáo trộn, đặt vào vị trí khởi đầu chuẩn. Quân úp đi theo luật của **vị trí** nó đang đứng (ví dụ đứng ở ô Mã thì đi như Mã). Sau khi đi, quân được lật lên và từ đó đi theo **loại thật**. Quân lật vẫn có thể ra khỏi cung/qua sông theo luật của loại thật (biến thể có cấu hình).
- **Kiến trúc**: `@np/rules` variant `jieqi`; thông tin ẩn giữ ở server (RoomDO biết hết, client chỉ biết quân đã lật). Hotseat: lưu kín trên máy, hiển thị theo lượt. `GameEvent` thêm `reveal`.
- **AI**: Fairy-Stockfish không hỗ trợ thông tin ẩn → bản đầu cờ úp chỉ **người–người**; AI sau bằng expectimax/Monte Carlo trên engine JS.
- **Hiệu ứng**: lật quân (flip 3D), lật ra Xe → hiệu ứng "Bá vương"; skin dùng chung.
- **Ước tính**: 3–4 tuần sau khi bản chính ổn định.

---

## 19. Tiêu chí thành công (3 tháng sau ra mắt bạn bè)

| Chỉ số | Mục tiêu |
|---|---|
| Mở app → ván đầu tiên | < 30s |
| Ván online hoàn thành (không bỏ cuộc) | ≥ 85% |
| Người dùng bật Luyện Trình ít nhất 1 lần | ≥ 60% |
| Giữ chân ngày 7 | ≥ 25% |
| Crash-free sessions | ≥ 99.5% |
| Chi phí hạ tầng | 0 đồng |

---

## 20. Bước tiếp theo ngay

1. Giai đoạn 0: tạo tài khoản Cloudflare + repo, khởi tạo monorepo, chạy `wrangler dev`.
2. Benchmark engine WASM trên điện thoại thật (ADR-001).
3. Bắt đầu `@np/rules` với perft và luật chiếu mãi.
