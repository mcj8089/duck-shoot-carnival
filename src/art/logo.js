/**
 * ============================================================================
 * logo.js —— 游戏品牌 LOGO（暗夜猎场铁牌 + 鸭子吉祥物）
 * ----------------------------------------------------------------------------
 * 程序化绘制的完整品牌标识：拱形双层铁牌 + 金属铆钉 + "DUCK SHOOT CARNIVAL"
 * 弹道海报字 + 弹孔装饰 + 探头的鸭吉祥物（写实鸭头，眨眼动画）+ 金星徽章。
 * 用于：主菜单巨幅 LOGO / 开屏加载 / 分享卡片角标。
 * ============================================================================
 */
import { toonText, starPath } from './util.js';
import { drawDuckHeadIcon } from './duck.js';

/**
 * 绘制 LOGO
 * @param {number} x,y 左上角
 * @param {number} w 宽（高按比例 0.52w）
 * @param {number} t 时间（吉祥物眨眼动画）
 * @param {object} opt {scale, duck:true}
 */
export function drawLogo(g, x, y, w, t = 0, opt = {}) {
  const h = w * 0.52;
  g.save();
  g.translate(x, y);

  /* --- 悬挂链索（三节环扣） --- */
  g.strokeStyle = '#3a4048';
  g.lineWidth = Math.max(3, w * 0.011);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(w * 0.1, h * 0.02);
  g.quadraticCurveTo(w * 0.5, h * 0.22, w * 0.9, h * 0.02);
  g.stroke();
  g.fillStyle = '#59616e';
  for (const dx of [w * 0.1, w * 0.5, w * 0.9]) {
    const dy = h * 0.02 + Math.sin((dx / w - 0.5) * Math.PI) * -h * 0.06 + h * 0.02;
    g.beginPath(); g.arc(dx, dy + h * 0.02, w * 0.014, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.beginPath(); g.arc(dx - 1, dy + h * 0.014, w * 0.005, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#59616e';
  }

  /* --- 主铁牌（拱形） --- */
  const boardY = h * 0.14, boardH = h * 0.62;
  g.save();
  /* 阴影 */
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.beginPath();
  g.moveTo(w * 0.05 + 6, boardY + 8);
  g.quadraticCurveTo(w * 0.5 + 6, boardY - h * 0.1 + 8, w * 0.95 + 6, boardY + 8);
  g.lineTo(w * 0.95 + 6, boardY + boardH + 8);
  g.quadraticCurveTo(w * 0.5 + 6, boardY + boardH + h * 0.14 + 8, w * 0.05 + 6, boardY + boardH + 8);
  g.closePath(); g.fill();
  /* 板体（拉丝暗钢渐变） */
  const grad = g.createLinearGradient(0, boardY, 0, boardY + boardH);
  grad.addColorStop(0, '#3c4553');
  grad.addColorStop(0.55, '#262d38');
  grad.addColorStop(1, '#141920');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(w * 0.05, boardY);
  g.quadraticCurveTo(w * 0.5, boardY - h * 0.1, w * 0.95, boardY);
  g.lineTo(w * 0.95, boardY + boardH);
  g.quadraticCurveTo(w * 0.5, boardY + boardH + h * 0.14, w * 0.05, boardY + boardH);
  g.closePath(); g.fill();
  g.strokeStyle = '#0e1116';
  g.lineWidth = Math.max(3, w * 0.014);
  g.stroke();
  /* 内圈琥珀警戒描边 */
  g.strokeStyle = 'rgba(255,170,60,0.45)';
  g.lineWidth = Math.max(1.5, w * 0.005);
  g.beginPath();
  g.moveTo(w * 0.075, boardY + h * 0.012);
  g.quadraticCurveTo(w * 0.5, boardY - h * 0.07, w * 0.925, boardY + h * 0.012);
  g.lineTo(w * 0.925, boardY + boardH - h * 0.028);
  g.quadraticCurveTo(w * 0.5, boardY + boardH + h * 0.1, w * 0.075, boardY + boardH - h * 0.028);
  g.closePath(); g.stroke();
  /* 拉丝纹 */
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  g.lineWidth = Math.max(1.4, w * 0.004);
  for (const k of [0.35, 0.62]) {
    g.beginPath();
    g.moveTo(w * 0.1, boardY + boardH * k);
    g.quadraticCurveTo(w * 0.5, boardY + boardH * k + w * 0.012, w * 0.9, boardY + boardH * k);
    g.stroke();
  }
  /* 四角铆钉 */
  for (const dx of [w * 0.12, w * 0.88]) {
    for (const dy of [boardY + boardH * 0.24, boardY + boardH * 0.78]) {
      g.fillStyle = '#8a93a3';
      g.beginPath(); g.arc(dx, dy, w * 0.011, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.arc(dx - w * 0.003, dy - w * 0.003, w * 0.004, 0, Math.PI * 2); g.fill();
    }
  }
  /* 弹孔装饰（两层锈环 + 暗芯，避让文字区） */
  const bulletHole = (bx, by, br) => {
    g.fillStyle = 'rgba(20,14,8,0.85)';
    g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(140,90,40,0.5)'; g.lineWidth = br * 0.5;
    g.beginPath(); g.arc(bx, by, br * 1.2, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = br * 0.3;
    g.beginPath(); g.arc(bx - br * 0.3, by - br * 0.3, br * 0.7, Math.PI, Math.PI * 1.7); g.stroke();
  };
  bulletHole(w * 0.245, boardY + boardH * 0.24, w * 0.013);
  bulletHole(w * 0.66, boardY + boardH * 0.8, w * 0.01);

  /* --- 主标题字（琥珀弹道字 + 深浮雕） --- */
  const cx = w * 0.5 + (opt.duck === false ? 0 : w * 0.02);
  toonText(g, 'DUCK SHOOT', cx, boardY + boardH * 0.5, w * 0.115, '#ffc23f', '#100c06', w * 0.018);

  /* --- 缎带副标题（暗红弹孔缎带） --- */
  const ry = boardY + boardH * 0.82;
  g.save();
  g.fillStyle = '#8e2a1c';
  g.beginPath();
  g.moveTo(w * 0.18, ry - h * 0.1);
  g.lineTo(w * 0.82, ry - h * 0.1);
  g.lineTo(w * 0.78, ry + h * 0.1);
  g.lineTo(w * 0.22, ry + h * 0.1);
  g.closePath(); g.fill();
  g.strokeStyle = '#3c0c06'; g.lineWidth = Math.max(2, w * 0.007);
  g.stroke();
  /* 缎带尾翼 */
  g.beginPath();
  g.moveTo(w * 0.18, ry); g.lineTo(w * 0.1, ry - h * 0.06); g.lineTo(w * 0.13, ry + h * 0.08); g.closePath();
  g.moveTo(w * 0.82, ry); g.lineTo(w * 0.9, ry - h * 0.06); g.lineTo(w * 0.87, ry + h * 0.08); g.closePath();
  g.fillStyle = '#6b1c12'; g.fill();
  g.restore();
  toonText(g, 'CARNIVAL', cx, ry + h * 0.055, w * 0.062, '#f5efe2', '#3c0c06', w * 0.011);

  /* --- 吉祥物鸭头（探头 + 眨眼，写实造型） --- */
  if (opt.duck !== false) {
    const bob = Math.sin(t * 2) * h * 0.02;
    const blink = (t % 3.2) > 3.0;
    g.save();
    g.translate(w * 0.845, boardY - h * 0.02 + bob);
    drawDuckHeadIcon(g, 0, 0, h * 0.17, 'mallard', blink ? 'miss' : 'plain');
    g.restore();
  }

  /* --- 金星徽章 --- */
  g.save();
  g.translate(w * 0.11, boardY - h * 0.02);
  g.rotate(Math.sin(t * 1.4) * 0.12);
  g.fillStyle = '#ffc23f';
  g.strokeStyle = '#5f4008'; g.lineWidth = Math.max(2, w * 0.008);
  starPath(g, 0, 0, h * 0.11, h * 0.048);
  g.fill(); g.stroke();
  g.restore();

  g.restore();
  g.restore();
}
