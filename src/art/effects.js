/**
 * ============================================================================
 * effects.js —— 特效系统（发生-存续-消散完整动画过程）
 * ----------------------------------------------------------------------------
 * 粒子/特效清单（全部完整造型，禁止简单图形缩放或颜色闪烁占位）：
 *   · 羽毛爆炸（弯曲羽片带羽轴，旋转+重力+飘落，颜色随鸭子配色）
 *   · 枪口焰（多芒星焰 + 冲击环 + 烟雾团，三段式消散）
 *   · 得分飘字（卡通描边字，上浮回弹 + 渐隐；连击为金色）
 *   · 星星迸溅 / 五彩纸屑（关卡通过庆祝）
 *   · 气球爆裂（橡皮碎片 + 残线） / 落地尘土 / 呱叫音符
 *   · 引导层：呼吸高亮光环 / 指向箭头（完整造型带弹性动画）
 *   · 逃脱警示（红色感叹号标记）
 *   · 雾团（晨雾关卡：大型软雾团漂移）
 * ============================================================================
 */
import { W, H, rand, randInt, toonText, ease, starPath } from './util.js';

export class Effects {
  constructor() {
    this.particles = [];   // 通用粒子（羽毛/烟/星/纸屑/碎片）
    this.popups = [];      // 得分飘字
    this.rings = [];       // 引导光环
    this.arrows = [];      // 指向箭头
    this.marks = [];       // 逃脱警示
    this.notes = [];       // 呱叫音符
    this.fogs = [];        // 雾团
  }

  /* ------------------------- 生成 API ------------------------- */

  /** 羽毛爆炸：color 主题色 + 深浅变化 */
  spawnFeathers(x, y, color, n = 12, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(60, 240) * power;
      this.particles.push({
        kind: 'feather', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        rot: rand(0, Math.PI * 2), vr: rand(-7, 7),
        size: rand(9, 17), color,
        life: 0, ttl: rand(0.9, 1.6), sway: rand(0, 6),
      });
    }
  }

  /** 枪口焰 + 烟 */
  spawnMuzzle(x, y) {
    this.particles.push({ kind: 'muzzle', x, y, life: 0, ttl: 0.16, size: 1 });
    this.particles.push({ kind: 'ring', x, y, life: 0, ttl: 0.3 });
    for (let i = 0; i < 6; i++) {
      const a = rand(-2.4, -0.7);
      this.particles.push({
        kind: 'smoke', x, y,
        vx: Math.cos(a) * rand(40, 130), vy: Math.sin(a) * rand(20, 70),
        size: rand(10, 20), life: 0, ttl: rand(0.5, 0.9),
      });
    }
  }

  /** 得分飘字（金色 = 连击倍数） */
  spawnScore(x, y, text, gold = false, size = 44) {
    this.popups.push({ x: Math.min(Math.max(x, 80), W - 80), y, text, gold, size, life: 0, ttl: 1.15 });
  }

  /** 星星迸溅 */
  spawnStars(x, y, color = '#ffcf3f', n = 8, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
      const sp = rand(120, 260) * power;
      this.particles.push({
        kind: 'star', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        rot: rand(0, 6), vr: rand(-6, 6),
        size: rand(7, 13), color, life: 0, ttl: rand(0.5, 0.9),
      });
    }
  }

  /** 五彩纸屑（庆祝） */
  spawnConfetti(n = 70) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        kind: 'confetti',
        x: rand(0, W), y: rand(-80, -10),
        vx: rand(-30, 30), vy: rand(60, 160),
        rot: rand(0, 6), vr: rand(-8, 8),
        w: rand(8, 15), h: rand(4, 7),
        color: ['#e84b3c', '#ffcf3f', '#4fb2e5', '#66c04b', '#ff8fb3', '#c39bff'][randInt(0, 5)],
        life: 0, ttl: rand(1.8, 3.2),
      });
    }
  }

  /** 气球爆裂：橡皮碎片 */
  spawnBalloonPop(x, y, color) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.particles.push({
        kind: 'shred', x, y,
        vx: Math.cos(a) * rand(90, 200), vy: Math.sin(a) * rand(90, 200),
        rot: rand(0, 6), vr: rand(-9, 9),
        size: rand(6, 11), color, life: 0, ttl: 0.6,
      });
    }
  }

  /** 落地尘土 */
  spawnSplash(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        kind: 'dust', x: x + rand(-16, 16), y,
        vx: rand(-70, 70), vy: rand(-120, -30),
        size: rand(7, 16), color: '#c9b088', life: 0, ttl: rand(0.4, 0.8),
      });
    }
  }

  /** 呱叫音符 */
  spawnNote(x, y) {
    this.notes.push({ x, y, life: 0, ttl: 0.9, side: Math.random() > 0.5 ? 1 : -1 });
  }

  /** 逃脱警示（红色感叹号） */
  spawnMark(x, y) { this.marks.push({ x, y, life: 0, ttl: 1.1 }); }

  /** 引导呼吸光环 */
  spawnRing(x, y, opt = {}) {
    this.rings.push({ x, y, r: opt.r || 46, color: opt.color || '#ffcf3f', life: 0, ttl: opt.ttl || 2.2, follow: opt.follow || null });
  }

  /** 引导箭头（从 from 指向 to 的弹性弧形箭头） */
  spawnArrow(fx, fy, tx, ty, ttl = 2.2) {
    this.arrows.push({ fx, fy, tx, ty, life: 0, ttl });
  }

  /** 雾团（晨雾关卡） */
  initFog(n = 4) {
    this.fogs = [];
    for (let i = 0; i < n; i++) {
      this.fogs.push({ x: rand(0, W), y: rand(180, 480), r: rand(120, 200), vx: rand(-16, 16) || 12, a: rand(0.34, 0.5) });
    }
  }
  clearFog() { this.fogs = []; }

  /* ------------------------- 更新 ------------------------- */
  update(dt) {
    for (const p of this.particles) {
      p.life += dt;
      if (p.kind === 'feather') {
        p.vy += 150 * dt; p.vy = Math.min(p.vy, 90);
        p.vx *= (1 - 1.4 * dt);
        p.x += p.vx * dt + Math.sin(p.life * 7 + p.sway) * 34 * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt + Math.sin(p.life * 5) * 2 * dt;
      } else if (p.kind === 'smoke' || p.kind === 'dust') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.kind === 'dust' ? 260 : -40) * dt;
        p.size += 26 * dt;
      } else if (p.kind === 'star' || p.kind === 'shred' || p.kind === 'confetti') {
        p.vy += (p.kind === 'confetti' ? 60 : 320) * dt;
        if (p.kind === 'confetti') { p.vx += Math.sin(p.life * 6 + p.rot) * 40 * dt; p.vy = Math.min(p.vy, 150); }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      } else if (p.kind === 'muzzle') {
        p.size = 1 + p.life / p.ttl * 1.6;
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.ttl);

    for (const s of this.popups) { s.life += dt; s.y -= 46 * dt * ease.outQuad(Math.min(1, s.life * 2)); }
    this.popups = this.popups.filter((s) => s.life < s.ttl);

    for (const r of this.rings) { r.life += dt; if (r.follow) { r.x = r.follow.x; r.y = r.follow.y; } }
    this.rings = this.rings.filter((r) => r.life < r.ttl);

    for (const a of this.arrows) a.life += dt;
    this.arrows = this.arrows.filter((a) => a.life < a.ttl);

    for (const m of this.marks) { m.life += dt; m.y -= 30 * dt; }
    this.marks = this.marks.filter((m) => m.life < m.ttl);

    for (const n of this.notes) { n.life += dt; n.y -= 60 * dt; n.x += Math.sin(n.life * 8) * 22 * dt * n.side; }
    this.notes = this.notes.filter((n) => n.life < n.ttl);

    for (const f of this.fogs) {
      f.x += f.vx * dt;
      if (f.vx > 0 && f.x - f.r > W) f.x = -f.r;
      if (f.vx < 0 && f.x + f.r < 0) f.x = W + f.r;
    }
  }

  /* ------------------------- 绘制 ------------------------- */
  /** 背层（鸭子身后）：烟雾、尘土 */
  drawBack(g) {
    for (const p of this.particles) {
      if (p.kind !== 'smoke' && p.kind !== 'dust') continue;
      const k = p.life / p.ttl;
      g.globalAlpha = (1 - k) * 0.5;
      g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }

  /** 前层（鸭子身前）：枪口焰/羽毛/星星/纸屑/碎片/飘字/音符/警示 */
  drawFront(g) {
    /* 枪口焰（多芒星焰） */
    for (const p of this.particles) {
      if (p.kind !== 'muzzle') continue;
      const k = p.life / p.ttl;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(rand(0, 0.4));
      g.globalAlpha = 1 - k;
      const R = 54 * p.size * (1 - k * 0.3);
      const grad = g.createRadialGradient(0, 0, 4, 0, 0, R);
      grad.addColorStop(0, '#fff8d0');
      grad.addColorStop(0.45, '#ffcf3f');
      grad.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = grad;
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rr = i % 2 === 0 ? R : R * 0.42;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.closePath(); g.fill();
      g.restore();
    }
    /* 冲击环 */
    for (const p of this.particles) {
      if (p.kind !== 'ring') continue;
      const k = p.life / p.ttl;
      g.globalAlpha = (1 - k) * 0.8;
      g.strokeStyle = 'rgba(255,240,180,0.9)';
      g.lineWidth = 5 * (1 - k) + 1;
      g.beginPath(); g.arc(p.x, p.y, 20 + k * 90, 0, Math.PI * 2); g.stroke();
    }
    /* 羽毛（弯曲羽片：羽轴 + 双侧羽枝） */
    for (const p of this.particles) {
      if (p.kind !== 'feather') continue;
      const k = p.life / p.ttl;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
      const s = p.size;
      g.fillStyle = p.color;
      g.beginPath();
      g.moveTo(0, -s);
      g.quadraticCurveTo(s * 0.72, -s * 0.4, s * 0.16, s);
      g.quadraticCurveTo(-s * 0.5, s * 0.4, 0, -s);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -s * 0.85); g.quadraticCurveTo(s * 0.12, 0, s * 0.14, s * 0.9); g.stroke();
      g.restore();
    }
    /* 星星 / 纸屑 / 碎片 */
    for (const p of this.particles) {
      if (p.kind === 'star') {
        const k = p.life / p.ttl;
        g.save();
        g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalAlpha = 1 - k;
        g.fillStyle = p.color;
        starPath(g, 0, 0, p.size, p.size * 0.44);
        g.fill();
        g.restore();
      } else if (p.kind === 'confetti') {
        g.save();
        g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalAlpha = p.life > p.ttl - 0.4 ? (p.ttl - p.life) / 0.4 : 1;
        g.fillStyle = p.color;
        g.beginPath();
        g.ellipse(0, 0, p.w / 2 * (1 + Math.sin(p.life * 9) * 0.6), p.h / 2, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      } else if (p.kind === 'shred') {
        g.save();
        g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalAlpha = 1 - p.life / p.ttl;
        g.fillStyle = p.color;
        g.beginPath();
        g.moveTo(-p.size, 0);
        g.quadraticCurveTo(0, -p.size * 0.8, p.size, 0);
        g.quadraticCurveTo(0, p.size * 0.5, -p.size, 0);
        g.fill();
        g.restore();
      }
    }
    g.globalAlpha = 1;

    /* 呱叫音符（带符干的完整音符造型） */
    for (const n of this.notes) {
      const k = n.life / n.ttl;
      g.save();
      g.translate(n.x, n.y);
      g.rotate(Math.sin(n.life * 6) * 0.2 * n.side);
      g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      g.fillStyle = '#5a3a18';
      g.beginPath(); g.ellipse(0, 0, 7, 5.2, -0.4, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#5a3a18'; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(6, -1.5); g.quadraticCurveTo(9, -10, 6, -17); g.stroke();
      g.beginPath(); g.moveTo(6, -17); g.quadraticCurveTo(11, -15, 12, -11); g.stroke();
      g.restore();
    }

    /* 得分飘字 */
    for (const s of this.popups) {
      const k = s.life / s.ttl;
      const pop = s.life < 0.18 ? ease.outBack(s.life / 0.18) : 1;
      g.save();
      g.translate(s.x, s.y);
      g.scale(pop, pop);
      g.globalAlpha = k > 0.72 ? (1 - k) / 0.28 : 1;
      toonText(g, s.text, 0, 0, s.size, s.gold ? '#ffcf3f' : '#ffffff', s.gold ? '#8a5c08' : '#3c2410', s.size / 5.2);
      g.restore();
    }
    g.globalAlpha = 1;

    /* 逃脱警示（红色感叹号：圆底 + 感叹号 + 脉冲） */
    for (const m of this.marks) {
      const k = m.life / m.ttl;
      const pulse = 1 + Math.sin(m.life * 14) * 0.12;
      g.save();
      g.translate(m.x, m.y);
      g.scale(pulse, pulse);
      g.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      g.fillStyle = '#e84b3c';
      g.strokeStyle = '#ffffff'; g.lineWidth = 3.4;
      g.beginPath(); g.arc(0, 0, 21, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.roundRect ? g.roundRect(-4, -12, 8, 14, 4) : g.rect(-4, -12, 8, 14);
      g.fill();
      g.beginPath(); g.arc(0, 8.5, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.globalAlpha = 1;

    /* 引导呼吸光环 */
    for (const r of this.rings) {
      const pulse = 0.82 + 0.18 * Math.sin(r.life * 5.5);
      g.save();
      g.globalAlpha = 0.75 * Math.min(1, (r.ttl - r.life) * 2);
      g.strokeStyle = r.color;
      g.lineWidth = 5;
      g.beginPath(); g.arc(r.x, r.y, r.r * pulse, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 0.28 * Math.min(1, (r.ttl - r.life) * 2);
      g.lineWidth = 11;
      g.beginPath(); g.arc(r.x, r.y, r.r * pulse, 0, Math.PI * 2); g.stroke();
      g.restore();
    }

    /* 指向箭头（弹性弧线 + 完整箭头造型） */
    for (const a of this.arrows) {
      const k = a.life / a.ttl;
      const bob = Math.sin(a.life * 6) * 7;
      g.save();
      g.globalAlpha = Math.min(1, (a.ttl - a.life) * 3);
      const mx = (a.fx + a.tx) / 2, my = (a.fy + a.ty) / 2 - 60 + bob;
      g.strokeStyle = '#ffcf3f'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(a.fx, a.fy);
      g.quadraticCurveTo(mx, my, a.tx, a.ty - 34);
      g.stroke();
      /* 箭头头部（三角形完整造型，指向目标） */
      const ang = Math.atan2(a.ty - 34 - my, a.tx - mx);
      g.save();
      g.translate(a.tx, a.ty - 34 + bob * 0.3);
      g.rotate(ang);
      g.fillStyle = '#ffcf3f';
      g.strokeStyle = '#8a5c08'; g.lineWidth = 3;
      g.beginPath();
      g.moveTo(16, 0); g.lineTo(-10, -13); g.quadraticCurveTo(-4, 0, -10, 13);
      g.closePath(); g.fill(); g.stroke();
      g.restore();
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /** 雾层（ duck 层之上再盖一层雾） */
  drawFog(g) {
    for (const f of this.fogs) {
      const grad = g.createRadialGradient(f.x, f.y, f.r * 0.2, f.x, f.y, f.r);
      grad.addColorStop(0, `rgba(235,240,246,${f.a})`);
      grad.addColorStop(1, 'rgba(235,240,246,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.fill();
    }
  }

  clear() {
    this.particles = []; this.popups = []; this.rings = [];
    this.arrows = []; this.marks = []; this.notes = []; this.fogs = [];
  }
}
