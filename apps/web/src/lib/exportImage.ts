/**
 * Xuất ảnh PNG thế cờ từ bàn cờ (chia sẻ nếu thiết bị hỗ trợ, ngược lại tải về).
 * Bàn cờ gồm 2 lớp SVG (`.board-bg` nền và `.board` quân) → ghép thành một SVG để vẽ.
 */
export async function exportBoardImage(root: Element | null, title = 'the-co'): Promise<'shared' | 'downloaded' | 'failed'> {
  if (!root) return 'failed';
  try {
    const layers = root.matches('svg')
      ? [root as SVGSVGElement]
      : ([...root.querySelectorAll('svg.board-bg, svg.board')] as SVGSVGElement[]);
    const first = layers[0];
    if (!first) return 'failed';
    const NS = 'http://www.w3.org/2000/svg';
    const out = document.createElementNS(NS, 'svg');
    out.setAttribute('xmlns', NS);
    const vb = first.viewBox.baseVal;
    out.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
    const scale = 2;
    out.setAttribute('width', String(vb.width * scale));
    out.setAttribute('height', String(vb.height * scale));
    // Nhúng phông cho chữ trên quân (ảnh SVG độc lập không đọc CSS của trang)
    const style = document.createElementNS(NS, 'style');
    style.textContent = `
      .piece-text{font-family:'Noto Serif SC','SimSun','Songti SC',serif;font-weight:700}
      .piece-text.viet{font-family:'Pattaya','Sriracha','Segoe Script',cursive;font-weight:400}
      .river-text.viet text{font-family:'Pattaya','Sriracha','Segoe Script',cursive;font-weight:400}
      .piece-text.callig{font-family:'Ma Shan Zheng','Noto Serif SC',serif}
      .river-text text{font-family:'Noto Serif SC',serif;font-weight:700;opacity:.75}
      .coords text{font-family:system-ui,sans-serif;font-weight:700}
      .last-move rect{fill:none;stroke:rgba(40,110,200,.9);stroke-width:3}
      .last-move .lm-from{stroke-dasharray:6 5;stroke:rgba(40,110,200,.45)}
      .target-dot,.target-capture,.kb-cursor,.badge{display:none}
    `;
    out.appendChild(style);
    for (const layer of layers) {
      const clone = layer.cloneNode(true) as SVGSVGElement;
      while (clone.firstChild) out.appendChild(clone.firstChild);
    }
    // Ảnh nền bàn cờ: SVG vẽ qua <img> không tải được file ngoài → nhúng thành data URL
    for (const im of [...out.querySelectorAll('image')]) {
      const href = im.getAttribute('href');
      if (!href || href.startsWith('data:')) continue;
      const blob = await (await fetch(href)).blob();
      const data = await new Promise<string>((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result as string);
        fr.readAsDataURL(blob);
      });
      im.setAttribute('href', data);
    }
    const xml = new XMLSerializer().serializeToString(out);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không dựng được ảnh'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = vb.width * scale;
    canvas.height = vb.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1f1510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) return 'failed';
    const file = new File([blob], `${title}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Thế cờ — Cửu Cung' });
        return 'shared';
      } catch {
        /* người dùng hủy → tải về */
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return 'downloaded';
  } catch (e) {
    console.error(e);
    return 'failed';
  }
}
