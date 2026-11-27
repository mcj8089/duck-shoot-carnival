/**
 * ============================================================================
 * scene.js —— 暗黑猎鸭沼泽场景（分层视差 + 全程动画）
 * ----------------------------------------------------------------------------
 * 严禁纯色背景/单张静态图。场景由 12+ 独立图层实时绘制并持续动画：
 *   ① 天空渐变（破晓/血色黄昏/暗夜/雷暴四套主题，切换时平滑过渡）
 *   ② 低垂巨日/冷月（大光晕 + 地平线辉光）与星星（夜晚闪烁）+ 流星
 *   ③ 厚重积雨云海（双层视差，多瓣深色云体 + 染色云腹）
 *   ④ 远山锯齿剪影 → 针叶林带 → 枯树群（栖乌鸦）
 *   ⑤ 沼泽水面：横向水带 + 日/月光道反射 + 波光鳞纹 + 芦苇丛倒影
 *   ⑥ 环境生物：鸦群（昼/昏）/ 蝙蝠（夜）/ 磷火（夜）；雷暴雨幕+闪电
 *   ⑦ 漂移浓雾带（多层半透明，缓慢横移）
 *   ⑧ 前景暗色泥岸：摇摆芦苇/香蒲 + 碎石 + 枯枝，鸭子从岸后起飞
 * 所有造型均为多层路径 + 渐变 + 高光阴影的完整造型，整体氛围紧张压抑。
 * ============================================================================
 */
import { W, H, vGradStops, rand, clamp, lerp } from './util.js';

/** 主题查表：天空渐变 / 天体颜色 / 环境暗度 / 云染色 / 水色 */
const THEMES = {
  day:   {
    sky: [['#1c3a52', 0], ['#3a5a72', 0.4], ['#8a6a50', 0.68], ['#e8934a', 0.86], ['#f7c06a', 1]],
    orb: '#ffd9a0', glow: 'rgba(255,170,80,0.5)', horizonGlow: 'rgba(255,150,70,0.4)',
    dark: 0.1, stars: 0, cloud: '#4a4a56', cloudLit: '#e8a060',
    water: ['#3a3026', '#59452e'], hill: '#141a20', forest: '#0e1318',
  },
  dusk:  {
    sky: [['#1a0f22', 0], ['#431634', 0.38], ['#8f2438', 0.62], ['#d8542a', 0.82], ['#ff8a3c', 1]],
    orb: '#ffcf8a', glow: 'rgba(255,110,50,0.55)', horizonGlow: 'rgba(255,90,40,0.5)',
    dark: 0.22, stars: 0.25, cloud: '#3c1e2c', cloudLit: '#ff8a50',
    water: ['#2c1418', '#54231c'], hill: '#100a10', forest: '#0a060c',
  },
  night: {
    sky: [['#05070f', 0], ['#0b1226', 0.45], ['#14203e', 0.75], ['#1e2c4e', 1]],
    orb: '#dfe8f5', glow: 'rgba(180,200,255,0.28)', horizonGlow: 'rgba(120,150,220,0.14)',
    dark: 0.42, stars: 1, cloud: '#0e1524', cloudLit: '#3a4a6a',
    water: ['#080c16', '#14203a'], hill: '#060810', forest: '#04060c',
  },
  storm: {
    sky: [['#10141c', 0], ['#1c2430', 0.4], ['#2a3646', 0.7], ['#3a4a5e', 1]],
    orb: '#aab6c8', glow: 'rgba(180,200,230,0.18)', horizonGlow: 'rgba(160,180,210,0.12)',
    dark: 0.34, stars: 0, cloud: '#1c2430', cloudLit: '#4a5a70',
    water: ['#10161e', '#1e2a38'], hill: '#0c1016', forest: '#080c12',
  },
};

/** 生成一朵厚重积雨云（多瓣 + 平底 + 底部阴影 + 受光边缘） */
function makeCloud(x, y, s, layer) {
  const lobes = [];
  const n = 4 + Math.floor(rand(0, 3));
  for (let i = 0; i < n; i++) {
    lobes.push({ dx: (i - (n - 1) / 2) * 30 * s + rand(-6, 6), r: (24 + rand(0, 16)) * s });
  }
  return { x, y, s, layer, lobes, speed: rand(8, 18) * (layer === 0 ? 0.55 : 1), seed: rand(0, 9) };
}

/** 生成一根香蒲（芦苇棒） */
function makeCattail(x, baseY) {
  return { x, h: rand(52, 96), lean: rand(-0.22, 0.22), p: rand(0, 6), w: rand(3.4, 5), stem: rand(2, 3), head: Math.random() > 0.42 };
}

/** 生成一丛水草叶 */
function makeReed(x, baseY) {
  return { x, h: rand(30, 62), lean: rand(-0.4, 0.4), p: rand(0, 6), w: rand(3, 5.4), tone: Math.random() };
}

export class Scene {
  constructor() {
    this.t = 0;                     // 全局时钟（秒）
    this.theme = 'day';
    this._cur = THEMES.day;         // 当前渲染主题（平滑过渡用）
    this._target = THEMES.day;
    this._mix = 1;                  // 主题过渡进度
    this.wind = 1;                  // 风力系数（wind/storm 关卡 > 1）
    this.windT = 0;                 // 风相位
    this.flash = 0;                 // 闪电白幕强度
    this._boltTimer = rand(3, 6);   // 下次闪电倒计时
    this._bolt = null;              // 当前闪电形状

    /* 云层：远/近两层 */
    this.clouds = [];
    for (let i = 0; i < 5; i++) this.clouds.push(makeCloud(rand(0, W), rand(30, 170), rand(0.8, 1.25), 0));
    for (let i = 0; i < 4; i++) this.clouds.push(makeCloud(rand(0, W), rand(50, 230), rand(1.2, 1.8), 1));

    /* 星星（夜晚）+ 流星 */
    this.stars = [];
    for (let i = 0; i < 60; i++) this.stars.push({ x: rand(0, W), y: rand(0, 360), r: rand(0.7, 2.1), p: rand(0, 6) });
    this.meteor = null; this._meteorT = rand(4, 9);

    /* 环境生物：鸦群 / 蝙蝠 / 磷火 */
    this.crows = [];
    for (let i = 0; i < 4; i++) this.crows.push({ x: rand(0, W), y: rand(120, 300), s: rand(0.55, 0.95), v: rand(22, 40), p: rand(0, 6) });
    this.bats = [];
    for (let i = 0; i < 7; i++) this.bats.push({ x: rand(0, W), y: rand(70, 280), p: rand(0, 6), v: rand(30, 60), ax: rand(30, 70), ay: rand(14, 30) });
    this.embers = [];
    for (let i = 0; i < 14; i++) this.embers.push({ x: rand(40, W - 40), y: rand(300, 620), p: rand(0, 6), v: rand(5, 14), c: Math.random() > 0.4 });

    /* 前景植被（静态分布，摇摆动画） */
    this.reeds = [];
    for (let i = 0; i < 40; i++) this.reeds.push(makeReed(rand(0, W), 0));
    this.cattails = [];
    for (let i = 0; i < 13; i++) this.cattails.push(makeCattail(rand(14, W - 14), 0));
    /* 水中芦苇丛（水面段） */
    this.waterClumps = [];
    for (const cx of [70, 205, 395, 560, 745, 905, 985]) {
      const n = 3 + Math.floor(rand(0, 3));
      for (let i = 0; i < n; i++) {
        this.waterClumps.push({ x: cx + rand(-22, 22), y: 556 + rand(-6, 30), h: rand(26, 52), lean: rand(-0.3, 0.3), p: rand(0, 6) });
      }
    }
    this.rocks = [{ x: 120, y: H - 24, s: 1.15 }, { x: 890, y: H - 38, s: 0.85 }, { x: 470, y: H - 12, s: 0.6 }];
    /* 枯树（中景，带栖鸦位） */
    this.deadTrees = [{ x: 175, y: 500, s: 1.0 }, { x: 945, y: 492, s: 0.8 }];
    /* 雾带 */
    this.fogs = [];
    for (let i = 0; i < 5; i++) {
      this.fogs.push({ x: rand(-200, W), y: rand(470, 640), w: rand(260, 480), h: rand(40, 84), v: rand(6, 16), a: rand(0.08, 0.2) });
    }
  }

  /** 切换主题（1.5s 平滑过渡） */
  setTheme(name) {
    if (!THEMES[name]) name = 'day';
    if (name === this.theme) return;
    this.theme = name;
    this._from = this._cur;
    this._target = THEMES[name];
    this._mix = 0;
  }

  /** 场景更新：云/天体/生物/雾/闪电 */
  update(dt) {
    this.t += dt;
    this.windT += dt * this.wind;
    if (this._mix < 1) this._mix = Math.min(1, this._mix + dt / 1.5);
    this._cur = this._mix >= 1 ? this._target : this._lerpTheme(this._from, this._target, this._mix);

    for (const c of this.clouds) {
      c.x += c.speed * dt * (0.6 + this.wind * 0.55);
      if (c.x - 240 * c.s > W) { c.x = -240 * c.s; c.y = rand(30, 230); }
    }
    for (const b of this.crows) {
      b.x += b.v * dt; b.p += dt * 7;
      if (b.x > W + 50) { b.x = -50; b.y = rand(110, 300); }
    }
    for (const b of this.bats) {
      b.p += dt * 3.1;
      b.x += Math.cos(b.p * 0.8) * b.ax * dt + b.v * dt * 0.25;
      b.y += Math.sin(b.p * 1.9) * b.ay * dt;
      if (b.x > W + 40) b.x = -40;
      if (b.x < -60) b.x = W + 40;
      b.y = clamp(b.y, 40, 330);
    }
    for (const f of this.embers) {
      f.p += dt * 1.7;
      f.x += Math.cos(f.p) * f.v * dt;
      f.y -= (6 + f.v * 0.5) * dt;
      if (f.y < 240) { f.y = rand(520, 650); f.x = rand(40, W - 40); }
    }
    for (const f of this.fogs) {
      f.x += f.v * dt * (0.5 + this.wind * 0.4);
      if (f.x - f.w > W) f.x = -f.w;
    }

    /* 流星（夜晚） */
    this._meteorT -= dt;
    if (!this.meteor && this._meteorT <= 0 && this.theme === 'night') {
      this.meteor = { x: rand(120, W - 200), y: rand(30, 160), vx: rand(380, 560), vy: rand(150, 240), life: 0 };
      this._meteorT = rand(5, 11);
    }
    if (this.meteor) {
      const m = this.meteor;
      m.life += dt; m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.life > 0.9) this.meteor = null;
    }

    /* 雷暴：雨幕常驻（drawFront 处理），闪电周期触发 */
    if (this.theme === 'storm') {
      this.flash = Math.max(0, this.flash - dt * 2.2);
      this._boltTimer -= dt;
      if (this._boltTimer <= 0) {
        this._boltTimer = rand(3.5, 7);
        this.flash = 1;
        this._bolt = this._makeBolt();
      }
    } else this.flash = 0;
  }

  _makeBolt() {
    const pts = []; let x = rand(200, W - 200), y = 0;
    while (y < 320) { pts.push([x, y]); x += rand(-36, 36); y += rand(28, 52); }
    return pts;
  }

  _lerpTheme(a, b, t) {
    const mixHex = (c0, c1, k) => {
      const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const [r0, g0, b0] = p(c0), [r1, g1, b1] = p(c1);
      return `rgb(${(lerp(r0, r1, k)) | 0},${(lerp(g0, g1, k)) | 0},${(lerp(b0, b1, k)) | 0})`;
    };
    const sky = b.sky.map(([, pos], i) => [mixHex(a.sky[i][0], b.sky[i][0], t), pos]);
    return {
      sky, orb: mixHex(a.orb, b.orb, t), glow: a.glow, horizonGlow: a.horizonGlow,
      dark: lerp(a.dark, b.dark, t), stars: lerp(a.stars, b.stars, t),
      cloud: mixHex(a.cloud, b.cloud, t), cloudLit: mixHex(a.cloudLit, b.cloudLit, t),
      water: [mixHex(a.water[0], b.water[0], t), mixHex(a.water[1], b.water[1], t)],
      hill: mixHex(a.hill, b.hill, t), forest: mixHex(a.forest, b.forest, t),
    };
  }

  /* ============================ ① 天空 ============================ */
  drawSky(g) {
    const th = this._cur;
    g.fillStyle = vGradStops(g, 0, 0, H, th.sky);
    g.fillRect(0, 0, W, H);

    /* 地平线辉光 */
    const hg = g.createLinearGradient(0, 380, 0, 600);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.75, th.horizonGlow);
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hg;
    g.fillRect(0, 380, W, 220);

    /* 低垂巨日 / 冷月：大光晕 + 圆面（贴地平线，压迫感） */
    const sx = 806, sy = 428, sr = 58;
    g.save();
    const gl = g.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 4.6);
    gl.addColorStop(0, th.glow); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(sx - sr * 4.6, sy - sr * 4.6, sr * 9.2, sr * 9.2);
    g.fillStyle = th.orb;
    g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
    /* 日面条纹（大气遮挡感） */
    if (this.theme === 'day' || this.theme === 'dusk') {
      g.save();
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.clip();
      g.fillStyle = 'rgba(60,20,10,0.22)';
      for (const [by, bh] of [[-30, 7], [-6, 5], [18, 8], [36, 5]]) {
        g.fillRect(sx - sr, sy + by, sr * 2, bh);
      }
      g.restore();
    }
    if (this.theme === 'night') {   /* 月面阴影坑 */
      g.fillStyle = 'rgba(140,160,200,0.5)';
      g.beginPath(); g.arc(sx - 14, sy - 12, 11, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(sx + 12, sy + 14, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(sx + 2, sy - 20, 5, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    /* 星星（夜晚闪烁） */
    if (th.stars > 0.02) {
      for (const s of this.stars) {
        const tw = 0.55 + 0.45 * Math.sin(this.t * 2.4 + s.p);
        g.globalAlpha = th.stars * tw;
        g.fillStyle = '#eef4ff';
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      /* 流星拖尾 */
      if (this.meteor) {
        const m = this.meteor, fade = 1 - m.life / 0.9;
        g.save();
        g.globalAlpha = fade * th.stars;
        const grad = g.createLinearGradient(m.x, m.y, m.x - m.vx * 0.16, m.y - m.vy * 0.16);
        grad.addColorStop(0, 'rgba(255,255,240,0.95)');
        grad.addColorStop(1, 'rgba(255,255,240,0)');
        g.strokeStyle = grad; g.lineWidth = 2.6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(m.x - m.vx * 0.16, m.y - m.vy * 0.16); g.stroke();
        g.restore();
      }
    }
  }

  /* ============================ ② 云层 ============================ */
  drawClouds(g) {
    const th = this._cur;
    for (const c of this.clouds) this._cloud(g, c, th);
  }
  _cloud(g, c, th) {
    g.save();
    g.translate(c.x, c.y);
    /* 轮廓：底部一条扁椭圆 + 顶部连续鼓包（bezier 圆滑连接，无平顶台阶） */
    const n = c.lobes.length;
    const topPts = c.lobes.map((l) => [l.dx, -l.r * 0.92]);
    const flat = c.lobes[n - 1].dx - c.lobes[0].dx;
    const midY = -c.lobes[0].r * 0.18;
    const outline = () => {
      g.beginPath();
      g.moveTo(c.lobes[0].dx - c.lobes[0].r, midY);
      g.bezierCurveTo(c.lobes[0].dx - c.lobes[0].r, topPts[0][1], c.lobes[0].dx, topPts[0][1], c.lobes[0].dx, topPts[0][1]);
      for (let i = 0; i < n - 1; i++) {
        const [x0, y0] = topPts[i], [x1, y1] = topPts[i + 1];
        g.bezierCurveTo(x0 + (x1 - x0) * 0.4, y0, x0 + (x1 - x0) * 0.6, y1, x1, y1);
      }
      g.bezierCurveTo(c.lobes[n - 1].dx, topPts[n - 1][1], c.lobes[n - 1].dx + c.lobes[n - 1].r, topPts[n - 1][1], c.lobes[n - 1].dx + c.lobes[n - 1].r, midY);
      g.quadraticCurveTo(c.lobes[n - 1].dx + c.lobes[n - 1].r, midY + c.lobes[0].r * 0.42, flat / 2, midY + c.lobes[0].r * 0.46);
      g.quadraticCurveTo(c.lobes[0].dx - c.lobes[0].r, midY + c.lobes[0].r * 0.42, c.lobes[0].dx - c.lobes[0].r, midY);
      g.closePath();
    };
    /* 云腹受光（轮廓上移 3px 的暖/冷色底衬） */
    g.save();
    g.translate(2, -4);
    outline();
    g.fillStyle = th.cloudLit;
    g.globalAlpha = 0.35;
    g.fill();
    g.restore();
    /* 云体 */
    outline();
    g.fillStyle = th.cloud;
    g.fill();
    /* 底部深影（厚重感） */
    g.save();
    g.clip();
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.ellipse(flat / 2, midY + c.lobes[0].r * 0.4, flat / 2 + 30, c.lobes[0].r * 0.36, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.restore();
  }

  /* ============================ ③ 远山 + 林带 ============================ */
  drawHills(g) {
    const th = this._cur;
    /* 主山脊：不规则峰群（曲率坡面，避免纯三角感）——顶点由确定性哈希生成 */
    const ridge = (base, amp, seedK) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * (W + 60) - 30;
        const h = base - amp * (0.35 + 0.65 * Math.abs(Math.sin(i * 2.1 + seedK) * Math.cos(i * 0.9 + seedK * 1.7)));
        pts.push([x, h]);
      }
      return pts;
    };
    const drawRidge = (pts, fill, rim) => {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        g.bezierCurveTo(x0 + (x1 - x0) * 0.3, y0, x0 + (x1 - x0) * 0.7, y1, x1, y1);
      }
      g.lineTo(W + 40, 620); g.lineTo(-40, 620); g.closePath(); g.fill();
      if (rim) {
        g.strokeStyle = rim; g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
          g.bezierCurveTo(x0 + (x1 - x0) * 0.3, y0, x0 + (x1 - x0) * 0.7, y1, x1, y1);
        }
        g.stroke();
      }
    };
    /* 双层山脊：后层略高偏亮，前层近暗 */
    drawRidge(ridge(500, 128, 3.7), th.hill, 'rgba(255,180,110,0.1)');
    drawRidge(ridge(536, 96, 9.2), th.forest, 'rgba(255,170,100,0.05)');
    /* 针叶林带剪影 */
    g.fillStyle = th.forest;
    g.beginPath();
    g.moveTo(-10, 560);
    for (let x = -10; x < W + 20; x += 34) {
      const h = 40 + Math.sin(x * 12.9898) * 14 + ((x * 7919) % 17);
      g.lineTo(x + 15, 560 - h);
      g.lineTo(x + 34, 560 - h * 0.22);
    }
    g.lineTo(W + 20, 600); g.lineTo(-10, 600); g.closePath(); g.fill();
  }

  /* ============================ ④ 中景：枯树 + 水面 ============================ */
  drawMid(g) {
    const th = this._cur;
    this.drawHills(g);
    /* 枯树（山与水之间） */
    for (const dt of this.deadTrees) this._deadTree(g, dt.x, dt.y, dt.s, th);
    /* 沼泽水面 */
    this._water(g, th);
    /* 水中芦苇丛 */
    this._waterClumps(g);
    /* 环境生物 */
    if (this.theme === 'night') this._bats(g);
    else this._crows(g);
    if (this.theme === 'night') this._embers(g);
    /* 栖鸦（枯树顶，剪影） */
    this._perchedCrow(g, 175, 500, 1.0, th);
    this._perchedCrow(g, 945, 492, 0.8, th);
  }

  /** 枯树：虬曲多杈剪影 */
  _deadTree(g, x, y, s, th) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.strokeStyle = th.forest;
    g.lineCap = 'round';
    /* 主干 */
    g.lineWidth = 13;
    g.beginPath();
    g.moveTo(0, 30);
    g.quadraticCurveTo(8, -30, -6, -78);
    g.quadraticCurveTo(-12, -110, -4, -138);
    g.stroke();
    /* 主杈 */
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(-4, -100); g.quadraticCurveTo(26, -128, 44, -152); g.stroke();
    g.beginPath();
    g.moveTo(-6, -120); g.quadraticCurveTo(-34, -142, -48, -170); g.stroke();
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(30, -140); g.quadraticCurveTo(40, -162, 34, -182); g.stroke();
    g.beginPath();
    g.moveTo(-40, -150); g.quadraticCurveTo(-58, -168, -54, -190); g.stroke();
    g.beginPath();
    g.moveTo(-5, -136); g.lineTo(-2, -172); g.stroke();
    g.restore();
  }

  /** 沼泽水面：水带 + 天体光道 + 波光 */
  _water(g, th) {
    const wy0 = 545, wy1 = 640;
    /* 水体渐变 */
    const grad = g.createLinearGradient(0, wy0, 0, wy1);
    grad.addColorStop(0, th.water[0]);
    grad.addColorStop(1, th.water[1]);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, wy0 + 6);
    g.quadraticCurveTo(W * 0.3, wy0 - 5, W * 0.55, wy0 + 3);
    g.quadraticCurveTo(W * 0.8, wy0 + 10, W, wy0 + 2);
    g.lineTo(W, wy1 + 4); g.lineTo(0, wy1 + 4); g.closePath(); g.fill();

    /* 天体光道（竖向碎光带） */
    const sx = 806;
    g.save();
    g.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) {
      const yy = wy0 + 4 + (i / 26) * (wy1 - wy0 - 8);
      const spread = 10 + (i / 26) * 66;
      const jx = Math.sin(this.t * 1.8 + i * 1.7) * (4 + i * 0.8);
      const wSeg = spread * (0.5 + 0.5 * Math.sin(this.t * 2.6 + i * 2.3));
      g.fillStyle = i % 2 ? th.orb : 'rgba(255,255,255,0.35)';
      g.globalAlpha = 0.36 - (i / 26) * 0.2;
      g.fillRect(sx - wSeg / 2 + jx, yy, wSeg, 2.2);
    }
    g.restore();

    /* 全水面鳞波（横向细纹） */
    g.save();
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) {
      const yy = wy0 + 8 + i * 5.6;
      const wob = Math.sin(this.t * 2.2 + i * 1.3) * 10;
      g.beginPath();
      g.moveTo((i * 173) % W - 60, yy);
      g.quadraticCurveTo(W / 2 + wob, yy + 3, W + 60, yy - 2);
      g.stroke();
    }
    g.restore();
  }

  /** 水中芦苇丛（半倒影） */
  _waterClumps(g) {
    for (const r of this.waterClumps) {
      const sway = Math.sin(this.windT * 2.4 + r.p) * (2 + this.wind * 3.4);
      g.strokeStyle = this.theme === 'night' || this.theme === 'storm' ? '#0c1410' : '#1c2a1a';
      g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(r.x, r.y);
      g.quadraticCurveTo(r.x + r.lean * 8, r.y - r.h * 0.55, r.x + r.lean * 14 + sway, r.y - r.h);
      g.stroke();
    }
  }

  /* ============================ ⑤ 环境生物 ============================ */
  /** 飞行乌鸦（双翅扑动剪影） */
  _crows(g) {
    for (const b of this.crows) {
      const flap = Math.sin(b.p) * 0.85;
      g.save();
      g.translate(b.x, b.y + Math.sin(b.p * 0.5) * 7);
      g.scale(b.s, b.s);
      g.fillStyle = '#101318';
      g.beginPath();                      /* 身体 */
      g.ellipse(0, 0, 11, 5, 0.08, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(9, -4, 4.6, 0, Math.PI * 2); g.fill();
      g.beginPath();                      /* 尾羽 */
      g.moveTo(-9, -1); g.lineTo(-19, 3); g.lineTo(-9, 3.6); g.closePath(); g.fill();
      g.beginPath();                      /* 双翅 */
      g.moveTo(-1, -2);
      g.quadraticCurveTo(-10, -10 - flap * 12, -24, -8 - flap * 16);
      g.quadraticCurveTo(-10, -2 - flap * 5, -2, 2);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(0, -2);
      g.quadraticCurveTo(9, -11 - flap * 12, 21, -9 - flap * 15);
      g.quadraticCurveTo(9, -1 - flap * 5, 2, 2.4);
      g.closePath(); g.fill();
      g.fillStyle = '#3a3226';            /* 喙 */
      g.beginPath(); g.moveTo(12.6, -4.6); g.lineTo(18, -3.4); g.lineTo(12.4, -2.2); g.closePath(); g.fill();
      g.restore();
    }
  }
  /** 夜行蝙蝠（急促振翅） */
  _bats(g) {
    for (const b of this.bats) {
      const flap = Math.sin(b.p * 9) * 0.9;
      g.save();
      g.translate(b.x, b.y);
      g.fillStyle = '#0a0c14';
      const s = 0.8;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-6 * s, -6 * s - flap * 6 * s, -13 * s, -3 * s - flap * 9 * s);
      g.quadraticCurveTo(-8 * s, 1 * s, 0, 2.4 * s);
      g.quadraticCurveTo(8 * s, 1 * s, 13 * s, -3 * s - flap * 9 * s);
      g.quadraticCurveTo(6 * s, -6 * s - flap * 6 * s, 0, 0);
      g.closePath(); g.fill();
      g.beginPath(); g.arc(0, -1.4 * s, 2.2 * s, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  /** 水面磷火（冷绿/暖橙浮动光点） */
  _embers(g) {
    for (const f of this.embers) {
      const glow = 0.35 + 0.65 * Math.abs(Math.sin(f.p * 1.6));
      const col = f.c ? '160,255,190' : '255,180,110';
      g.save();
      g.globalAlpha = glow * 0.8;
      const gl = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, 10);
      gl.addColorStop(0, `rgba(${col},0.9)`);
      gl.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gl;
      g.beginPath(); g.arc(f.x, f.y, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(255,255,240,0.9)`;
      g.beginPath(); g.arc(f.x, f.y, 1.6, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  /** 栖枝乌鸦剪影（缩脖+偶尔转头） */
  _perchedCrow(g, x, y, s, th) {
    const turn = Math.sin(this.t * 0.6) > 0.4 ? 1 : 0;
    g.save();
    g.translate(x + (turn ? 4 : -3), y - 172 * s * 0.86);
    g.scale(s, s);
    g.fillStyle = th.forest;
    g.beginPath(); g.ellipse(0, 0, 9, 6, 0.1, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(6, -7, 4.4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(9, -7.6); g.lineTo(15, -6.2); g.lineTo(9, -4.8); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-7, 2); g.lineTo(-16, 6); g.lineTo(-6, 6.4); g.closePath(); g.fill();
    /* 眼点（受光才可见） */
    if (this.theme === 'dusk' || this.theme === 'night') {
      g.fillStyle = this.theme === 'night' ? 'rgba(255,220,120,0.9)' : 'rgba(255,180,90,0.8)';
      g.beginPath(); g.arc(7.4, -8, 1.1, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  /* ============================ ⑥ 前景泥岸 ============================ */
  drawFront(g) {
    const th = this._cur;
    const dark = th.dark;
    /* 泥岸基座（双层，暗棕黑） */
    g.fillStyle = dark > 0.3 ? '#0d0f0a' : '#151a10';
    g.beginPath();
    g.moveTo(0, 640);
    g.quadraticCurveTo(W * 0.25, 608, W * 0.5, 624);
    g.quadraticCurveTo(W * 0.75, 640, W, 620);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    g.fillStyle = dark > 0.3 ? '#080906' : '#0d1109';
    g.beginPath();
    g.moveTo(0, 700);
    g.quadraticCurveTo(W * 0.3, 678, W * 0.6, 694);
    g.quadraticCurveTo(W * 0.85, 704, W, 690);
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();

    /* 岸沿受光边 */
    g.strokeStyle = 'rgba(255,170,90,0.16)';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(0, 640);
    g.quadraticCurveTo(W * 0.25, 608, W * 0.5, 624);
    g.quadraticCurveTo(W * 0.75, 640, W, 620);
    g.stroke();

    /* 芦苇叶（摇摆） */
    for (const b of this.reeds) {
      const sway = Math.sin(this.windT * 2.6 + b.p) * (3 + this.wind * 6) + this.wind * 2;
      const baseY = 648 + (b.x / W) * 8;
      const tone = dark > 0.3 ? (b.tone > 0.5 ? '#161d12' : '#0f140c') : (b.tone > 0.5 ? '#2a3a1e' : '#1c2814');
      g.strokeStyle = tone;
      g.lineWidth = b.w; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(b.x, baseY + 26);
      g.quadraticCurveTo(b.x + b.lean * 10, baseY - b.h * 0.4, b.x + b.lean * 22 + sway, baseY - b.h);
      g.stroke();
    }

    /* 香蒲（茎 + 圆柱穗 + 顶尖芒） */
    for (const c of this.cattails) {
      const sway = Math.sin(this.windT * 2.1 + c.p) * (2.4 + this.wind * 4.5);
      const baseY = 656 + (c.x / W) * 10;
      const tipX = c.x + c.lean * 20 + sway;
      const tipY = baseY - c.h;
      const stemCol = dark > 0.3 ? '#141a10' : '#232f18';
      g.strokeStyle = stemCol; g.lineWidth = c.w; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(c.x, baseY + 22);
      g.quadraticCurveTo(c.x + c.lean * 8, baseY - c.h * 0.5, tipX, tipY);
      g.stroke();
      if (c.head) {
        g.save();
        g.translate(tipX, tipY);
        g.rotate(Math.atan2(sway, c.h) * -0.4);
        /* 穗体（深棕绒质感） */
        const hGrad = g.createLinearGradient(-3.4, 0, 3.4, 0);
        hGrad.addColorStop(0, dark > 0.3 ? '#241a10' : '#4a3418');
        hGrad.addColorStop(0.5, dark > 0.3 ? '#332412' : '#6b4c22');
        hGrad.addColorStop(1, dark > 0.3 ? '#1c140c' : '#3c2a12');
        g.fillStyle = hGrad;
        g.beginPath();
        g.roundRect ? g.roundRect(-3.4, -17, 6.8, 30, 3.4) : g.rect(-3.4, -17, 6.8, 30);
        g.fill();
        /* 顶芒 */
        g.strokeStyle = stemCol; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(0, -17); g.lineTo(1.4, -30); g.stroke();
        g.restore();
      }
    }

    /* 碎石 */
    for (const r of this.rocks) {
      g.save();
      g.translate(r.x, r.y);
      g.scale(r.s, r.s);
      const rGrad = g.createLinearGradient(0, -12, 0, 9);
      rGrad.addColorStop(0, dark > 0.3 ? '#2c3038' : '#4a5058');
      rGrad.addColorStop(1, dark > 0.3 ? '#14161c' : '#232830');
      g.fillStyle = rGrad;
      g.beginPath();
      g.moveTo(-16, 8); g.quadraticCurveTo(-18, -8, -4, -11);
      g.quadraticCurveTo(12, -14, 16, 0); g.quadraticCurveTo(17, 8, 8, 9);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,200,130,0.14)';
      g.beginPath(); g.ellipse(-4, -5, 6, 3.5, -0.4, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    /* 漂移浓雾带 */
    for (const f of this.fogs) {
      const grad = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.w);
      grad.addColorStop(0, `rgba(200,205,215,${f.a})`);
      grad.addColorStop(1, 'rgba(200,205,215,0)');
      g.save();
      g.translate(f.x, f.y);
      g.scale(1, f.h / f.w);
      g.fillStyle = grad;
      g.beginPath(); g.arc(0, 0, f.w, 0, Math.PI * 2); g.fill();
      g.restore();
    }

    /* 雷暴雨幕 */
    if (this.theme === 'storm') this._rain(g);
    /* 闪电白幕 + 闪电路径 */
    if (this.flash > 0.02) {
      g.fillStyle = `rgba(235,242,255,${this.flash * 0.5})`;
      g.fillRect(0, 0, W, H);
      if (this._bolt && this.flash > 0.4) {
        g.save();
        g.strokeStyle = 'rgba(255,255,225,0.95)';
        g.lineWidth = 5; g.lineJoin = 'round';
        g.shadowColor = 'rgba(170,200,255,0.9)'; g.shadowBlur = 24;
        g.beginPath();
        this._bolt.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
        g.stroke();
        g.restore();
      }
    }
    /* 全场环境暗度（夜/黄昏/雷暴） */
    if (dark > 0.01) {
      g.fillStyle = `rgba(8,10,26,${dark})`;
      g.fillRect(0, 0, W, H);
    }
  }
  _rain(g) {
    g.save();
    g.strokeStyle = 'rgba(190,210,240,0.38)';
    g.lineWidth = 1.8; g.lineCap = 'round';
    const t = this.t;
    for (let i = 0; i < 70; i++) {
      const seed = i * 137.5;
      const x = ((seed * 7 + t * 560) % (W + 120)) - 60;
      const y = ((seed * 13 + t * 900) % (H + 80)) - 40;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x - 4, y + 14, x - 7, y + 26);
      g.stroke();
    }
    g.restore();
  }
}
