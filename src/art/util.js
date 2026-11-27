/**
 * ============================================================================
 * util.js —— 绘图工具函数库
 * ----------------------------------------------------------------------------
 * 提供：圆角矩形路径、线性/径向渐变填充、多层描边文字（卡通标题字）、
 * 阴影包裹、随机数工具、缓动函数、色彩工具。所有美术模块共用。
 * 注意：任何模块使用前必须确认已从本文件 import（缺失 import 会在
 * 首帧绘制抛 ReferenceError 杀死主循环 —— 教训来自工程实践）。
 * ============================================================================
 */

/** 视区常量：与画布逻辑分辨率一致 */
export const W = 1024;
export const H = 768;

/* ------------------------------- 路径工具 ------------------------------- */

/** 圆角矩形路径（仅构建路径，由调用方 fill/stroke） */
export function roundRect(g, x, y, w, h, r) {
  if (r > w / 2) r = w / 2;
  if (r > h / 2) r = h / 2;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** 填充圆角矩形（快捷） */
export function fillRR(g, x, y, w, h, r, style) {
  roundRect(g, x, y, w, h, r);
  g.fillStyle = style;
  g.fill();
}

/** 垂直线性渐变 */
export function vGrad(g, x, y0, y1, c0, c1) {
  const gr = g.createLinearGradient(x, y0, x, y1);
  gr.addColorStop(0, c0);
  gr.addColorStop(1, c1);
  return gr;
}

/** 多段垂直渐变（stops: [[color,pos],...]，与 THEMES.sky 数据格式一致） */
export function vGradStops(g, x, y0, y1, stops) {
  const gr = g.createLinearGradient(x, y0, x, y1);
  for (const [c, p] of stops) gr.addColorStop(p, c);
  return gr;
}

/** 径向渐变 */
export function radial(g, x, y, r0, r1, c0, c1) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  gr.addColorStop(0, c0);
  gr.addColorStop(1, c1);
  return gr;
}

/* ------------------------------- 卡通文字 ------------------------------- */

/**
 * 卡通描边大字：底层厚描边 + 顶层填充 + 可选高光，嘉年华海报风
 * @param {string} text 文本
 * @param {number} x 中心 x
 * @param {number} y 基线 y
 * @param {number} size 字号
 * @param {string} fill 填充色
 * @param {string} stroke 描边色
 * @param {number} [weight] 描边宽度（默认 size/7）
 * @param {string} [font] 字体族
 */
export function toonText(g, text, x, y, size, fill, stroke, weight, font) {
  const fam = font || '"Impact","Arial Black","Trebuchet MS","Microsoft YaHei",sans-serif';
  g.save();
  g.font = `900 ${size}px ${fam}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = weight || Math.max(4, size / 6.5);
  g.strokeStyle = stroke;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
  g.restore();
}

/** 带下坠阴影的描边字（标题层级） */
export function posterText(g, text, x, y, size, fill, stroke, shadow) {
  g.save();
  g.translate(x, y + size * 0.06);
  toonText(g, text, 0, 0, size, shadow || 'rgba(60,30,5,0.55)', 'transparent', size / 6);
  g.restore();
  toonText(g, text, x, y, size, fill, stroke);
}

/* ------------------------------- 缓动函数 ------------------------------- */
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  outBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1) ? t
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
};

/* ------------------------------- 随机工具 ------------------------------- */
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** 颜色亮度调节（'#rrggbb', -1..1） */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; gg += (255 - gg) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; gg *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}

/** 五角星路径（star 徽章 / 金鸭闪星 / 引导标记共用） */
export function starPath(g, cx, cy, R, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.closePath();
}
