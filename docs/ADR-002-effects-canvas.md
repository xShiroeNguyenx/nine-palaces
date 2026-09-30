# ADR-002: Hiệu ứng bằng Canvas 2D tự viết thay cho PixiJS

- Trạng thái: Đã chấp nhận
- Ngày: 2026-09-29

## Bối cảnh

PLAN.md dự kiến dùng PixiJS (WebGL) cho lớp hiệu ứng. Nhu cầu thực tế của game gồm vệt sáng, đường chữ nhật của Mã, ngòi pháo, hạt vỡ quân, vòng sóng, pháo hoa và rồng bay. Tất cả đều là hình học đơn giản với vài trăm hạt.

## Quyết định

Dùng một hệ hạt tự viết trên Canvas 2D (`apps/web/src/effects/EffectCanvas.tsx`, khoảng 9KB, 3,8KB nén):

- Canvas phủ trên bàn cờ, chỉ chạy `requestAnimationFrame` khi có hiệu ứng, xong thì dừng hẳn.
- 4 bậc hiệu ứng (Cơ bản, Bạc, Vàng, Huyền thoại) điều chỉnh số hạt và thêm sóng xung kích, quay chậm/phóng to khi chiếu bí, pháo hoa, rồng bay, đổi sắc bàn cờ.
- Tôn trọng cài đặt "Hiệu ứng" và `prefers-reduced-motion`.

## Bổ sung (đợt 2): hồn quân, 4 bậc rõ rệt, trang trí bàn, quân 3D

- `effects/spirits.ts`: "hồn quân" vẽ bằng `Path2D` (ngựa, tướng cưỡi ngựa, chiến xa có ngựa kéo, pháo cổ, pháo đầu rồng, lính giáo, rồng) — tô gradient vàng, 2 lớp (lớp phát sáng `lighter` + lớp gradient). Có tham số pha để chân ngựa, bánh xe, cờ chuyển động.
- 4 bậc: Cơ bản = quân khối 3D lao vào Tướng + thư pháp; Bạc = hồn quân; Vàng = + bóng mờ chuyển động, mực loang, phóng chậm (class CSS `fx-mate-zoom` áp cho cả SVG và canvas); Huyền thoại = tướng cưỡi ngựa, pháo đầu rồng, sét, tro lửa, rồng lượn chữ S khi chiếu bí.
- Chữ thư pháp dùng giản thể (车, 马, 炮, 绝杀) vì phông Ma Shan Zheng chỉ có giản thể; chữ trên quân giữ phồn thể.
- `board/decor.tsx`: trang trí SVG cho từng bàn (tre có đốt/lá, mái ngói + vảy rồng, mây vàng góc, con dấu + rìa giấy dó, khảm vàng + hoa văn góc, vệt sáng ngọc, khung neon + quét sáng, vân gỗ + bevel). Lề bàn 46px: viền 1–7, số lộ 11–20, quân ngoài cùng chiếm 20–72 → trang trí mép chỉ dùng dải 7–11 và hai lề trái/phải.
- `board/themes.ts` + `Board.tsx`: quân khối 3D (mặt bên tạo độ dày, gờ sáng/bóng, chữ khắc chìm/nổi/mạ vàng/neon, vân gỗ, lõi ngọc, lục giác cyber).

## Bổ sung (đợt 3): bàn 3D, bậc rõ rệt, ma mị, rồng mập, 12 bàn / 12 bộ quân

- **Bàn 3D** (`board/geometry.ts`, `Board.tsx`): viewBox cao thêm `EDGE_H = 16` (572×648) để vẽ cạnh trước có bề dày (gradient `theme.edge`), bóng đổ mờ xuống nền, mặt trên bo góc trên/vuông góc dưới, lớp ánh sáng gradient từ góc trên trái (nhẹ hơn với bàn tối `theme.dark`), bóng trong quanh vùng kẻ (mặt chơi lõm), viền khung vát sáng/tối, bóng quân lệch (dx 1, dy 3,5). CSS `aspect-ratio` và `--zoom-y` đổi theo `VIEW_H`.
- **Vật thể 3D ở hai lề** (`board/decor.tsx`): mỗi bàn có khối riêng (cột đá cẩm thạch, cột son đai vàng, chuỗi hạt ngọc xâu chỉ đỏ, ống đèn neon, bút lông + nghiên mực, nẹp vàng, móc khắc gỗ, tinh thể băng, cột đá dung nham + ngọn lửa, hành tinh có vành + mặt trăng + tinh cầu, cành hoa anh đào). Thêm 4 bàn: Băng tuyết, Dung nham (lửa animation `.flame`), Ngân hà (sao `.twinkle`), Hoa anh đào (cánh hoa `.petal-fall`); 4 bộ quân: Đồng cổ (gỉ `patina`), Băng (`frost`), Dung nham (`cracks`), Tinh vân (`stars`) qua `PieceTheme.overlay`.
- **Bậc hiệu ứng** (`effects/sprites.ts`): `STYLE` Bạc = bạc `['#ffffff','#cfd8e3','#6f7d8c']`, Vàng = vàng, Huyền thoại = xanh ma tím `['#f0fff8','#8cf5cf','#5b21b6']` + cờ `eerie`. `TIER_TINT` đổi màu vệt, vòng va chạm, thư pháp, lửa pháo, mực loang, sét theo bậc; bậc Cơ bản giữ màu theo quân.
- **Ma mị (Huyền thoại)** (`effects/spirits.ts`): `SpiritStyle.eerie/time` → hồn quân nhấp nháy như bóng ma, ảnh ma lệch tím, sương khói tím-xanh quanh hình, mắt đỏ phát sáng theo `Shapes.eyes`; thêm `ghostFog` (sương trôi ngang bàn), `ghostFlames` (lửa ma bay lên), `cinematicDim(..., eerie)` tối tím, `lightning(..., eerie)` sét xanh, `sfx.ghost`.
- **Rồng mập**: `drawDragon` vẽ thân bề rộng gần đều (chỉ thon ở đuôi, hơi thu ở cổ), vảy bụng sáng, vây lưng răng cưa, hai cặp chân có móng, đầu to có hàm, bờm, sừng, râu, mắt; bề rộng 18 → 34.
- **Banner thế cờ**: `.fx-formation` thu nhỏ (top 6%, chữ ~1rem, 1,8 giây) để không che quân.
- **Nhận diện**: `phao_dau_ma_don` yêu cầu thêm Tốt đầu đã tấn (`at soldier e4`).

## Bổ sung (đợt 4): hiệu năng — vì sao game từng giật

Đo bằng Playwright (Chrome headless, dpr 2) trong phòng thử: thời gian từ lúc bấm tới khung hình kế tiếp.

| Thao tác | Trước | Sau |
|---|---|---|
| Đổi bàn cờ | 200–490 ms | 40–190 ms |
| Bấm tình huống (Cơ bản) | 160–940 ms | 50–170 ms (chiếu bí 435 ms do dựng chữ thư pháp lần đầu) |
| Bấm tình huống (Huyền thoại) | trang đứng hình nhiều giây | 64–113 ms |
| Vẽ lại bàn Gỗ mộc mỗi khung | 260 ms (có khung 1,5 s) | 9–12 ms |

Nguyên nhân và cách sửa:

1. **Filter SVG chạy lại ở mọi lần vẽ.** Bất kỳ hoạt ảnh nào bên trong SVG (quân trượt, vòng sáng chiếu nhấp nháy, cánh hoa rơi) đều ép vẽ lại toàn bộ SVG, kéo theo mọi `filter`: 32 `feDropShadow` của quân, `feGaussianBlur` bóng lõm/bóng nền, `feTurbulence` vân gỗ (3 octave), 80 filter riêng cho từng hạt ngọc… → **Tách bàn thành 2 lớp SVG** (`.board-bg` nền tĩnh, `memo`; `.board` quân + tương tác). Quân **không dùng filter**: bóng = vòng gradient, "glow" neon = nét viền mờ. Bóng lõm/bóng nền = dải gradient. Trang trí gom filter theo nhóm (một filter cho cả cột hạt ngọc / cột tinh thể / một cành hoa); vết nứt dung nham dùng nét rộng mờ thay blur; vân gỗ 2 octave.
2. **`shadowBlur` trên canvas**: mỗi lệnh fill/stroke có bóng là một lần làm mờ riêng — hồn quân ~40 nét × 2 lớp, rồng ~100 nét. → Vẽ hình một lần vào **canvas tạm** rồi phát sáng bằng **một** `drawImage` có bóng (đẩy ảnh ra ngoài bằng `shadowOffsetX` lớn để chỉ còn bóng), bán kính mờ tính bằng pixel có trần 30. Mực loang gom thành một đường tô một lần.
3. **Thư viện hồn quân trong phòng thử** vẽ 60 khung/giây với bậc Huyền thoại (mặc định) → chiếm hết luồng chính, mọi thao tác trong phòng thử đều trễ. → 6 khung/giây, dpr 1, chỉ khi canvas trong tầm nhìn (IntersectionObserver).
4. Bỏ `filter: saturate()` trong keyframe phóng to chiếu bí (filter CSS trên lớp lớn buộc dựng lại ảnh).

Xuất ảnh thế cờ (`lib/exportImage.ts`) ghép hai lớp SVG thành một trước khi vẽ lên canvas.

## Hệ quả

- Không thêm khoảng 450KB (PixiJS v8), phù hợp mục tiêu tải nhanh trên mạng di động. Lớp hiệu ứng ≈ 11KB nén, bàn cờ ≈ 8KB nén.
- Nếu sau này cần shader hoặc hàng nghìn hạt thì có thể thay bằng PixiJS mà không đổi giao diện component (`events`, `stamp`, `tier`).
- Hình vẽ bằng code vẫn là bóng/silhouette; muốn nhân vật có nét mặt, giáp trụ chi tiết thì cần tranh minh họa PNG và có thể ghép vào cùng cơ chế `actor`.
