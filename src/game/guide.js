/**
 * ============================================================================
 * guide.js —— 玩法引导动画（分步新手教学 + 实时提示）
 * ----------------------------------------------------------------------------
 * 首次进入第 1 关触发分步教学（进度式披露，完成动作后自动进入下一步）：
 *   第 1 步 瞄准：动画手套光标从屏幕中心滑向第一只鸭子（鸭子带呼吸光环）
 *   第 2 步 开火：手套点击动画 → 玩家真实开火后进入下一步
 *   第 3 步 弹药：霰弹壳图标高亮脉冲（信息步，点击任意处继续）
 *   第 4 步 防守：箭头指向生命爱心（信息步）
 *   第 5 步 连击：星星演示连击倍率（信息步）
 * 支持「跳过」；设置中可重看（重看以演示波进行，不影响真实关卡数据）。
 * 所有引导元素（手套/箭头/光环/气泡）均为设计化完整造型，风格与 UI 统一。
 * ============================================================================
 */
import { W, H, rand, clamp, lerp, ease } from '../art/util.js';
import { toonText, roundRect } from '../art/util.js';
import { t } from '../../config/locales.js';

export class Guide {
  constructor(game) {
    this.game = game;
    this.active = false;        // 是否正在教学
    this.step = 0;              // 当前步骤（0 起）
    this.t = 0;                 // 步骤内时钟
    this.demoDuck = null;       // 教学目标鸭
    this.shotDone = false;
    this.moved = false;
    this._tapped = false;
    this._onFinish = null;
    /* 手套光标动画状态 */
    this.hand = { x: W / 2, y: H / 2, tx: W / 2, ty: H / 2, press: 0 };
    /* 全局点按监听：跳过区优先，信息步推进 */
    game.canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      const r = game.canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      const py = (e.clientY - r.top) * (H / r.height);
      if (Math.abs(px - (W - 108)) < 66 && Math.abs(py - (H - 52)) < 24) {
        this._finishSkip();
        return;
      }
      this._tapped = true;
    }, { passive: true });
  }

  /** 引擎事件通知 */
  notify(event, data) {
    if (!this.active) return;
    if (event === 'moved') this.moved = true;
    if (event === 'shot') this.shotDone = true;
    if (event === 'first_duck' && this.step === 0) this.demoDuck = data;
    if (event === 'duck_hit' && this.step === 1) this._next();
  }

  /** 启动教学（demo=true 时为"重看"模式：独立演示波，不计分） */
  start(demo = false, onFinish = null) {
    this.active = true;
    this.demo = demo;
    this.step = 0;
    this.t = 0;
    this.moved = false;
    this.shotDone = false;
    this.demoDuck = null;
    this._onFinish = onFinish;
    const g = this.game;
    if (demo) {
      /* 演示模式：进入特殊演示关卡（慢速鸭 + 无限子弹 + 高生命，不计真实成绩） */
      g.startLevel(1);
      g.score = 0;
      g.bullets = 999;
      g.maxBullets = 999;
      g.lives = 99;
      g.mods = [];
      g.ducks = [];
      g.phase = 'play';
      g.banner = null;
      const d = g._makeDuck(0, {});
      d.dur = 14; d.popDelay = 0.6;
      g.ducks.push(d);
      this.demoDuck = d;
    }
  }

  stop() {
    this.active = false;
    this.game.fx.rings = this.game.fx.rings.filter((r) => !r.guideOwn);
  }

  _next() {
    this.step++;
    this.t = 0;
    this.shotDone = false;
    this.moved = false;
    if (this.step >= 5) this._finish();
  }

  _finish() {
    this.stop();
    const cb = this._onFinish;
    this._onFinish = null;
    if (this.demo) {
      /* 演示结束 → 回主菜单 */
      this.game.toMenu();
    } else {
      this.game.paused = false;
    }
    cb && cb();
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const g = this.game;

    /* 演示模式：目标鸭丢失（逃走/被击落）时自动补充慢速鸭 */
    if (this.demo) {
      if (!this.demoDuck || this.demoDuck.state !== 'fly') {
        const alt = g.ducks.find((d) => d.state === 'fly');
        if (alt) this.demoDuck = alt;
        else if (g.phase === 'play' && g.ducks.length === 0) {
          const d = g._makeDuck(rand(0, 1) > 0.5 ? 1 : 0, {});
          d.dur = 14; d.popDelay = 0.4;
          g.ducks.push(d);
          this.demoDuck = d;
        }
      }
    }

    switch (this.step) {
      case 0: { /* 瞄准：手套滑向鸭子，玩家拖动/按键即完成 */
        if (this.demoDuck && this.demoDuck.state === 'fly') {
          this.hand.tx = this.demoDuck.x;
          this.hand.ty = this.demoDuck.y;
        }
        this.hand.x = lerp(this.hand.x, this.hand.tx, 1 - Math.pow(0.02, dt));
        this.hand.y = lerp(this.hand.y, this.hand.ty, 1 - Math.pow(0.02, dt));
        if (!this.game.fx.rings.some((r) => r.guideOwn) && this.demoDuck) {
          this.game.fx.spawnRing(0, 0, { r: 56, color: '#ffcf3f', ttl: 1.6, follow: this.demoDuck });
          const r = this.game.fx.rings[this.game.fx.rings.length - 1];
          r.guideOwn = true;
        }
        if ((this.moved || this.shotDone) && this.t > 1.2) this._next();
        break;
      }
      case 1: { /* 开火：手套按下弹起动画，真实开火后完成 */
        this.hand.press = 0.5 + 0.5 * Math.sin(this.t * 5);
        if (this.shotDone && this.t > 0.6) this._next();
        break;
      }
      case 2: case 3: case 4: { /* 信息步：稍候或点按继续 */
        if (this.t > 5 || (this.t > 0.8 && this._tapped)) {
          this._tapped = false;
          this._next();
        }
        break;
      }
    }
  }

  /** 绘制引导覆盖层（气泡 / 手套 / 步骤条 / 跳过按钮） */
  draw(g) {
    if (!this.active) return;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* --- 半透明聚焦底（教学区外压暗） --- */
    g.fillStyle = 'rgba(20,10,0,0.25)';
    g.fillRect(0, 0, W, H);

    /* --- 手套光标（完整卡通手套造型：掌+三指+袖口，带点击按压） --- */
    if (this.step <= 1) {
      this._drawHand(g, this.hand.x, this.hand.y + 20, 1 + this.hand.press * 0.12, this.hand.press);
    }

    /* --- 气泡文案（木牌底 + 圆角尾巴） --- */
    const steps = this._stepTexts(isTouch);
    const s = steps[this.step];
    if (s) {
      const bw = 560, bh = 128;
      const bx = W / 2 - bw / 2, by = H - bh - 96;
      /* 气泡弹出动画 */
      const pop = ease.outBack(clamp(this.t / 0.35, 0, 1));
      g.save();
      g.translate(W / 2, by + bh / 2);
      g.scale(pop, pop);
      g.translate(-W / 2, -(by + bh / 2));
      g.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(g, bx + 4, by + 6, bw, bh, 20); g.fill();
      const grad = g.createLinearGradient(0, by, 0, by + bh);
      grad.addColorStop(0, '#3c4553');
      grad.addColorStop(1, '#171c24');
      g.fillStyle = grad;
      roundRect(g, bx, by, bw, bh, 20); g.fill();
      g.strokeStyle = '#0e1116'; g.lineWidth = 4;
      roundRect(g, bx, by, bw, bh, 20); g.stroke();
      /* 尾巴指向 */
      g.fillStyle = '#171c24';
      g.beginPath();
      g.moveTo(W / 2 - 22, by + bh - 2);
      g.lineTo(W / 2 + 22, by + bh - 2);
      g.lineTo(W / 2, by + bh + 26);
      g.closePath(); g.fill();
      g.strokeStyle = '#0e1116';
      g.beginPath();
      g.moveTo(W / 2 - 22, by + bh - 3); g.lineTo(W / 2, by + bh + 26); g.lineTo(W / 2 + 22, by + bh - 3);
      g.stroke();
      g.fillStyle = '#171c24';
      g.fillRect(W / 2 - 20, by + bh - 6, 40, 6);
      /* 步骤徽章 */
      g.fillStyle = '#c92f1e';
      roundRect(g, bx + 18, by + 16, 64, 30, 15); g.fill();
      g.strokeStyle = '#ffc23f'; g.lineWidth = 2;
      roundRect(g, bx + 18, by + 16, 64, 30, 15); g.stroke();
      toonText(g, `${t('tutStep')} ${this.step + 1}/5`, bx + 50, by + 37, 16, '#fff4e0', '#571007', 3);
      /* 标题 + 正文 */
      toonText(g, s.title, W / 2 + 24, by + 40, 27, '#ffc23f', '#241503', 4.5);
      g.font = '700 21px "Trebuchet MS","Segoe UI","Microsoft YaHei",sans-serif';
      g.fillStyle = '#d9cfae';
      g.textAlign = 'center';
      g.fillText(s.text, W / 2 + 24, by + 82);
      g.textAlign = 'left';
      g.restore();
    }

    /* --- 跳过按钮（右下角暗钢小按钮，可点击） --- */
    const skx = W - 108, sky = H - 52;
    g.fillStyle = '#454e5c';
    roundRect(g, skx - 62, sky - 20, 124, 40, 20); g.fill();
    g.strokeStyle = '#0e1116'; g.lineWidth = 3;
    roundRect(g, skx - 62, sky - 20, 124, 40, 20); g.stroke();
    g.strokeStyle = 'rgba(255,180,70,0.4)'; g.lineWidth = 1.4;
    roundRect(g, skx - 58, sky - 16, 116, 32, 16); g.stroke();
    toonText(g, t('tutSkip'), skx, sky + 8, 21, '#ffd98a', '#12100a', 3.4);
  }

  _finishSkip() {
    if (this.demo) {
      const cb = this._onFinish;
      this._onFinish = null;
      this.stop();
      this.game.toMenu();
      cb && cb();
    } else {
      this.stop();
      this.game.paused = false;
    }
  }

  /** 卡通手套光标（掌心 + 三根手指 + 袖口，按压时下压变焦） */
  _drawHand(g, x, y, s, press) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.rotate(press * 0.06);
    /* 光环脉冲 */
    g.strokeStyle = `rgba(255,207,63,${0.55 + press * 0.35})`;
    g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, 34 + press * 8, 0, Math.PI * 2); g.stroke();
    /* 袖口（军绿护腕） */
    g.fillStyle = '#4a5236';
    g.strokeStyle = '#22261a'; g.lineWidth = 3;
    roundRect(g, -20, 26, 40, 22, 9); g.fill(); g.stroke();
    /* 掌 + 手指（圆润胶囊组合） */
    g.fillStyle = '#ffd9b3';
    g.strokeStyle = '#c98a5a'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-16, 30);
    g.quadraticCurveTo(-24, 8, -16, -4);
    g.quadraticCurveTo(-20, -18, -10, -19);
    g.quadraticCurveTo(-11, -30, -2, -28);
    g.quadraticCurveTo(0, -36, 8, -30);
    g.quadraticCurveTo(14, -34, 16, -24);
    g.quadraticCurveTo(24, -22, 22, -8);
    g.quadraticCurveTo(26, 12, 16, 28);
    g.quadraticCurveTo(0, 40, -16, 30);
    g.closePath();
    g.fill(); g.stroke();
    /* 指缝 */
    g.strokeStyle = 'rgba(180,120,70,0.6)'; g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-9, -18); g.quadraticCurveTo(-7, -6, -8, 4);
    g.moveTo(0, -26); g.quadraticCurveTo(1, -12, 0, 0);
    g.moveTo(9, -26); g.quadraticCurveTo(10, -12, 9, 0);
    g.stroke();
    /* 按压涟漪 */
    if (press > 0.7) {
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 3;
      g.beginPath(); g.arc(0, -4, 26 + (1 - press) * 30, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }

  _stepTexts(isTouch) {
    return [
      { title: t('tut1Title'), text: isTouch ? t('tut1Touch') : t('tut1Mouse') },
      { title: t('tut2Title'), text: isTouch ? t('tut2Touch') : t('tut2Mouse') },
      { title: t('tut3Title'), text: t('tut3Text') },
      { title: t('tut4Title'), text: t('tut4Text') },
      { title: t('tut5Title'), text: t('tut5Text') },
    ];
  }
}
