/**
 * ============================================================================
 * duck.js —— 写实鸭子角色造型库（飞羽质感 · 侧飞姿态）
 * ----------------------------------------------------------------------------
 * 每只鸭子均为「写实侧飞姿态」：流线躯干 + 分层覆羽/飞羽 + 镜羽 + 真实头颈比例，
 * 无卡通描边，靠深浅渐变 + 羽纹理 + 边缘光塑形。结构分层：
 *   尾羽 → 远侧翅 → 躯干（覆羽鳞纹 + 腹部暗面）→ 近侧翅（扇翅动画，飞羽分指）→
 *   颈/头（真实比例）→ 喙（扁长喙片 + 甲尖）→ 眼（琥珀虹膜 + 眨眼/眩晕）。
 * 配色（palette，键名兼容旧逻辑）：yellow=棕羽母鸭 / mallard=绿头鸭(镜羽) /
 *   red=红头潜鸭 / teal=绿翅鸭 / golden=金羽鸭(3倍分) / clown=暗帽鸭 / goose=
 *   灰雁男爵(BOSS1) / ringmaster=暗夜马戏领班(BOSS3)。均写实羽色。
 * 装扮（accessories）：气球 / 钢制半面具 / 军盔 / 大礼帽 / 单片镜 / 勋章 /
 *   金扣弱点 / 三铃弱点 / 愤怒眉毛 —— 均完整造型。
 * 导出：drawDuck(整只鸭子)、drawDuckHeadIcon(头像图标，HUD 用)。
 * ============================================================================
 */
import { starPath } from './util.js';

/** 配色表：body 主羽 / body2 渐变底 / belly 腹羽 / wing 覆羽 / wing2 飞羽 /
 *  beak 喙 / beakTip 甲尖 / speculum 镜羽(可选) / head 头部(可选) / ring 颈环(可选) */
export const PALETTES = {
  yellow:     { body: '#9a7a50', body2: '#6b5233', belly: '#c4a87c', wing: '#7a5f3c', wing2: '#4e3c24', beak: '#c9954a', beakTip: '#8a6224', outline: '#33261a', head: '#8a6c44', headLit: '#a88a5c', rim: 'rgba(255,214,150,0.4)' },
  mallard:    { body: '#b3ab97', body2: '#8a8270', belly: '#d3ccb8', wing: '#9c947e', wing2: '#5c5544', beak: '#d8bc50', beakTip: '#5a4a20', outline: '#2c2414', head: '#2e7040', headLit: '#58a468', ring: '#efe9dc', breast: '#8a4a2e', speculum: '#3f5ea8', rim: 'rgba(255,255,255,0.3)' },
  red:        { body: '#b06a48', body2: '#83452c', belly: '#d09c7c', wing: '#9c5638', wing2: '#64301e', beak: '#6a86a2', beakTip: '#2c3a4e', outline: '#331c12', head: '#9e4a2c', headLit: '#c46a44', rim: 'rgba(255,200,150,0.35)' },
  teal:       { body: '#9aa4a6', body2: '#6e787c', belly: '#c2ccce', wing: '#848e90', wing2: '#4e565a', beak: '#4e5c62', beakTip: '#232a2e', outline: '#1c2226', head: '#3a4a50', headLit: '#54666e', crest: '#2c8a52', speculum: '#2e8a5c', rim: 'rgba(220,240,240,0.3)' },
  golden:     { body: '#e8bc48', body2: '#b8821a', belly: '#ffdf8c', wing: '#d8a52e', wing2: '#8f6210', beak: '#d89a2c', beakTip: '#7c520a', outline: '#4e3406', head: '#e8bc48', headLit: '#ffe08a', metallic: true, rim: 'rgba(255,240,180,0.55)' },
  clown:      { body: '#8a8274', body2: '#5f5a4e', belly: '#b3ac9c', wing: '#6e685a', wing2: '#443f34', beak: '#a89448', beakTip: '#4e4420', outline: '#26221a', head: '#3c3830', headLit: '#5a5448', rim: 'rgba(230,230,220,0.28)' },
  goose:      { body: '#a8a094', body2: '#7a7468', belly: '#ccc6b8', wing: '#8f887a', wing2: '#585248', beak: '#e8a04c', beakTip: '#7a4416', outline: '#33302a', head: '#8f887a', headLit: '#b3ac9e', rim: 'rgba(255,250,235,0.3)' },
  ringmaster: { body: '#443a52', body2: '#2c2438', belly: '#5f5470', wing: '#383048', wing2: '#1e182c', beak: '#c9a04a', beakTip: '#5f4410', outline: '#120e1c', head: '#342c44', headLit: '#544868', rim: 'rgba(190,160,255,0.3)' },
};

/**
 * 绘制一只完整的鸭子（写实侧飞）
 * @param {CanvasRenderingContext2D} g
 * @param {object} d 参数：x,y,scale,dir(1右/-1左),palette,wingPhase,state('fly'|'hit'|'fall'),
 *   rotation,beakOpen,blink,dizzy,squash,acc:{balloon:{color,phase},mask,hat,glasses,medal,buckle,bells,angry},sparkle,alpha,t
 */
export function drawDuck(g, d) {
  const P = PALETTES[d.palette] || PALETTES.yellow;
  const s = d.scale || 1;
  const wingA = d.state === 'hit' ? -1.15 : Math.sin((d.wingPhase || 0) * Math.PI * 2) * 0.85 - 0.1;
  const headCol = P.head || P.body;

  g.save();
  g.translate(d.x, d.y);
  g.rotate(d.rotation || 0);
  g.scale(s * (d.dir || 1), s);
  if (d.squashY) g.scale(2 - d.squashY, d.squashY);   /* 中弹挤压：Y 压扁、X 微鼓 */
  g.globalAlpha = d.alpha != null ? d.alpha : 1;
  g.lineJoin = 'round';

  /* ---------- 气球（在身后，先画） ---------- */
  if (d.acc && d.acc.balloon) drawBalloon(g, d.acc.balloon);

  /* ---------- 尾羽（收拢的尖尾） ---------- */
  g.fillStyle = P.wing2;
  g.beginPath();
  g.moveTo(-42, -12);
  g.quadraticCurveTo(-64, -14, -70, -2);
  g.quadraticCurveTo(-64, 8, -44, 10);
  g.closePath();
  g.fill();
  g.fillStyle = P.wing;
  g.beginPath();
  g.moveTo(-40, -10);
  g.quadraticCurveTo(-56, -10, -62, -2);
  g.quadraticCurveTo(-54, 2, -40, 2);
  g.closePath();
  g.fill();

  /* ---------- 远侧翅（折收，在躯干后，偏暗） ---------- */
  drawWing(g, P, wingA * 0.45, false, 0.55, 0.72);

  /* ---------- 躯干（流线渐变 + 覆羽鳞纹） ---------- */
  const bodyGrad = g.createLinearGradient(0, -30, 0, 34);
  bodyGrad.addColorStop(0, P.body);
  bodyGrad.addColorStop(0.62, mix(P.body, P.body2, 0.55));
  bodyGrad.addColorStop(1, P.body2);
  g.fillStyle = bodyGrad;
  g.beginPath();
  g.moveTo(44, -8);                       /* 胸前 */
  g.quadraticCurveTo(50, 18, 28, 30);     /* 胸腹弧 */
  g.quadraticCurveTo(0, 40, -28, 30);     /* 腹底 */
  g.quadraticCurveTo(-52, 20, -56, -2);   /* 后部 */
  g.quadraticCurveTo(-54, -20, -30, -26); /* 背部 */
  g.quadraticCurveTo(8, -34, 34, -22);    /* 背上 */
  g.quadraticCurveTo(46, -16, 44, -8);
  g.closePath();
  g.fill();

  /* 腹部暗面 */
  g.fillStyle = 'rgba(20,12,6,0.22)';
  g.beginPath();
  g.moveTo(30, 14);
  g.quadraticCurveTo(8, 32, -24, 26);
  g.quadraticCurveTo(-40, 20, -46, 10);
  g.quadraticCurveTo(-18, 22, 6, 16);
  g.quadraticCurveTo(22, 12, 30, 14);
  g.closePath();
  g.fill();

  /* 背部受光（窄条沿背线，避免似破洞的高光斑） */
  g.fillStyle = 'rgba(255,255,255,0.1)';
  g.beginPath();
  g.ellipse(-8, -27, 20, 4.2, -0.12, 0, Math.PI * 2);
  g.fill();

  /* 覆羽鳞纹（三排扇形羽缘） */
  g.strokeStyle = 'rgba(20,12,4,0.3)';
  g.lineWidth = 1.8;
  for (let row = 0; row < 3; row++) {
    const ry = -6 + row * 10;
    for (let i = 0; i < 6; i++) {
      const fx = -38 + i * 13;
      g.beginPath();
      g.arc(fx + 5, ry, 6.5, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
  }

  /* 胸部栗色块（真实羽区） */
  if (P.breast) {
    g.fillStyle = P.breast;
    g.beginPath();
    g.moveTo(44, -6);
    g.quadraticCurveTo(50, 10, 40, 20);
    g.quadraticCurveTo(26, 18, 22, 2);
    g.quadraticCurveTo(30, -10, 44, -6);
    g.closePath();
    g.fill();
  }

  /* 镜羽（翼上色斑，真实鸭种特征） */
  if (P.speculum) {
    g.save();
    g.translate(-8, 2);
    g.rotate(-0.18);
    g.fillStyle = P.speculum;
    g.beginPath();
    g.roundRect ? g.roundRect(-16, -4, 26, 9, 4) : g.rect(-16, -4, 26, 9);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(-18, -5.5, 26, 2);
    g.fillRect(-18, 5.5, 26, 2);
    g.restore();
  }

  drawBodyAcc(g, d);       /* 金扣 / 勋章 / 三铃（躯干配件） */
  drawHead(g, P, d, headCol);  /* 颈 / 头 / 喙 / 眼 / 面具 / 帽 / 单片镜 */

  /* ---------- 近侧翅（后画在上层，扇翅 + 飞羽分指） ---------- */
  drawWing(g, P, wingA, d.state === 'hit', 0, 1);

  /* ---------- 金鸭闪星 ---------- */
  if (d.sparkle) drawSparkles(g, d.t || 0);

  /* ---------- 脚（坠落时收拢的橙蹼） ---------- */
  if (d.state === 'fall') {
    g.fillStyle = '#d8842c';
    for (const fx of [6, 20]) {
      g.save();
      g.translate(fx, 26);
      g.rotate(0.5);
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(3, 12);
      for (let i = -1; i <= 1; i++) { g.lineTo(3 + i * 4 + 2.6, 13); g.lineTo(3 + i * 4, 10); }
      g.closePath(); g.fill();
      g.restore();
    }
  }

  g.restore();
}

/* ============================ 躯干配件（弱点/勋章/铃铛） ============================ */
function drawBodyAcc(g, d) {
  const acc = d.acc;
  if (!acc) return;

  /* 弱点金扣（BOSS baron 肚皮） */
  if (acc.buckle) {
    const pulse = 0.75 + 0.25 * Math.sin((d.t || 0) * 5);
    g.save();
    g.translate(18, 8);
    g.fillStyle = '#e8b02c';
    g.strokeStyle = '#6b4408'; g.lineWidth = 2.6;
    g.beginPath();
    g.roundRect ? g.roundRect(-12, -9, 24, 18, 5) : g.rect(-12, -9, 24, 18);
    g.fill(); g.stroke();
    g.fillStyle = '#8f5a20';
    g.fillRect(-3, -5, 6, 10);
    g.globalAlpha = 0.55 * pulse;
    g.strokeStyle = '#ffe08a'; g.lineWidth = 3.6;
    g.beginPath(); g.arc(0, 0, 20 + pulse * 3, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  /* 勋章（BOSS major 胸口） */
  if (acc.medal) {
    g.save();
    g.translate(28, -6);
    g.fillStyle = '#4a86c8';
    g.beginPath();
    g.moveTo(-8, -12); g.lineTo(8, -6); g.lineTo(2, 6); g.closePath(); g.fill();
    g.fillStyle = '#e8b02c';
    starPath(g, 0, 14, 9, 4.2);
    g.fill();
    g.strokeStyle = '#6b4408'; g.lineWidth = 2;
    g.stroke();
    g.restore();
  }

  /* 三铃弱点（BOSS quacker 脖颈） */
  if (acc.bells) {
    const bells = acc.bells;
    for (let i = 0; i < 3; i++) {
      g.save();
      g.translate(-2 + i * 15, 26 - Math.abs(i - 1) * 6);
      const alive = bells[i];
      if (alive && bells.active === i) {
        const pulse = 0.7 + 0.3 * Math.sin((d.t || 0) * 6);
        g.globalAlpha = 0.55 * pulse;
        g.strokeStyle = '#ffe08a'; g.lineWidth = 5;
        g.beginPath(); g.arc(0, 0, 14 + pulse * 3, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 1;
      }
      g.fillStyle = alive ? '#d8a42c' : '#6a6a6a';
      g.strokeStyle = '#3a2a08'; g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(-7, -6); g.quadraticCurveTo(-9, 6, 0, 8); g.quadraticCurveTo(9, 6, 7, -6);
      g.quadraticCurveTo(0, -12, -7, -6);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = alive ? '#5f4008' : '#404040';
      g.beginPath(); g.arc(0, 9.5, 2.6, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
}

/* ============================ 头颈 / 喙 / 眼 / 头部装扮 ============================ */
function drawHead(g, P, d, headCol) {
  const acc = d.acc;
  const hy = -44;

  /* 颈（前伸长颈，根部宽入胸背，避免衔接缝隙） */
  g.fillStyle = mix(headCol, P.body2, 0.25);
  g.beginPath();
  g.moveTo(20, -6);
  g.quadraticCurveTo(24, -28, 28, hy + 13);
  g.lineTo(50, hy + 13);
  g.quadraticCurveTo(50, -26, 44, -4);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.beginPath();
  g.ellipse(37, hy + 14, 8, 5, 0.1, 0, Math.PI * 2);
  g.fill();
  /* 颈环（绿头鸭白环） */
  if (P.ring) {
    g.fillStyle = P.ring;
    g.beginPath();
    g.ellipse(32, hy + 14, 8.5, 3, -0.14, 0, Math.PI * 2);
    g.fill();
  }

  /* 头（顶部受光 + 底部暗面 + 虹彩高光） */
  const headGrad = g.createLinearGradient(0, hy - 16, 0, hy + 16);
  headGrad.addColorStop(0, P.headLit || lighten(headCol));
  headGrad.addColorStop(0.55, headCol);
  headGrad.addColorStop(1, mix(headCol, '#101418', 0.35));
  g.fillStyle = headGrad;
  g.beginPath();
  g.ellipse(38, hy, 15.5, 14, 0.06, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath(); g.ellipse(38, hy, 15.5, 14, 0.06, 0, Math.PI * 2); g.clip();
  g.globalAlpha = 0.3;
  g.fillStyle = P.headLit || '#ffffff';
  g.beginPath(); g.ellipse(34, hy - 6, 11, 4, -0.5, 0, Math.PI * 2); g.fill();
  g.restore();
  /* 头顶细冠羽（凤头种） */
  if (P.crest) {
    g.fillStyle = P.crest;
    g.beginPath();
    g.moveTo(34, hy - 13);
    g.quadraticCurveTo(30, hy - 22, 40, hy - 20);
    g.quadraticCurveTo(36, hy - 26, 46, hy - 19);
    g.quadraticCurveTo(44, hy - 14, 42, hy - 12);
    g.closePath();
    g.fill();
  }

  /* 喙 */
  drawBeak(g, P, hy, d.beakOpen || 0);

  /* 眼 */
  drawEye(g, P, hy, d);

  /* 愤怒眉毛 */
  if (acc && acc.angry) {
    g.strokeStyle = '#1a1208'; g.lineWidth = 3.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(28, hy - 10); g.lineTo(46, hy - 4); g.stroke();
  }

  /* 钢制半面具（armored 鸭：第一枪打掉） */
  if (acc && acc.mask) {
    g.save();
    g.translate(38, hy);
    const mGrad = g.createLinearGradient(0, -14, 0, 14);
    mGrad.addColorStop(0, '#c8cdd6');
    mGrad.addColorStop(0.5, '#8a919e');
    mGrad.addColorStop(1, '#4e545e');
    g.fillStyle = mGrad;
    g.beginPath();
    g.moveTo(-15, -12);
    g.quadraticCurveTo(0, -19, 15, -11);
    g.quadraticCurveTo(19, 0, 13, 10);
    g.quadraticCurveTo(0, 17, -13, 9);
    g.quadraticCurveTo(-19, -1, -15, -12);
    g.closePath(); g.fill();
    g.strokeStyle = '#2a2e36'; g.lineWidth = 2.4; g.stroke();
    g.fillStyle = '#12141a';
    g.beginPath();
    g.roundRect ? g.roundRect(-9, -6, 9, 3.6, 1.8) : g.rect(-9, -6, 9, 3.6);
    g.fill();
    g.beginPath();
    g.roundRect ? g.roundRect(2, -6, 9, 3.6, 1.8) : g.rect(2, -6, 9, 3.6);
    g.fill();
    g.fillStyle = '#d8dde6';
    for (const [rx, ry] of [[-13, -8], [0, -15], [13, -7]]) {
      g.beginPath(); g.arc(rx, ry, 1.8, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-12, -12); g.quadraticCurveTo(0, -16, 12, -10); g.stroke();
    g.restore();
  }

  /* 单片镜 */
  if (acc && acc.glasses === 'monocle') {
    g.strokeStyle = '#c9a84a'; g.lineWidth = 2.6;
    g.beginPath(); g.arc(40, hy - 1, 9, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(47, hy + 5); g.quadraticCurveTo(52, hy + 14, 48, hy + 22); g.stroke();
  }

  /* 帽子 */
  if (acc && acc.hat === 'tophat') drawTophat(g, hy);
  if (acc && acc.hat === 'helmet') drawHelmet(g, P, hy);
}

/* ============================ 翅膀 ============================ */
/**
 * 写实飞羽翅膀（覆羽层 + 分指 primaries）
 * @param {number} ang 扇动角
 * @param {boolean} hurt 中弹上翻
 * @param {number} back 层间偏移（远侧翅 >0）
 * @param {number} depth 明度倍率（远侧 0.72 暗）
 */
function drawWing(g, P, ang, hurt, back = 0, depth = 1) {
  g.save();
  g.translate(-4 + back * 8, -4 + back * 4);
  g.rotate(ang * (1 - Math.min(0.4, Math.abs(back) * 0.4)) + back * 0.25);

  const dim = (c) => mix(c, '#141008', (1 - depth) * 0.85);
  const grad = g.createLinearGradient(0, -12, 0, 34);
  grad.addColorStop(0, dim(P.wing));
  grad.addColorStop(1, dim(P.wing2));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(6, -6);
  g.quadraticCurveTo(-24, 2 + back * 4, -46, 24);
  g.quadraticCurveTo(-30, 36, -8, 32);
  g.quadraticCurveTo(12, 26, 14, 4);
  g.closePath();
  g.fill();

  /* 覆羽鳞纹 */
  g.strokeStyle = 'rgba(15,10,4,0.32)';
  g.lineWidth = 1.7;
  for (let row = 0; row < 2; row++) {
    const ry = 4 + row * 8;
    for (let i = 0; i < 4; i++) {
      const fx = -30 + i * 9;
      g.beginPath();
      g.arc(fx + 4, ry, 4.6, Math.PI * 0.12, Math.PI * 0.88);
      g.stroke();
    }
  }

  /* 飞羽 primaries（4 根分指长羽） */
  const spread = 1 + Math.max(0, -ang) * 0.4;
  for (let i = 0; i < 4; i++) {
    const fa = -0.55 - i * 0.22 * spread;
    const fl = 26 - i * 3;
    g.save();
    g.translate(-40, 22 + i * 1.6);
    g.rotate(fa);
    g.fillStyle = dim(i % 2 ? P.wing2 : mix(P.wing2, '#0c0a06', 0.3));
    g.beginPath();
    g.moveTo(0, -2.6);
    g.quadraticCurveTo(-fl * 0.55, -4, -fl, -1);
    g.quadraticCurveTo(-fl * 0.6, 3.4, 0, 2.6);
    g.closePath();
    g.fill();
    g.restore();
  }

  /* 翼上受光边 */
  g.strokeStyle = 'rgba(255,255,255,0.14)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(8, -4);
  g.quadraticCurveTo(-16, 4, -36, 20);
  g.stroke();

  if (hurt) {
    g.strokeStyle = 'rgba(40,30,16,0.6)'; g.lineWidth = 2.6;
    g.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.25) {
      const r = 4 + a * 2.6;
      const px = -44 + Math.cos(a) * r, py = -28 + Math.sin(a) * r * 0.6;
      a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.stroke();
  }
  g.restore();
}

/* ============================ 喙 / 眼 ============================ */

/** 喙：扁长鸭喙（上喙片 + 下喙片 + 甲尖 + 鼻孔），open 0..1 控制张合 */
function drawBeak(g, P, hy, open) {
  g.save();
  g.translate(50, hy + 1);
  const o = open * 5;
  /* 下喙 */
  g.fillStyle = mix(P.beak, '#30240e', 0.4);
  g.beginPath();
  g.moveTo(-1, 1.5 + o);
  g.quadraticCurveTo(12, 4.5 + o, 20, 1.5 + o * 0.6);
  g.quadraticCurveTo(12, 6.5 + o, -1, 5 + o);
  g.closePath(); g.fill();
  /* 上喙 */
  const bGrad = g.createLinearGradient(0, -5, 0, 4);
  bGrad.addColorStop(0, lighten(P.beak));
  bGrad.addColorStop(1, P.beak);
  g.fillStyle = bGrad;
  g.beginPath();
  g.moveTo(-2, -2 - o);
  g.quadraticCurveTo(12, -5.5 - o, 21, -1.5 - o * 0.5);
  g.quadraticCurveTo(12, 2 - o, -2, 2 - o);
  g.closePath(); g.fill();
  /* 甲尖 */
  g.fillStyle = P.beakTip;
  g.beginPath();
  g.ellipse(20.5, -0.5 - o * 0.5, 2.2, 2.6, 0, 0, Math.PI * 2);
  g.fill();
  /* 鼻孔 */
  g.fillStyle = 'rgba(20,14,4,0.5)';
  g.beginPath(); g.ellipse(4, -2.5 - o * 0.5, 1.4, 0.9, 0, 0, Math.PI * 2); g.fill();
  /* 喙中线 */
  g.strokeStyle = 'rgba(30,20,6,0.35)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(0, 0.4 - o * 0.5); g.lineTo(19, 0.2 - o * 0.4); g.stroke();
  g.restore();
}

/** 眼：琥珀虹膜 + 黑瞳 + 双高光；blink 眨眼；dizzy 叉眼 */
function drawEye(g, P, hy, d) {
  g.save();
  g.translate(41, hy - 3);
  if (d.dizzy) {
    g.strokeStyle = '#1a1208'; g.lineWidth = 2.8; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-4, -4); g.lineTo(4, 4); g.moveTo(4, -4); g.lineTo(-4, 4);
    g.stroke();
    g.restore();
    return;
  }
  /* 眼窝 */
  g.fillStyle = '#1c140a';
  g.beginPath(); g.ellipse(0, 0, 5.4, 5.8, 0, 0, Math.PI * 2); g.fill();
  if (d.blink) {
    g.fillStyle = P.head || P.body;
    g.beginPath(); g.ellipse(0, 0, 6.2, 6.2, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1a1208'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-5, 0.5); g.quadraticCurveTo(0, 3, 5, 0.5); g.stroke();
    g.restore();
    return;
  }
  /* 琥珀虹膜 + 瞳孔 */
  g.fillStyle = '#e8a02c';
  g.beginPath(); g.ellipse(0.6, 0, 4, 4.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#140c04';
  g.beginPath(); g.ellipse(1.4, 0.2, 2.1, 2.6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.beginPath(); g.arc(2.4, -1.4, 1.1, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(-0.6, 1.6, 0.6, 0, Math.PI * 2); g.fill();
  g.restore();
}

/* ============================ 帽子 / 气球 / 闪星 ============================ */

/** 大礼帽（baron / quacker）：哑光黑毡 + 暗红缎带 */
function drawTophat(g, hy) {
  g.save();
  g.translate(38, hy - 22);
  g.rotate(-0.06);
  g.fillStyle = '#1c1a22';
  g.strokeStyle = '#0c0b10'; g.lineWidth = 2.2;
  g.beginPath();
  g.ellipse(0, 2, 23, 6.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath();
  g.roundRect ? g.roundRect(-13, -30, 26, 32, 3) : g.rect(-13, -30, 26, 32);
  g.fill(); g.stroke();
  g.fillStyle = '#6e1a12';
  g.fillRect(-13, -8, 26, 8);
  g.fillStyle = 'rgba(255,255,255,0.12)';
  g.fillRect(-10, -29, 5, 20);
  g.restore();
}

/** 军盔（major）：钢绿盔体 + 盔沿 + 铆钉 */
function drawHelmet(g, P, hy) {
  g.save();
  g.translate(38, hy - 10);
  const hGrad = g.createLinearGradient(0, -22, 0, 8);
  hGrad.addColorStop(0, '#7c8462');
  hGrad.addColorStop(1, '#3e442c');
  g.fillStyle = hGrad;
  g.strokeStyle = '#22261a'; g.lineWidth = 2.4;
  g.beginPath();
  g.arc(0, 2, 23, Math.PI * 0.95, Math.PI * 2.05);
  g.quadraticCurveTo(0, 15, -23, 2);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#4a5236';
  g.beginPath();
  g.ellipse(0, 4, 25, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  /* 铆钉 */
  g.fillStyle = '#a8b088';
  for (const dx of [-15, -5, 5, 14]) {
    g.beginPath(); g.arc(dx, -7 - Math.abs(dx) * 0.3, 2, 0, Math.PI * 2); g.fill();
  }
  /* 盔顶高光 */
  g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 2, 19, Math.PI * 1.15, Math.PI * 1.55); g.stroke();
  g.restore();
}

/** 气球（完整造型：球体高光 + 结 + 摆动绳） */
function drawBalloon(g, b) {
  g.save();
  const sway = Math.sin((b.phase || 0) * 2.4) * 6;
  g.translate(30, -66 + sway * 0.4);
  g.rotate(sway * 0.02);
  g.strokeStyle = 'rgba(60,50,40,0.7)'; g.lineWidth = 1.8;
  g.beginPath(); g.moveTo(0, 26);
  g.quadraticCurveTo(10 - sway, 48, sway * 0.4 - 6, 78);
  g.stroke();
  const grad = g.createRadialGradient(-6, -8, 4, 0, 0, 30);
  grad.addColorStop(0, lighten(b.color || '#c92f1e'));
  grad.addColorStop(1, darken(b.color || '#c92f1e', 0.72));
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(0, 0, 24, 29, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = darken(b.color || '#c92f1e', 0.75);
  g.beginPath();
  g.moveTo(-4, 27); g.lineTo(4, 27); g.lineTo(0, 34); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath(); g.ellipse(-8, -10, 6, 9, 0.5, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** 金鸭环绕闪星（四芒星，相位错开） */
function drawSparkles(g, t) {
  g.save();
  g.fillStyle = '#fff7cf';
  for (let i = 0; i < 4; i++) {
    const a = t * 1.8 + (i * Math.PI) / 2;
    const px = Math.cos(a) * 62, py = Math.sin(a * 1.3) * 46;
    const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
    g.globalAlpha = tw;
    starPath(g, px, py, 6 * tw + 2, 2.4);
    g.fill();
  }
  g.restore();
}

/** 五角星路径（canonical 定义在 util.js，此处转发导出以兼容旧引用） */
export { starPath };

/**
 * 鸭子头像图标（HUD 命中记录条 / 关卡选择装饰用）——写实鸭头侧影
 * @param {string} state 'ok' 绿色对勾底 | 'miss' 红色叉底 | 'plain'
 */
export function drawDuckHeadIcon(g, x, y, r, palette = 'yellow', state = 'plain') {
  g.save();
  g.translate(x, y);
  /* 底牌圆片 */
  g.fillStyle = state === 'ok' ? '#3e6b2c' : state === 'miss' ? '#8e2a1c' : '#3c4048';
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(10,10,12,0.65)'; g.lineWidth = 2; g.stroke();
  /* 缩小画一个写实鸭头 */
  g.save();
  g.beginPath(); g.arc(0, 0, r * 0.94, 0, Math.PI * 2); g.clip();
  g.scale(r / 26, r / 26);
  const P = PALETTES[palette] || PALETTES.yellow;
  const headCol = P.head || P.body;
  const hg = g.createLinearGradient(0, -18, 0, 18);
  hg.addColorStop(0, P.headLit || lighten(headCol));
  hg.addColorStop(0.6, headCol);
  hg.addColorStop(1, mix(headCol, '#101418', 0.35));
  g.fillStyle = hg;
  g.beginPath(); g.ellipse(-2, 2, 16, 14.5, 0, 0, Math.PI * 2); g.fill();
  /* 颈羽延伸 */
  g.fillStyle = P.body;
  g.beginPath();
  g.moveTo(-14, 4); g.quadraticCurveTo(-10, 14, -2, 17); g.lineTo(-16, 17);
  g.closePath(); g.fill();
  /* 喙 */
  g.fillStyle = P.beak;
  g.beginPath();
  g.moveTo(10, 1); g.quadraticCurveTo(22, -2, 27, 1.5); g.quadraticCurveTo(22, 5.5, 10, 5);
  g.closePath(); g.fill();
  g.fillStyle = P.beakTip;
  g.beginPath(); g.ellipse(26, 1.4, 2, 2.4, 0, 0, Math.PI * 2); g.fill();
  /* 眼 */
  if (state === 'miss') {
    g.strokeStyle = '#100c06'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -5); g.lineTo(8, 3); g.moveTo(8, -5); g.lineTo(0, 3);
    g.stroke();
  } else {
    g.fillStyle = '#1c140a';
    g.beginPath(); g.ellipse(4, -3, 4, 4.4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8a02c';
    g.beginPath(); g.ellipse(4.4, -3, 2.8, 3.1, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#140c04';
    g.beginPath(); g.arc(5.2, -2.8, 1.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(6, -4.2, 0.9, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  g.restore();
}

/* ============================ 色彩工具 ============================ */
function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 42), gg = Math.min(255, ((n >> 8) & 255) + 42), b = Math.min(255, (n & 255) + 42);
  return `rgb(${r},${gg},${b})`;
}
function darken(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${((n >> 16) & 255) * k | 0},${((n >> 8) & 255) * k | 0},${(n & 255) * k | 0})`;
}
/** 双色混合（hex/rgb 均可，返回 rgb() 串） */
function mix(c0, c1, k) {
  const p = (c) => {
    if (c[0] === '#') {
      const n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/(\d+),\s*(\d+),\s*(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
  };
  const a = p(c0), b = p(c1);
  return `rgb(${(a[0] + (b[0] - a[0]) * k) | 0},${(a[1] + (b[1] - a[1]) * k) | 0},${(a[2] + (b[2] - a[2]) * k) | 0})`;
}
