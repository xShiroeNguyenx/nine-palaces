/** Bộ lọc từ ngữ thô tục đơn giản cho chat (bổ sung dần) */
const BAD_WORDS = ['dm', 'đm', 'dcm', 'đcm', 'vcl', 'vkl', 'clm', 'cc', 'đéo', 'deo', 'địt', 'dit', 'lồn', 'buồi', 'fuck', 'shit'];

const pattern = new RegExp(`(^|[\\s.,!?])(${BAD_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[\\s.,!?])`, 'giu');

export function filterChat(text: string): string {
  return text
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, 200)
    .replace(pattern, (_m, pre: string, word: string) => `${pre}${'*'.repeat(word.length)}`);
}
