import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Chặn rời màn chơi khi ván đang dở (nút quay lại / logo trên thanh trên cùng).
 * Màn chơi đăng ký lời cảnh báo; thanh điều hướng hỏi xác nhận trước khi rời.
 */
interface LeaveGuard {
  message: string | null;
  set: (m: string | null) => void;
}

export const useLeaveGuardStore = create<LeaveGuard>((set) => ({
  message: null,
  set: (message) => set({ message }),
}));

/** Bật cảnh báo khi `active`; tự tắt khi rời màn hình */
export function useLeaveGuard(active: boolean, message: string) {
  const set = useLeaveGuardStore((s) => s.set);
  useEffect(() => {
    set(active ? message : null);
    return () => set(null);
  }, [active, message, set]);
}
