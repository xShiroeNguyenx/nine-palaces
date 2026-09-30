import { useCallback } from 'react';
import { useSettings, type Lang } from './settings';

/**
 * Đa ngôn ngữ: khóa là chính câu tiếng Việt, từ điển chỉ cần bản dịch en/zh.
 * Câu chưa có bản dịch sẽ hiện tiếng Việt (không vỡ giao diện).
 * Tên thế cờ, ký hiệu nước đi giữ nguyên thuật ngữ gốc.
 */
type Dict = Record<string, [en: string, zh: string]>;

const DICT: Dict = {
  // Điều hướng
  'Trang chủ': ['Home', '首页'],
  Online: ['Online', '在线'],
  Máy: ['AI', '人机'],
  '2 người': ['2 players', '双人'],
  Xem: ['Watch', '观战'],
  'Xếp hạng': ['Ranking', '排行'],
  'Hồ sơ': ['Profile', '我的'],
  'Cài đặt': ['Settings', '设置'],
  'Bộ sưu tập': ['Collection', '收藏'],
  // Trang chủ
  'Cờ tướng với bạn bè, với máy, và xem người khác đánh.': ['Xiangqi with friends, against AI, and spectate others.', '与好友对弈、人机对战、观看他人对局。'],
  'Xin chào,': ['Hello,', '你好，'],
  'Chơi với bạn': ['Play a friend', '好友对战'],
  'Tạo phòng, quét QR là vào': ['Create a room, scan the QR to join', '创建房间，扫码即可加入'],
  'Đánh với máy': ['Play the AI', '人机对战'],
  '2 người 1 máy': ['2 players, 1 device', '同屏双人'],
  'Cờ tướng hoặc cờ úp trên một thiết bị': ['Xiangqi or Jieqi on one device', '同一设备下象棋或揭棋'],
  'Luyện Trình': ['Training', '练棋'],
  'Xếp thế, xem % và 5 nước tiếp theo': ['Set up positions, see win % and next 5 moves', '摆局，查看胜率与后五步'],
  'Xem trận': ['Watch games', '观战'],
  'Các ván công khai đang diễn ra': ['Public games in progress', '正在进行的公开对局'],
  'Bàn cờ, quân cờ, hiệu ứng, thế cờ': ['Boards, pieces, effects, patterns', '棋盘、棋子、特效、棋型'],
  'Bảng xếp hạng': ['Leaderboard', '排行榜'],
  'Elo theo thể thức': ['Elo by time control', '按赛制的等级分'],
  'trận thắng': ['wins', '胜'],
  'thành tựu': ['achievements', '成就'],
  // Ván cờ
  'Lượt:': ['Turn:', '轮到：'],
  Đỏ: ['Red', '红'],
  Đen: ['Black', '黑'],
  '— đang bị chiếu!': ['— in check!', '— 被将军！'],
  '— tới lượt bạn': ['— your move', '— 轮到你'],
  '💡 Gợi ý': ['💡 Hint', '💡 提示'],
  'Đang tính…': ['Thinking…', '计算中…'],
  '↶ Đi lại': ['↶ Undo', '↶ 悔棋'],
  '⇅ Xoay bàn': ['⇅ Flip', '⇅ 翻转'],
  '🤝 Hòa': ['🤝 Draw', '🤝 和棋'],
  'Xác nhận hòa?': ['Confirm draw?', '确认和棋？'],
  'Quay lại': ['Back', '返回'],
  'Cờ tướng với máy hoặc với bạn trên cùng một máy.': ['Xiangqi against the computer or a friend on the same device.', '与电脑对弈，或与好友同屏对弈。'],
  'Thêm': ['More', '更多'],
  'Mời': ['Invite', '邀请'],
  'Đã cầu hòa': ['Draw offered', '已提和'],
  'Đã xin': ['Requested', '已请求'],
  'Tới lượt bạn': ['Your move', '轮到你'],
  'Luyện': ['Coach', '陪练'],
  'Rời ván đấu?': ['Leave the game?', '离开对局？'],
  'Rời ván': ['Leave', '离开'],
  'Ở lại': ['Stay', '留下'],
  'Nước đi': ['Moves', '走棋'],
  'Công cụ': ['Tools', '工具'],
  'Ván đang chơi dở sẽ bị mất nếu bạn rời đi.': ['The unfinished game will be lost if you leave.', '离开后未完成的对局将丢失。'],
  'Ván online vẫn tiếp tục và đồng hồ của bạn vẫn chạy. Bạn có thể quay lại phòng bằng link mời.': [
    'The online game continues and your clock keeps running. You can rejoin with the invite link.',
    '在线对局仍在继续，你的计时仍在走。可通过邀请链接返回。',
  ],
  '🏳 Đầu hàng': ['🏳 Resign', '🏳 认输'],
  'đầu hàng': ['resigns', '认输'],
  'Đánh lại': ['Rematch', '再来一局'],
  'Về sảnh': ['Back to lobby', '返回大厅'],
  'Mời bạn vào phòng': ['Invite a friend', '邀请好友'],
  'Đang chờ hai bên sẵn sàng': ['Waiting for both players to be ready', '等待双方准备'],
  'Phòng đã đóng': ['Room closed', '房间已关闭'],
  'Phòng': ['Room', '房间'],
  'Giao hữu': ['Casual', '友谊赛'],
  'Chắc chắn?': ['Sure?', '确定？'],
  '⟳ Ván mới': ['⟳ New game', '⟳ 新局'],
  'Bắt đầu lại?': ['Restart?', '重新开始？'],
  '💾 Lưu / Tải': ['💾 Save / Load', '💾 保存/载入'],
  '📷 Ảnh thế cờ': ['📷 Board image', '📷 局面截图'],
  '📈 Phân tích ván': ['📈 Analyze game', '📈 复盘分析'],
  'Ván mới': ['New game', '新局'],
  'Xem lại ván': ['Review game', '查看对局'],
  'Bạn thắng!': ['You win!', '你赢了！'],
  'Bạn thua': ['You lose', '你输了'],
  'Hòa cờ': ['Draw', '和棋'],
  'Đỏ thắng': ['Red wins', '红胜'],
  'Đen thắng': ['Black wins', '黑胜'],
  'đang nghĩ…': ['thinking…', '思考中…'],
  Bạn: ['You', '你'],
  'Bên Đỏ': ['Red', '红方'],
  'Bên Đen': ['Black', '黑方'],
  'Chưa có nước đi': ['No moves yet', '暂无着法'],
  'Cờ úp': ['Jieqi', '揭棋'],
  'Phân tích': ['Analysis', '分析'],
  // Online
  'Chơi online': ['Play online', '在线对弈'],
  '⚡ Tạo phòng nhanh': ['⚡ Quick room', '⚡ 快速开房'],
  'Tạo phòng, đưa mã QR cho bạn quét là vào chung trận.': ['Create a room and let your friend scan the QR code to join.', '创建房间，让好友扫码加入。'],
  'Loại cờ': ['Variant', '棋种'],
  'Cờ tướng': ['Xiangqi', '象棋'],
  'Thời gian': ['Time control', '用时'],
  'Bên của bạn': ['Your side', '执子'],
  'Ngẫu nhiên': ['Random', '随机'],
  'Tạo phòng & lấy mã QR': ['Create room & get QR', '创建房间并生成二维码'],
  '🔑 Vào phòng': ['🔑 Join room', '🔑 加入房间'],
  '📷 Quét mã QR': ['📷 Scan QR', '📷 扫码'],
  Vào: ['Join', '加入'],
  '🎲 Ghép trận nhanh': ['🎲 Quick match', '🎲 快速匹配'],
  'Tìm đối thủ': ['Find opponent', '寻找对手'],
  Hủy: ['Cancel', '取消'],
  '👁 Xem người khác đánh': ['👁 Watch others', '👁 观看对局'],
  'Cầu hòa': ['Offer draw', '求和'],
  'Xin đi lại': ['Request undo', '请求悔棋'],
  '📤 Mời / Chia sẻ': ['📤 Invite / Share', '📤 邀请/分享'],
  '✔ Sẵn sàng': ['✔ Ready', '✔ 准备'],
  'Hủy sẵn sàng': ['Unready', '取消准备'],
  'Đang chờ đối thủ': ['Waiting for opponent', '等待对手'],
  'Trò chuyện': ['Chat', '聊天'],
  Gửi: ['Send', '发送'],
  'Nhắn tin…': ['Message…', '输入消息…'],
  'Đang đánh': ['In progress', '对局中'],
  'Phòng đang chờ': ['Waiting rooms', '等待中的房间'],
  '👁 Xem': ['👁 Watch', '👁 观战'],
  'Vào chơi': ['Join', '加入'],
  // AI
  'Bạn cầm': ['You play', '执子'],
  'Đỏ (đi trước)': ['Red (moves first)', '红（先行）'],
  'Đã thắng:': ['Wins:', '已胜：'],
  // Cài đặt
  'Ký hiệu nước đi': ['Move notation', '记谱法'],
  'Âm thanh': ['Sound', '声音'],
  'Luật chơi áp dụng': ['Rules', '规则'],
  'Về ứng dụng': ['About', '关于'],
  // Bộ sưu tập / hồ sơ
  'Quân cờ': ['Pieces', '棋子'],
  'Bàn cờ': ['Boards', '棋盘'],
  'Hiệu ứng': ['Effects', '特效'],
  'Thành tựu': ['Achievements', '成就'],
  'Thế cờ': ['Patterns', '棋型'],
  Dùng: ['Use', '使用'],
  'Đang dùng': ['In use', '使用中'],
  'Xem thử': ['Preview', '预览'],
  'Tiến trình': ['Progress', '进度'],
  'Lịch sử ván online': ['Online game history', '在线对局记录'],
  'Đăng nhập bằng Google': ['Sign in with Google', '使用 Google 登录'],
  'Đăng xuất': ['Sign out', '退出登录'],
  'Đổi tên': ['Rename', '改名'],
  'Danh hiệu': ['Title', '称号'],
  // Luyện Trình
  '🎓 Luyện Trình': ['🎓 Training', '🎓 练棋'],
  'Trỏ chuột hoặc chạm vào một quân của bên đang đi để xem các nước đi và % lợi thế.': [
    'Hover or tap a piece of the side to move to see its moves and win %.',
    '将鼠标悬停或点击当前行棋方的棋子，查看着法与胜率。',
  ],
  'Diễn biến:': ['Line:', '变化：'],
  // Phân tích
  'Bàn phân tích': ['Analysis board', '分析棋盘'],
  'Sai lầm kế tiếp': ['Next mistake', '下一个失误'],
  'Độ chính xác Đỏ': ['Red accuracy', '红方准确率'],
  'Độ chính xác Đen': ['Black accuracy', '黑方准确率'],
  'Đang phân tích…': ['Analyzing…', '分析中…'],
};

const IDX: Record<Exclude<Lang, 'vi'>, 0 | 1> = { en: 0, zh: 1 };

export function translate(lang: Lang, vi: string): string {
  if (lang === 'vi') return vi;
  return DICT[vi]?.[IDX[lang]] ?? vi;
}

/** Hook dịch: `const t = useT(); t('Ván mới')` */
export function useT(): (vi: string) => string {
  const lang = useSettings((s) => s.lang);
  return useCallback((vi: string) => translate(lang, vi), [lang]);
}

export function dictionarySize(): number {
  return Object.keys(DICT).length;
}
