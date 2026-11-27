/**
 * ============================================================================
 * hud.js —— 画布 HUD 与准星渲染
 * ----------------------------------------------------------------------------
 * 全部 UI 元素均为完整设计样式（木质嘉年华招牌质感），禁止线条勾勒的极简占位：
 *   · 准星：金属双环 + 刻度 + 红心靶点 + 呼吸脉冲；夜晚模式自带聚光灯遮罩
 *   · 得分木牌（左上）：木板 + 双钉 + 卡通描边字
 *   · 生命爱心（右上）：完整爱心造型，损失时灰化弹跳
 *   · 弹药（右下）：完整霰弹壳造型（铜底+红壳+高光）
 *   · 命中记录条（左下）：9 格鸭子头像（绿=命中 红=逃走）
 *   · 奖励时间弧（右下）：沙漏圆弧倒计时
 *   · 波次横幅：彩旗木牌弹出动画；BOSS 血条：红金双层厚血条
 *   · 连击徽章 / 无弹药警示 / 空闲提示
 * ============================================================================
 */
import { W, H, roundRect, toonText, vGrad, clamp, fillRR } from './util.js';
import { drawDuckHeadIcon } from './duck.js';

/* ================================ 准星 ================================ */
/**
 * 绘制准星；夜晚模式先铺黑暗再用 destination-out 挖出聚光区
 * @param {object} s {x,y,visible}
 * @param {object} opt {night:boolean, t:number, flash:number}
 */
export function drawScope(g, s, opt = {}) {
  const t = opt.t || 0;
  const pulse = 1 + Math.sin(t * 4.4) * 0.05;

  if (opt.night) {
    /* 黑暗遮罩 + 聚光（径向渐变挖洞） */
    g.save();
    const dark = g.createRadialGradient(s.x, s.y, 60, s.x, s.y, 330);
    dark.addColorStop(0, 'rgba(6,8,24,0)');
    dark.addColorStop(0.45, 'rgba(6,8,24,0.55)');
    dark.addColorStop(1, 'rgba(6,8,24,0.88)');
    g.fillStyle = dark;
    g.fillRect(0, 0, W, H);
    /* 聚光暖光 */
    const warm = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, 150);
    warm.addColorStop(0, 'rgba(255,240,180,0.16)');
    warm.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = warm;
    g.fillRect(s.x - 150, s.y - 150, 300, 300);
    g.restore();
  }

  if (s.visible === false) return;

  g.save();
  g.translate(s.x, s.y);
  g.scale(pulse, pulse);
  /* 外金属环 */
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = 5;
  g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(40,40,50,0.55)';
  g.lineWidth = 9;
  g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.lineWidth = 3.4;
  g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.stroke();
  /* 刻度四芒 */
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    g.save();
    g.rotate((i * Math.PI) / 2);
    g.beginPath(); g.moveTo(0, -56); g.lineTo(0, -40); g.stroke();
    g.restore();
  }
  /* 内环 */
  g.strokeStyle = 'rgba(255,90,70,0.95)';
  g.lineWidth = 2.6;
  g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.stroke();
  /* 中心靶点 */
  g.fillStyle = 'rgba(232,60,44,0.95)';
  g.beginPath(); g.arc(0, 0, 4.6, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(0, 0, 1.8, 0, Math.PI * 2); g.fill();
  g.restore();
}

/* ============================ 面板基础件 ============================ */
/** 画一块暗钢面板（拉丝金属 + 铆钉 + 琥珀描边） */
function steelPanel(g, x, y, w, h, r = 12) {
  g.save();
  /* 投影 */
  g.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(g, x + 3, y + 5, w, h, r); g.fill();
  /* 板体渐变（拉丝钢） */
  const grad = vGrad(g, x, y, y + h, '#454e5c', '#1c212a');
  g.fillStyle = grad;
  roundRect(g, x, y, w, h, r); g.fill();
  g.strokeStyle = '#0e1116'; g.lineWidth = 3;
  roundRect(g, x, y, w, h, r); g.stroke();
  /* 内圈琥珀描边 */
  g.strokeStyle = 'rgba(255,180,70,0.4)'; g.lineWidth = 1.6;
  roundRect(g, x + 3, y + 3, w - 6, h - 6, r - 3); g.stroke();
  /* 拉丝纹 */
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1.4;
  for (let i = 1; i < 3; i++) {
    g.beginPath();
    g.moveTo(x + 10, y + (h / 3) * i);
    g.quadraticCurveTo(x + w / 2, y + (h / 3) * i + 2, x + w - 10, y + (h / 3) * i);
    g.stroke();
  }
  /* 双铆钉 */
  for (const dx of [14, w - 14]) {
    g.fillStyle = '#8a93a3';
    g.beginPath(); g.arc(x + dx, y + 10, 3.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.arc(x + dx - 0.8, y + 9.2, 1.1, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/* ================================ HUD ================================ */
/**
 * 绘制整幅 HUD
 * @param {object} h HUD 数据：
 *   score, waveText, bullets, maxBullets, lives, maxLives, hitLog[], bonusPct,
 *   streak, noAmmo, boss {name, hp, maxHp}, banner {title, sub, t}, idleHint, t
 */
export function drawHUD(g, h) {
  /* --- 得分钢牌（左上） --- */
  steelPanel(g, 14, 12, 238, 62);
  toonText(g, h.scoreLabel || 'SCORE', 42, 42, 22, '#d9cfae', '#241503', 4);
  g.textAlign = 'right';
  toonText(g, String(h.score ?? 0), 234, 48, 34, '#ffc23f', '#241503', 6);
  g.textAlign = 'left';

  /* --- 波次/关卡钢牌（顶中） --- */
  if (h.waveText) {
    const bw = 190;
    steelPanel(g, W / 2 - bw / 2, 12, bw, 46, 10);
    toonText(g, h.waveText, W / 2, 45, 24, '#ffd98a', '#241503', 4);
  }

  /* --- 生命爱心（右上） --- */
  const hearts = h.lives ?? 4;
  for (let i = 0; i < (h.maxLives ?? 4); i++) {
    drawHeart(g, W - 30 - i * 40, 38, 15, i < hearts);
  }

  /* --- 命中记录条（左下） --- */
  if (h.hitLog && h.hitLog.length) {
    const start = Math.max(0, h.hitLog.length - 9);
    for (let i = start; i < h.hitLog.length; i++) {
      const x = 36 + (i - start) * 46;
      drawDuckHeadIcon(g, x, H - 30, 18, h.hitLog[i].palette, h.hitLog[i].ok ? 'ok' : 'miss');
    }
  }

  /* --- 弹药（右下，霰弹壳） --- */
  const bx0 = W - 34 - (h.maxBullets ?? 3) * 36;
  for (let i = 0; i < (h.maxBullets ?? 3); i++) {
    drawShell(g, bx0 + i * 36, H - 40, i < (h.bullets ?? 0));
  }

  /* --- 奖励时间弧（弹药左侧） --- */
  if (h.bonusPct != null) {
    const cx = bx0 - 56, cy = H - 38;
    g.strokeStyle = 'rgba(60,30,5,0.4)';
    g.lineWidth = 9;
    g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = h.bonusPct > 0.3 ? '#ffcf3f' : '#e84b3c';
    g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(h.bonusPct, 0, 1));
    g.stroke();
    toonText(g, 'BONUS', cx, cy + 4, 13, '#d9cfae', '#241503', 3);
  }

  /* --- 连击徽章 --- */
  if (h.streak >= 2) {
    const s = 1 + Math.sin(h.t * 8) * 0.06;
    g.save();
    g.translate(W / 2, 108);
    g.scale(s, s);
    g.fillStyle = '#c92f1e';
    g.strokeStyle = '#2a0c06'; g.lineWidth = 4;
    roundRect(g, -86, -24, 172, 48, 24); g.fill(); g.stroke();
    toonText(g, `${h.streakLabel || 'COMBO'} X${h.streak}`, 0, 10, 28, '#ffd98a', '#5c1208', 5);
    g.restore();
  }

  /* --- 无弹药警示 --- */
  if (h.noAmmo) {
    const a = 0.55 + 0.45 * Math.sin(h.t * 9);
    g.save();
    g.globalAlpha = a;
    toonText(g, h.noAmmoText || 'NO AMMO!', W / 2, H - 130, 40, '#ff6b5a', '#4a0d06', 7);
    g.restore();
  }

  /* --- 空闲提示（呼吸小字） --- */
  if (h.idleHint) {
    g.save();
    g.globalAlpha = 0.7 + 0.3 * Math.sin(h.t * 3.4);
    toonText(g, h.idleHint, W / 2, 168, 26, '#ffd98a', '#12100a', 5);
    g.restore();
  }

  /* --- BOSS 血条（整体下移，避免遮挡顶部关卡木牌） --- */
  if (h.boss) {
    const bw = 460, bx = W / 2 - bw / 2, by = 92;
    g.fillStyle = 'rgba(6,8,12,0.8)';
    roundRect(g, bx - 6, by - 6, bw + 12, 40, 20); g.fill();
    g.fillStyle = '#2a1210';
    roundRect(g, bx, by, bw, 28, 14); g.fill();
    const pct = clamp(h.boss.hp / h.boss.maxHp, 0, 1);
    if (pct > 0) {
      const grad = g.createLinearGradient(bx, by, bx, by + 28);
      grad.addColorStop(0, '#ff7a5a');
      grad.addColorStop(1, '#c92f1e');
      g.fillStyle = grad;
      roundRect(g, bx + 3, by + 3, (bw - 6) * pct, 22, 11); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(g, bx + 6, by + 5, Math.max(10, (bw - 12) * pct), 7, 4); g.fill();
    }
    g.strokeStyle = '#ffc23f'; g.lineWidth = 3;
    roundRect(g, bx, by, bw, 28, 14); g.stroke();
    toonText(g, h.boss.name, W / 2, by + 45, 21, '#ffc23f', '#241503', 4);
  }

  /* --- 中央横幅（关卡/波次开场弹出牌） --- */
  if (h.banner) drawBanner(g, h.banner);
}

/** 中央横幅：暗钢警示牌弹出 + 副标题 */
function drawBanner(g, b) {
  const k = clamp(b.t / 0.32, 0, 1);
  const out = 1 - clamp((b.dur - b.t) / 0.3, 0, 1);
  const pop = 0.6 + 0.4 * (1 - Math.pow(1 - k, 3));
  const alpha = Math.min(k * 2, out * 2, 1);
  g.save();
  g.globalAlpha = alpha;
  g.translate(W / 2, H / 2 - 60);
  g.scale(pop, pop);
  const w = 560, hh = 130;
  g.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(g, -w / 2 + 6, -hh / 2 + 8, w, hh, 22); g.fill();
  const grad = vGrad(g, 0, -hh / 2, hh / 2, '#454e5c', '#171c24');
  g.fillStyle = grad;
  roundRect(g, -w / 2, -hh / 2, w, hh, 22); g.fill();
  g.strokeStyle = '#0e1116'; g.lineWidth = 5;
  roundRect(g, -w / 2, -hh / 2, w, hh, 22); g.stroke();
  g.strokeStyle = 'rgba(255,180,70,0.5)'; g.lineWidth = 2;
  roundRect(g, -w / 2 + 6, -hh / 2 + 6, w - 12, hh - 12, 16); g.stroke();
  toonText(g, b.title, 0, -2, 44, '#ffc23f', '#241503', 8);
  if (b.sub) toonText(g, b.sub, 0, 42, 25, '#ffd98a', '#241503', 4.5);
  g.restore();
}

/* ============================ 造型小件 ============================ */

/** 完整爱心（满：红渐变+高光；空：灰化凹陷） */
function drawHeart(g, x, y, r, full) {
  g.save();
  g.translate(x, y);
  const beat = full ? 1 + Math.sin(performance.now() / 400 + x) * 0.05 : 1;
  g.scale(beat, beat);
  const grad = full ? vGrad(g, 0, -r, r, '#ff6b5a', '#c92f1e') : vGrad(g, 0, -r, r, '#8f8f8f', '#6a6a6a');
  g.fillStyle = grad;
  g.strokeStyle = full ? '#7c1408' : '#4a4a4a';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, r * 0.85);
  g.bezierCurveTo(-r * 1.3, r * 0.05, -r * 0.85, -r * 0.95, 0, -r * 0.35);
  g.bezierCurveTo(r * 0.85, -r * 0.95, r * 1.3, r * 0.05, 0, r * 0.85);
  g.closePath();
  g.fill(); g.stroke();
  if (full) {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.ellipse(-r * 0.38, -r * 0.34, r * 0.24, r * 0.16, -0.6, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** 完整霰弹壳（铜底 + 红壳 + 高光 + 空壳灰化） */
function drawShell(g, x, y, loaded) {
  g.save();
  g.translate(x, y);
  g.rotate(0.22);
  const w = 16, hh = 34;
  /* 壳体 */
  const grad = loaded ? vGrad(g, 0, -hh / 2, hh / 2, '#e84b3c', '#b02818') : vGrad(g, 0, -hh / 2, hh / 2, '#8f8f8f', '#5f5f5f');
  g.fillStyle = grad;
  roundRect(g, -w / 2, -hh / 2, w, hh, 5); g.fill();
  g.strokeStyle = loaded ? '#6b1408' : '#3c3c3c';
  g.lineWidth = 2.2;
  roundRect(g, -w / 2, -hh / 2, w, hh, 5); g.stroke();
  /* 铜底 */
  g.fillStyle = loaded ? '#e8b83c' : '#8a7a4a';
  roundRect(g, -w / 2 - 1.5, hh / 2 - 8, w + 3, 9, 3); g.fill();
  g.strokeStyle = loaded ? '#8a5c08' : '#4a4020';
  roundRect(g, -w / 2 - 1.5, hh / 2 - 8, w + 3, 9, 3); g.stroke();
  /* 高光 */
  if (loaded) {
    g.fillStyle = 'rgba(255,255,255,0.4)';
    roundRect(g, -w / 2 + 2.6, -hh / 2 + 4, 3.4, hh - 16, 2); g.fill();
  }
  g.restore();
}
