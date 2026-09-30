/**
 * Địa chỉ API. Production đặt VITE_API_URL (Cloudflare Worker).
 * Khi chạy local không đặt biến này: gọi cùng origin với trang, Vite chuyển tiếp /api sang wrangler :8787
 * → mở từ điện thoại qua http://192.168.x.x:5173 vẫn chơi online được.
 */
function defaultApi(): string {
  if (typeof location === 'undefined') return 'http://localhost:8787';
  return location.origin;
}

export const API_URL: string = ((import.meta.env.VITE_API_URL as string | undefined) || defaultApi()).replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws');

/**
 * Chế độ online (phòng, QR, xem trận, xếp hạng, lịch sử ván online).
 * Tạm tắt cho bản phát hành đầu; bật lại bằng VITE_ONLINE=1 (file .env.local hoặc biến môi trường khi build).
 */
export const ONLINE_ENABLED = import.meta.env.VITE_ONLINE === '1';
