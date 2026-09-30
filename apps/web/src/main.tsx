import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Nạp phông Google không chặn lần vẽ đầu tiên (chữ hiện bằng phông hệ thống trước, đổi khi tải xong)
const HAN = '帥仕相傌俥炮兵將士象馬車砲卒楚河漢界';
const VIET = 'TướngSĩTượngXePháoMãTốtSởhàHángiớiTuyệtsá';
const FONTS = [
  'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap',
  // Thư pháp tiếng Việt (bộ quân Chữ Việt): nét bút lông đậm, có đủ dấu
  `https://fonts.googleapis.com/css2?family=Pattaya&display=swap&text=${encodeURIComponent(VIET)}`,
  `https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&display=swap&text=${encodeURIComponent(HAN)}`,
  `https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap&text=${encodeURIComponent(HAN + '车马炮兵将士象绝杀龙')}`,
];
for (const href of FONTS) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
