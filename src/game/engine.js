/**
 * ============================================================================
 * engine.js —— 游戏引擎（主循环 / 关卡运行时 / 全部玩法机制 / BOSS 战）
 * ----------------------------------------------------------------------------
 * 还原原作核心：准星加速度移动 + 每波 3 发子弹 + 鸭子贝塞尔轨迹飞行 +
 * 逃脱扣命 + 时间奖励分 + 连击倍率 + 命中记录条；并扩展 12 种关卡机制
 * （见 config/levels.js）与 3 场专属 BOSS 战。
 *
 * 渲染顺序：天空 → 云 → 中景 → 鸭群(背特效) → 前景草坡 → 前特效 →
 *           夜幕聚光 → HUD → 玩法引导 → 菜单 LOGO。
 * ============================================================================
 */
import { GAME_CONFIG } from '../../config/game.config.js';
import { LEVELS, ENDLESS, BOSSES, getLevel } from '../../config/levels.js';
import { t } from '../../config/locales.js';
import { Save } from '../core/save.js';
import { Audio2 } from '../core/audio.js';
import { W, H, rand, randInt, pick, clamp } from '../art/util.js';
import { Scene } from '../art/scene.js';
import { Effects } from '../art/effects.js';
import { drawDuck, PALETTES } from '../art/duck.js';
import { drawHUD, drawScope } from '../art/hud.js';
import { drawLogo } from '../art/logo.js';

const CFG = GAME_CONFIG.gameplay;
const SCOPE = GAME_CONFIG.scope;
const DUCK_PALETTES = ['yellow', 'mallard', 'red', 'teal'];
const BALLOON_COLORS = ['#e84b3c', '#4fb2e5', '#ff8fb3', '#66c04b', '#ffcf3f'];

/* 贝塞尔求值 */
function quad(p0, p1, p2, k) {
  const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
  return a * p0 + b * p1 + c * p2;
}

export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.hooks = hooks;              // {onLevelClear, onGameOver, onAmmoEmpty, onEvent}
    this.scene = new Scene();
    this.fx = new Effects();
    this.guide = hooks.guide || null;   // 玩法引导模块（可后挂）
    this.mode = 'menu';              // menu | playing
    this.phase = 'idle';             // intro | play | waveclear | done
    this.uiBlock = false;            // DOM 弹窗打开时屏蔽画布输入
    this.t = 0;                      // 引擎时钟
    this._acc = 0;                   // 固定步长累加器

    /* 准星（原作物。理：加速度 + 摩擦 + 限速） */
    this.scope = { x: W / 2, y: H / 2 - 40, vx: 0, vy: 0, visible: true };
    this.keys = {};
    this.pointer = { down: false, id: -1, sx: 0, sy: 0, ax: 0, ay: 0, moved: false, t0: 0 };

    /* 关卡运行时状态 */
    this.level = null;
    this.levelId = 0;
    this.isEndless = false;
    this.endlessSet = 0;
    this.mods = [];
    this.wave = 0;
    this.bullets = 3;
    this.lives = 4;
    this.score = 0;
    this.streak = 0;
    this.escapes = 0;
    this.bonusMs = CFG.bonusTime;
    this.shots = 0;
    this.hits = 0;
    this.ducks = [];
    this.boss = null;
    this.hitLog = [];
    this.banner = null;
    this.phaseTimer = 0;
    this.idleT = 0;
    this.noAmmoFlash = 0;
    this.windVx = 0;
    this.lightningBoost = 0;
    this._ammoOffered = false;

    /* 菜单装饰鸭 */
    this.menuDucks = [];
    this._menuSpawnT = 1;

    this._bindInput();
    this.scene.setTheme('day');
    this.paused = false;
  }

  /* 音效便捷封装（未加载/禁用时静默） */
  _playIf(name, opt) { try { Audio2.play(name, opt); } catch (e) {} }
  _playVarIf(name, vol) { try { Audio2.playVar(name, vol); } catch (e) {} }

  /* ======================================================================
   * 输入绑定：键盘（原作方向键物理）+ 指针（拖动瞄准 / 点按开火）
   * ====================================================================== */
  _bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.mode === 'playing' && this.phase === 'play' && !this.uiBlock) this.fire();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

    const cv = this.canvas;
    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };
    cv.addEventListener('pointerdown', (e) => {
      if (this.uiBlock) return;
      const p = pos(e);
      this.pointer.down = true; this.pointer.id = e.pointerId;
      this.pointer.sx = p.x; this.pointer.sy = p.y;
      this.pointer.ax = p.x; this.pointer.ay = p.y;
      this.pointer.moved = false; this.pointer.t0 = performance.now();
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.pointer.down || e.pointerId !== this.pointer.id) return;
      const p = pos(e);
      const dx = p.x - this.pointer.ax, dy = p.y - this.pointer.ay;
      this.pointer.ax = p.x; this.pointer.ay = p.y;
      if (Math.abs(p.x - this.pointer.sx) + Math.abs(p.y - this.pointer.sy) > 14) this.pointer.moved = true;
      if (this.pointer.moved && !this.uiBlock) {
        /* 拖动 = 直接移动准星（拖拽比例 1:1） */
        this.scope.x = clamp(this.scope.x + dx, 0, W);
        this.scope.y = clamp(this.scope.y + dy, 0, H);
        this.scope.vx = 0; this.scope.vy = 0;
        this.idleT = 0;
        this.guide && this.guide.notify('moved');
      }
    });
    const up = (e) => {
      if (!this.pointer.down || e.pointerId !== this.pointer.id) return;
      this.pointer.down = false;
      const quick = performance.now() - this.pointer.t0 < 350;
      /* 未拖动的快速点按 = 开火（在当前准星位置） */
      if (quick && !this.pointer.moved && this.mode === 'playing' && this.phase === 'play' && !this.uiBlock) {
        this.fire();
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  /* ======================================================================
   * 关卡启动 / 菜单
   * ====================================================================== */
  toMenu() {
    this.mode = 'menu';
    this.phase = 'idle';
    this.scene.setTheme('day');
    this.fx.clear();
    this.ducks = [];
    this.boss = null;
    this.menuDucks = [];
    this.guide && this.guide.stop();
  }

  /** 开始关卡（levelId 数字或 'endless'） */
  startLevel(id) {
    this.mode = 'playing';
    this.isEndless = id === 'endless';
    this.levelId = id;
    this.level = this.isEndless ? null : getLevel(id);
    this.score = 0;
    this.streak = 0;
    this.shots = 0;
    this.hits = 0;
    this.hitLog = [];
    this.ducks = [];
    this.boss = null;
    this.fx.clear();
    this._ammoOffered = false;
    this.endlessSet = 0;
    if (this.isEndless) {
      this.lives = ENDLESS.lives;
      this.mods = this._rollEndlessMods();
      this._endlessSpeed = ENDLESS.speedBase;
    } else {
      this.lives = this.level.lives;
      this.mods = this.level.mods.slice();
    }
    this._applyMods();
    this.wave = 0;
    this._startWave(true);
    this.hooks.onEvent && this.hooks.onEvent('level_start', { level: id });
  }

  /** 无尽模式：每轮随机抽 1-3 种机制（保证持续新鲜感） */
  _rollEndlessMods() {
    const pool = ENDLESS.pool.slice();
    const n = Math.min(3, 1 + Math.floor(this.endlessSet / 2));
    const mods = [];
    for (let i = 0; i < n; i++) mods.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
    return mods;
  }

  _applyMods() {
    const night = this.mods.includes('night');
    const storm = this.mods.includes('storm');
    this.scene.setTheme(storm ? 'storm' : night ? 'night' : this.mods.includes('boss') ? 'dusk' : 'day');
    this.scene.wind = this.mods.includes('wind') ? 2.2 : storm ? 2.6 : 1;
    if (this.mods.includes('fog')) this.fx.initFog(4); else this.fx.clearFog();
  }

  /** 开始一波（首波带关卡开场横幅） */
  _startWave(first = false) {
    this.phase = 'intro';
    this.phaseTimer = first ? CFG.waveIntroTime + 0.4 : CFG.waveIntroTime;
    this.bullets = this.isEndless ? ENDLESS.bullets : this.level.bullets;
    this.bonusMs = CFG.bonusTime;
    this.streak = 0;

    if (this.isEndless) {
      const extra = Math.floor(this.endlessSet / 3);
      const counts = [3 + extra, 3 + extra, 4 + extra];
      this._waveDucks = counts[Math.min(this.wave, 2)];
      this._waveSpeed = this._endlessSpeed + this.wave * 0.06;
      this.banner = {
        title: `${t('miscEndlessWave')} ${this.endlessSet + 1}-${this.wave + 1}`,
        sub: this.mods.map((m) => t('mod_' + m)).join(' + '),
        t: 0, dur: CFG.waveIntroTime + 0.4,
      };
    } else if (this.mods.includes('boss')) {
      this._waveDucks = 0;
      this._waveSpeed = this.level.speed;
      const bt = BOSSES[this.level.boss.type];
      this.banner = {
        title: t('mod_boss'), sub: t('boss_' + this.level.boss.type),
        t: 0, dur: CFG.waveIntroTime + 0.4,
      };
    } else {
      this._waveDucks = this.level.ducks[Math.min(this.wave, this.level.ducks.length - 1)];
      this._waveSpeed = this.level.speed;
      this.banner = {
        title: `${t('hudLevel')} ${this.levelId} - ${t('hudWave')} ${this.wave + 1}`,
        sub: this.wave === 0 ? this.mods.map((m) => t('mod_' + m)).join(' + ') : '',
        t: 0, dur: CFG.waveIntroTime + 0.4,
      };
    }
    this.hooks.onEvent && this.hooks.onEvent('wave_start', { wave: this.wave });
  }

  /** 真正生成一波鸭子（intro 结束后调用） */
  _spawnWave() {
    this.phase = 'play';
    const mirror = this.mods.includes('mirror');
    const balloon = this.mods.includes('balloon');
    const armored = this.mods.includes('armored');
    const golden = this.mods.includes('golden');
    const speedMod = this.mods.includes('speed');
    const small = this.mods.includes('small');

    /* BOSS 波：生成 BOSS 而非普通鸭（续命重开时保留当前 BOSS，不重置血量） */
    if (this.mods.includes('boss') && !this.isEndless) {
      if (!(this.boss && this.boss.state !== 'dying')) {
        this._spawnBoss(this.level.boss);
      }
      return;
    }

    let n = this._waveDucks;
    const spawn = (side) => {
      const duck = this._makeDuck(side, { balloon, armored, golden, speedMod, small });
      this.ducks.push(duck);
      if (this.ducks.filter((d) => d.state === 'fly').length === 1 && this.wave === 0) {
        this.guide && this.guide.notify('first_duck', duck);
      }
    };
    if (mirror) {
      const half = Math.ceil(n / 2);
      for (let i = 0; i < half; i++) spawn(0);
      for (let i = 0; i < n - half; i++) spawn(1);
    } else {
      for (let i = 0; i < n; i++) spawn(randInt(0, 1));
    }
    this._playIf('quack');
  }

  /** 生成单只鸭子（side 0=左进右出 1=右进左出） */
  _makeDuck(side, opt = {}) {
    const spawnX = side === 0 ? rand(40, W * 0.4) : rand(W * 0.6, W - 40);
    const spawnY = 560 + rand(-10, 14);
    /* 出口：对侧或上方（与原作一致的三类出口） */
    let exit;
    const r = Math.random();
    if (side === 0) {
      exit = r < 0.4 ? { x: -130, y: rand(220, 420) } : r < 0.75 ? { x: W + 130, y: rand(200, 420) } : { x: rand(200, W - 200), y: -130 };
    } else {
      exit = r < 0.4 ? { x: W + 130, y: rand(220, 420) } : r < 0.75 ? { x: -130, y: rand(200, 420) } : { x: rand(200, W - 200), y: -130 };
    }
    let dur = (CFG.duckBaseDuration / (this._waveSpeed || 1)) * rand(0.92, 1.12);
    if (opt.speedMod) dur *= 0.58;
    if (opt.small) dur *= 1.05;

    const golden = opt.golden && Math.random() < 0.2;
    return {
      x: spawnX, y: spawnY,
      p0: { x: spawnX, y: spawnY },
      p1: { x: (spawnX + exit.x) / 2 + rand(-140, 140), y: rand(120, 360) },
      p2: exit,
      t: 0, dur,
      easeType: pick(['outSine', 'linear', 'inSine']),
      dir: exit.x > spawnX ? 1 : -1,
      scale: (opt.small ? 0.72 : 1) * (golden ? 1.05 : rand(0.95, 1.12)),
      palette: golden ? 'golden' : pick(DUCK_PALETTES),
      state: 'fly',
      wingPhase: rand(0, 1),
      beakOpen: 0,
      blinkT: rand(1, 4),
      bobP: rand(0, 6),
      quackT: rand(0.8, 2.4),
      golden,
      balloon: opt.balloon && Math.random() < 0.55 ? { color: pick(BALLOON_COLORS), phase: rand(0, 6) } : null,
      mask: opt.armored && Math.random() < 0.5,
      angry: false,
      hitT: 0, fallT: 0, rot: 0,
      popDelay: rand(0, 0.5),
      spawned: false,
    };
  }

  /* ======================================================================
   * BOSS
   * ====================================================================== */
  _spawnBoss(bc) {
    const cfg = BOSSES[bc.type];
    this.boss = {
      type: bc.type, cfg,
      hp: bc.hp, maxHp: bc.hp,
      x: W / 2, y: 250,
      t: 0, phase: 1, enraged: false,
      plates: cfg.armor ? 3 : 0,
      bells: cfg.weak === 'bells' ? [true, true, true] : null,
      bellHp: cfg.weak === 'bells' ? Math.ceil(bc.hp / 3) : 0,
      activeBell: 0, bellT: 0,
      dir: 1, wingPhase: 0, beakOpen: 0,
      hitFlash: 0, dieT: 0,
      duckT: 5, ducklingsLeft: bc.ducklings,
      target: null, dashT: 0,
    };
    this.fx.spawnRing(W / 2, 250, { r: 90, color: '#ff6b5a', ttl: 2.5 });
    this._playIf('boss_roar');
    this.guide && this.guide.notify('boss_spawn', this.boss);
  }

  _updateBoss(dt) {
    const b = this.boss;
    b.t += dt;
    b.wingPhase = (b.wingPhase + dt * 2.2) % 1;
    b.hitFlash = Math.max(0, b.hitFlash - dt * 4);
    b.blinkT = (b.blinkT || 2) - dt;
    if (b.blinkT <= 0) b.blinkT = rand(1.5, 4);
    b.beakOpen = b.blinkT < 0.25 ? 1 : 0;

    const enraged = b.enraged;
    const spd = b.cfg.pattern === 'dash' ? (enraged ? 1.7 : 1.15) : (enraged ? b.cfg.enragedSpeed : 1);

    /* 轨迹模式 */
    if (b.cfg.pattern === 'figure8') {
      b.x = W / 2 + Math.sin(b.t * 0.7 * spd) * 330;
      b.y = 240 + Math.sin(b.t * 1.4 * spd) * 90;
    } else if (b.cfg.pattern === 'dash') {
      b.dashT -= dt * spd;
      if (!b.target || b.dashT <= 0) {
        b.target = { x: rand(200, W - 200), y: rand(140, 330) };
        b.dashT = rand(1.2, 2);
      }
      const dx = b.target.x - b.x, dy = b.target.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const v = 340 * spd;
        b.x += (dx / d) * v * dt;
        b.y += (dy / d) * v * dt;
        b.dir = dx > 0 ? 1 : -1;
      }
    } else if (b.cfg.pattern === 'waltz') {
      b.x = W / 2 + Math.cos(b.t * 0.55 * spd) * 300;
      b.y = 250 + Math.sin(b.t * 1.1 * spd) * 100;
      b.dir = Math.cos(b.t * 0.55 * spd) > 0 ? 1 : -1;
      b.rotation = Math.sin(b.t * 1.1 * spd) * 0.12;
    }

    /* 三铃弱点：周期轮换点亮 */
    if (b.bells) {
      b.bellT += dt;
      if (b.bellT > 6.5) { b.bellT = 0; this._cycleBell(b); }
    }

    /* 召唤鸭小队 */
    if (b.ducklingsLeft > 0) {
      b.duckT -= dt;
      if (b.duckT <= 0) {
        b.duckT = 7;
        b.ducklingsLeft--;
        const side = randInt(0, 1);
        for (let i = 0; i < 2; i++) {
          const d = this._makeDuck(side, {});
          d.scale *= 0.78; d.duckling = true;
          d.popDelay = i * 0.35;
          this.ducks.push(d);
        }
        this._playIf('duckling');
        this.fx.spawnNote(b.x, b.y + 60);
      }
    }

    /* 阶段 2：血量 < 40% 激怒 */
    if (!b.enraged && b.hp <= b.maxHp * 0.4 && b.state !== 'dying') {
      b.enraged = true;
      this.fx.spawnStars(b.x, b.y, '#ff6b5a', 14, 1.4);
      this._playIf('boss_roar');
      this.fx.spawnScore(b.x, b.y - 80, '!', false, 60);
    }

    /* 死亡坠落 */
    if (b.state === 'dying') {
      b.dieT += dt;
      b.y += (b.dieT * b.dieT) * 620 * dt;
      b.rotation = (b.rotation || 0) + dt * 2.4;
      if (b.y > H + 160) {
        this.boss = null;
        this._levelComplete();
      }
    }
  }

  _cycleBell(b) {
    const alive = b.bells.map((v, i) => v ? i : -1).filter((i) => i >= 0);
    if (!alive.length) return;
    const idx = alive[(alive.indexOf(b.activeBell) + 1) % alive.length];
    b.activeBell = idx;
    this.fx.spawnRing(b.x + (-2 + idx * 15) * b.cfg.scale * b.dir, b.y + (26 - Math.abs(idx - 1) * 6) * b.cfg.scale, { r: 26, color: '#ffcf3f', ttl: 1.6 });
  }

  /* ======================================================================
   * 主循环
   * ====================================================================== */
  update(dt) {
    this.t += dt;
    this.scene.update(dt);
    this.fx.update(dt);

    /* 菜单模式：氛围鸭 + LOGO */
    if (this.mode === 'menu') {
      this._menuSpawnT -= dt;
      if (this._menuSpawnT <= 0) {
        this._menuSpawnT = rand(1.6, 3.4);
        const d = this._makeDuck(randInt(0, 1), {});
        d.popDelay = 0; d.spawned = true;
        this.menuDucks.push(d);
      }
      for (const d of this.menuDucks) this._flyDuck(d, dt, false);
      this.menuDucks = this.menuDucks.filter((d) => d.t < 1);
      return;
    }

    if (this.mode !== 'playing') return;

    /* 固定步长物理（准星） */
    this._updateScope(dt);

    /* 阶段推进 */
    this.phaseTimer -= dt;
    if (this.phase === 'intro' && this.phaseTimer <= 0) {
      this.banner = null;
      this._spawnWave();
    } else if (this.phase === 'waveclear' && this.phaseTimer <= 0) {
      this.banner = null;
      this.wave++;
      const waves = this.isEndless ? Infinity : this.level.waves;
      if (this.wave >= waves) { this._levelComplete(); return; }
      if (this.isEndless && this.wave % 3 === 0) {
        this.endlessSet++;
        this.mods = this._rollEndlessMods();
        this._endlessSpeed += ENDLESS.speedGrow * 2;
        this._applyMods();
      }
      this._startWave();
    }

    /* 风力（wind/storm） */
    if (this.mods.includes('wind') || this.mods.includes('storm')) {
      this.windVx = Math.sin(this.t * 0.5) * 46 + Math.sin(this.t * 1.7) * 18;
    } else this.windVx = 0;

    /* 奖励倒计时 */
    if (this.phase === 'play') this.bonusMs = Math.max(0, this.bonusMs - dt * 1000);

    /* 鸭群 */
    let alive = 0;
    for (const d of this.ducks) {
      if (d.state === 'fly') {
        d.popDelay -= dt;
        if (d.popDelay > 0) continue;
        if (!d.spawned) { d.spawned = true; }
        this._flyDuck(d, dt, true);
        alive++;
      } else if (d.state === 'hit') {
        d.hitT -= dt;
        if (d.hitT <= 0) { d.state = 'fall'; d.fallT = 0; this._playIf('thud'); }
      } else if (d.state === 'fall') {
        d.fallT += dt;
        d.y += (d.fallT * d.fallT) * 900 * dt;
        d.rot = (d.rot || 0) + dt * 5 * (d.dir || 1);
        if (d.y > 640) {
          d.state = 'gone';
          this.fx.spawnSplash(d.x, 640);
        }
      }
    }
    this.ducks = this.ducks.filter((d) => d.state !== 'gone' || d._logged);
    for (const d of this.ducks) if (d.state === 'gone' && !d._logged) { d._logged = true; }

    /* 波次结束判定（BOSS 存活时不算） */
    if (this.phase === 'play' && !this.boss && this.ducks.length === 0 && alive === 0) {
      this.phase = 'waveclear';
      this.phaseTimer = CFG.waveClearTime;
      this.streak = 0;
      this.banner = { title: t('hudWaveClear'), sub: '', t: 0, dur: CFG.waveClearTime };
      this._playIf('wave_clear');
      this.hooks.onEvent && this.hooks.onEvent('wave_clear', { wave: this.wave });
    }

    if (this.boss) this._updateBoss(dt);

    this.noAmmoFlash = Math.max(0, this.noAmmoFlash - dt);

    /* 空闲提示（4 秒未开火 → 光环引导） */
    if (this.phase === 'play') {
      this.idleT += dt;
      if (this.idleT > 4 && this.ducks.some((d) => d.state === 'fly' && d.spawned)) {
        const target = this.ducks.find((d) => d.state === 'fly' && d.spawned);
        if (target && !this.fx.rings.some((r) => r.follow === target)) {
          this.fx.spawnRing(0, 0, { r: 52, color: '#ffcf3f', ttl: 2.2, follow: target });
        }
        this._idleHint = true;
      } else this._idleHint = false;
    }
    this.guide && this.guide.update(dt);
  }

  /** 鸭子沿贝塞尔飞行（wind 漂移） */
  _flyDuck(d, dt, gameplay) {
    d.t += dt / d.dur;
    d.wingPhase = (d.wingPhase + dt * 2.4) % 1;
    d.bobP += dt * 3;
    d.blinkT -= dt;
    if (d.blinkT < -0.14) d.blinkT = rand(1.2, 3.8);
    d.quackT -= dt;
    if (d.quackT < 0) {
      d.quackT = rand(1.6, 4);
      d.beakOpen = 1;
      if (gameplay && Math.random() < 0.5) {
        this._playVarIf('quack', 0.3);
        this.fx.spawnNote(d.x, d.y - 40);
      }
    } else d.beakOpen = Math.max(0, d.beakOpen - dt * 4);

    const k = clamp(d.t, 0, 1);
    const e = k >= 1 ? 1 : (d.easeType === 'outSine' ? Math.sin((k * Math.PI) / 2) : d.easeType === 'inSine' ? 1 - Math.cos((k * Math.PI) / 2) : k);
    let x = quad(d.p0.x, d.p1.x, d.p2.x, e);
    let y = quad(d.p0.y, d.p1.y, d.p2.y, e) + Math.sin(d.bobP) * 7;
    /* 气球被击破：下坠飘行（更容易打） */
    if (d.balloon === false && d.state === 'fly') {
      y += Math.sin(d.bobP * 2) * 10;
    }
    if (d.state === 'fly' && d.popDelay <= 0 && d.spawned && (this.mods.includes('wind') || this.mods.includes('storm'))) {
      x += this.windVx * 0.4 * dt * (d.balloon ? 2.2 : 1);
    }
    d.x = x; d.y = y;
    if (gameplay && d.t >= 1 && d.state === 'fly') {
      d.state = 'gone';
      this._onEscape(d);
    }
  }

  /* ======================================================================
   * 射击
   * ====================================================================== */
  fire() {
    if (this.bullets <= 0) {
      this.noAmmoFlash = 1.2;
      this._playIf('dry_fire');
      /* 弹尽且场上还有鸭子 → 提供一次广告补弹（每关一次） */
      if (!this._ammoOffered && this.ducks.some((d) => d.state === 'fly') && this.hooks.onAmmoEmpty) {
        this._ammoOffered = true;
        this.hooks.onAmmoEmpty();
      }
      return;
    }
    this.bullets--;
    this.shots++;
    Save.addStat('shots');
    this.idleT = 0;
    this.fx.spawnMuzzle(this.scope.x, this.scope.y);
    this._playIf('shot');
    this.guide && this.guide.notify('shot');
    this.hooks.onEvent && this.hooks.onEvent('shot', { x: this.scope.x, y: this.scope.y });

    /* ---- 命中检测：BOSS 优先 → 气球 → 鸭身 ---- */
    if (this.boss && this.boss.state !== 'dying' && this._hitBoss(this.scope.x, this.scope.y)) {
      this._hitBossAt(this.scope.x, this.scope.y);
      return;
    }
    /* 从最上层鸭子往下找 */
    for (let i = this.ducks.length - 1; i >= 0; i--) {
      const d = this.ducks[i];
      if (d.state !== 'fly' || !d.spawned || d.popDelay > 0) continue;
      const s = d.scale;
      /* 气球判定（气球在鸭子后上方） */
      if (d.balloon) {
        const bx = d.x + 30 * s * d.dir, by = d.y - 66 * s + Math.sin(d.bobP) * 3;
        if (Math.hypot(this.scope.x - bx, this.scope.y - by) < 30 * s) {
          this._popBalloon(d);
          return;
        }
      }
      /* 鸭身判定（椭圆近似盒） */
      const dx = this.scope.x - d.x, dy = this.scope.y - d.y;
      if (Math.abs(dx) < 56 * s && Math.abs(dy) < 46 * s) {
        this._hitDuck(d);
        return;
      }
    }
  }

  /** 击中鸭子（面具鸭两段制） */
  _hitDuck(d) {
    this.hits++;
    /* 小丑面具鸭：第一枪打掉面具 */
    if (d.mask) {
      d.mask = false;
      d.angry = true;
      d.dur *= 0.72;                 /* 发怒加速 */
      this.fx.spawnFeathers(d.x, d.y - 30, '#f7f1e4', 8, 0.8);
      this.fx.spawnStars(d.x, d.y, '#c03828', 6, 0.8);
      this._playIf('clang');
      this.fx.spawnScore(d.x, d.y - 60, '!', false, 36);
      this.hooks.onEvent && this.hooks.onEvent('mask_off');
      return;
    }
    /* 计分 */
    this.streak = Math.min(this.streak + 1, CFG.streakMax);
    let pts = CFG.hitScore + Math.floor(this.bonusMs / CFG.timeBonusDiv);
    if (this.streak > 1) pts *= this.streak;
    if (d.golden) pts *= CFG.goldenScoreMul;
    if (d.duckling) pts = 300;
    this.score += pts;
    Save.addStat('hits');

    if (d.duckling) {
      this.bullets++;               /* 鸭小队奖励 +1 弹 */
      this.fx.spawnScore(d.x, d.y - 60, '+1', true, 40);
    } else {
      this.fx.spawnScore(d.x, d.y - 60, '+' + pts, this.streak > 1 || d.golden, 44);
    }
    if (this.streak >= 2) this.fx.spawnScore(d.x, d.y - 110, 'X' + this.streak, true, 30);

    /* 特效音效 */
    const col = PALETTES[d.palette].body;
    this.fx.spawnFeathers(d.x, d.y, d.golden ? '#ffdf6b' : col, d.golden ? 18 : 13, 1);
    if (d.golden) {
      this.fx.spawnStars(d.x, d.y, '#ffcf3f', 10, 1.2);
      this._playIf('golden');
    }
    this._playVarIf('duck_hit');
    d.state = 'hit';
    d.hitT = CFG.hitFreezeTime;
    d.dizzy = true;
    d.squashY = 0.86;
    this.hitLog.push({ ok: true, palette: d.palette });
    this.hooks.onEvent && this.hooks.onEvent('duck_hit', { golden: !!d.golden, streak: this.streak });
    this.guide && this.guide.notify('duck_hit');
  }

  /** 打爆气球 */
  _popBalloon(d) {
    this.fx.spawnBalloonPop(d.x + 30 * d.scale * d.dir, d.y - 66 * d.scale, d.balloon.color);
    this._playIf('balloon_pop');
    d.balloon = false;              /* false = 已爆 */
    d.dur *= 1.7;                   /* 失去气球 → 缓慢飘行 */
    d.p2 = { x: d.dir > 0 ? W + 130 : -130, y: 540 };  /* 低空出口 */
    d.p1 = { x: (d.p0.x + d.p2.x) / 2, y: 430 };
    d.t = Math.min(d.t, 0.5);
    this.fx.spawnScore(d.x, d.y - 90, 'POP!', false, 32);
    this.hooks.onEvent && this.hooks.onEvent('balloon_pop');
  }

  /* ------------------------- BOSS 命中 ------------------------- */
  _hitBoss(x, y) {
    const b = this.boss, s = b.cfg.scale;
    return Math.abs(x - b.x) < 62 * s && y - b.y > -58 * s && y - b.y < 52 * s;
  }

  _hitBossAt(x, y) {
    const b = this.boss;
    const localY = (y - b.y) / b.cfg.scale;
    const weak = b.cfg.weak;

    /* quacker：只打当前点亮的铃铛才有效 */
    if (weak === 'bells') {
      let bellHit = -1;
      for (let i = 0; i < 3; i++) {
        const bx = b.x + (-2 + i * 15) * b.cfg.scale * b.dir;
        const by = b.y + (26 - Math.abs(i - 1) * 6) * b.cfg.scale;
        if (Math.hypot(x - bx, y - by) < 16 * b.cfg.scale) bellHit = i;
      }
      if (bellHit < 0) return;                  /* 打空 */
      if (!b.bells[bellHit] || bellHit !== b.activeBell) {
        this._playIf('clang');
        this.fx.spawnStars(x, y, '#b8b8b8', 5, 0.7);
        return;
      }
      b.bellHp--; b.hp--;
      b.hitFlash = 1;
      this.fx.spawnFeathers(x, y, '#ffcf3f', 6, 0.8);
      this._playIf('boss_hit');
      if (b.bellHp <= 0) {
        b.bells[bellHit] = false;
        this.fx.spawnStars(x, y, '#ffcf3f', 12, 1.2);
        this._cycleBell(b);
      }
      this._afterBossHit();
      return;
    }

    /* baron/major：护甲区（上半身）弹反；弱点区（下半身）真伤 */
    const armorZone = weak === 'belly' ? localY < -6 : localY < 4;   /* belly 弱点在下半，chest 弱点在胸 */
    if (b.plates > 0 && armorZone && !(weak === 'chest' && localY >= -2 && localY <= 18)) {
      b.plates--;
      this._playIf('clang');
      this.fx.spawnStars(x, y, '#c9ce9a', 8, 1);
      this.fx.spawnScore(x, y - 40, 'CLANG!', false, 30);
      if (b.plates === 0) {
        b.enraged = true;
        this.fx.spawnFeathers(b.x, b.y - 40, '#c9ce9a', 14, 1.2);
        this.fx.spawnScore(b.x, b.y - 90, '!!', true, 44);
      }
      return;
    }
    /* 弱点命中 */
    const inWeak = weak === 'belly' ? localY >= -6 : (localY >= -6 && localY <= 22);
    if (!inWeak) {
      this._playIf('clang');
      this.fx.spawnStars(x, y, '#c9ce9a', 5, 0.7);
      return;
    }
    b.hp--;
    b.hitFlash = 1;
    this.hits++;
    this.streak = Math.min(this.streak + 1, CFG.streakMax);
    const pts = (250 + Math.floor(this.bonusMs / CFG.timeBonusDiv)) * (this.streak > 1 ? this.streak : 1);
    this.score += pts;
    this.fx.spawnScore(x, y - 50, '+' + pts, this.streak > 1, 46);
    this.fx.spawnFeathers(x, y, PALETTES[b.cfg.palette].body, 10, 1);
    this._playIf('boss_hit');
    this.guide && this.guide.notify('boss_hit');
    this._afterBossHit();
  }

  _afterBossHit() {
    const b = this.boss;
    this.hooks.onEvent && this.hooks.onEvent('boss_hit', { hp: b.hp });
    if (b.hp <= 0) {
      b.state = 'dying';
      b.dieT = 0;
      this.score += 2000;
      this.fx.spawnScore(b.x, b.y - 100, '+2000', true, 52);
      this.fx.spawnConfetti(60);
      this.fx.spawnFeathers(b.x, b.y, PALETTES[b.cfg.palette].body, 26, 1.6);
      this.fx.spawnStars(b.x, b.y, '#ffcf3f', 18, 1.6);
      this.banner = { title: t('bossDefeated'), sub: '', t: 0, dur: 2 };
      this._playIf('boss_down');
      this._playIf('level_clear');
      this.hooks.onEvent && this.hooks.onEvent('boss_defeated');
    }
  }

  /* ======================================================================
   * 逃脱 / 结算
   * ====================================================================== */
  _onEscape(d) {
    if (d.duckling) return;                       /* 鸭小队逃脱不扣命 */
    this.lives--;
    this.escapes++;
    this.streak = 0;
    this.hitLog.push({ ok: false, palette: d.palette });
    this.fx.spawnMark(d.x, clamp(d.y, 80, H - 120));
    this.fx.spawnFeathers(d.x, d.y, PALETTES[d.palette].body, 5, 0.6);
    this._playVarIf('quack_sad');
    this.guide && this.guide.notify('escaped');
    this.hooks.onEvent && this.hooks.onEvent('duck_escape', { lives: this.lives });
    if (this.lives <= 0) {
      this.phase = 'done';
      this.hooks.onGameOver && this.hooks.onGameOver({
        score: this.score, escapes: this.escapes,
        accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
      });
    }
  }

  _levelComplete() {
    this.phase = 'done';
    let stars = 1;
    if (this.escapes === 0) stars = 3;
    else if (this.escapes <= 2) stars = 2;
    if (!this.isEndless) {
      this.fx.spawnConfetti(80);
      this._playIf('level_clear');
    }
    this.hooks.onLevelClear && this.hooks.onLevelClear({
      levelId: this.levelId, score: this.score, escapes: this.escapes, stars,
      accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
      isEndless: this.isEndless,
    });
  }

  /** 游戏结束后续命（广告奖励）：+2 生命并重开当前波 */
  continueAfterGameOver() {
    this.lives = 2;
    this.phase = 'intro';
    this.ducks = [];       /* BOSS 战续命：BOSS 保留当前血量，普通鸭清空重飞 */
    this._startWave(true);
  }

  /** 广告补弹 */
  refillAmmo() {
    this.bullets = this.isEndless ? ENDLESS.bullets : this.level.bullets;
    this.noAmmoFlash = 0;
    this.fx.spawnScore(this.scope.x, this.scope.y - 60, '+AMMO', true, 36);
    this._playIf('reload');
  }

  /* ======================================================================
   * 准星（原作物。理 + 键盘/拖拽双输入）
   * ====================================================================== */
  _updateScope(dt) {
    const k = dt * 60;   /* 帧率归一化（原作 30fps 常量换算） */
    let ax = 0, ay = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) ax -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) ax += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) ay -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) ay += 1;
    if (ax || ay) {
      const n = Math.hypot(ax, ay) || 1;
      this.scope.vx += (ax / n) * SCOPE.acceleration * k;
      this.scope.vy += (ay / n) * SCOPE.acceleration * k;
      this.idleT = 0;
      this.guide && this.guide.notify('moved');
    }
    this.scope.vx *= Math.pow(SCOPE.friction, k);
    this.scope.vy *= Math.pow(SCOPE.friction, k);
    const sp = Math.hypot(this.scope.vx, this.scope.vy);
    if (sp > SCOPE.maxSpeed) {
      this.scope.vx = (this.scope.vx / sp) * SCOPE.maxSpeed;
      this.scope.vy = (this.scope.vy / sp) * SCOPE.maxSpeed;
    }
    this.scope.x = clamp(this.scope.x + this.scope.vx * k, 0, W);
    this.scope.y = clamp(this.scope.y + this.scope.vy * k, 0, H);
  }

  /* ======================================================================
   * 渲染
   * ====================================================================== */
  render() {
    const g = this.g;
    g.clearRect(0, 0, W, H);
    this.scene.drawSky(g);
    this.scene.drawClouds(g);
    this.scene.drawMid(g);

    /* 鸭群（含菜单氛围鸭） */
    this.fx.drawBack(g);
    const list = this.mode === 'menu' ? this.menuDucks : this.ducks;
    for (const d of list) {
      if (!d.spawned && this.mode === 'playing') continue;
      drawDuck(g, {
        x: d.x, y: d.y,
        scale: d.scale, dir: d.dir,
        palette: d.palette,
        wingPhase: d.wingPhase,
        state: d.state === 'hit' ? 'hit' : d.state === 'fall' ? 'fall' : 'fly',
        rotation: d.rot || 0,
        beakOpen: d.beakOpen,
        blink: d.blinkT < 0,
        dizzy: d.dizzy,
        squashY: d.squashY && d.state === 'hit' ? d.squashY : null,
        acc: {
          balloon: d.balloon ? { color: d.balloon.color, phase: d.bobP } : null,
          mask: d.mask, angry: d.angry,
        },
        sparkle: d.golden && d.state === 'fly',
        t: this.t,
      });
    }

    /* BOSS（受击闪白光晕 + 专属装扮） */
    if (this.boss && this.boss.state !== 'gone') {
      const b = this.boss;
      if (b.hitFlash > 0) {
        g.save();
        const gl = g.createRadialGradient(b.x, b.y, 10, b.x, b.y, 120 * b.cfg.scale);
        gl.addColorStop(0, `rgba(255,255,255,${b.hitFlash * 0.55})`);
        gl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gl;
        g.beginPath(); g.arc(b.x, b.y, 120 * b.cfg.scale, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      drawDuck(g, this._bossDraw(b));
    }

    this.scene.drawFront(g);
    this.fx.drawFront(g);
    if (this.mods && this.mods.includes('fog') && this.mode === 'playing') this.fx.drawFog(g);

    /* 夜幕聚光 + 准星（仅游戏进行中） */
    if (this.mode === 'playing') {
      const night = this.mods.includes('night');
      drawScope(g, this.scope, { night, t: this.t });
    }

    /* HUD */
    if (this.mode === 'playing') {
      drawHUD(g, {
        score: this.score,
        scoreLabel: t('hudScore'),
        waveText: this.isEndless
          ? `${t('miscEndlessWave')} ${this.endlessSet + 1} · ${t('hudWave')} ${this.wave + 1}`
          : this.mods.includes('boss') ? `${t('hudLevel')} ${this.levelId} · ${t('mod_boss')}`
          : `${t('hudLevel')} ${this.levelId} · ${t('hudWave')} ${this.wave + 1}`,
        bullets: this.bullets,
        maxBullets: this.isEndless ? ENDLESS.bullets : this.level.bullets,
        lives: this.lives,
        maxLives: this.isEndless ? ENDLESS.lives : this.level.lives,
        hitLog: this.hitLog,
        bonusPct: this.phase === 'play' ? this.bonusMs / CFG.bonusTime : null,
        streak: this.streak,
        streakLabel: t('modCombo'),
        noAmmo: this.noAmmoFlash > 0,
        noAmmoText: t('hudNoAmmo'),
        idleHint: this._idleHint && this.phase === 'play' ? t('hudIdleHint') : null,
        boss: this.boss && this.boss.state !== 'dying' ? { name: t('boss_' + this.boss.type), hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
        banner: this.banner,
        t: this.t,
      });
      this.guide && this.guide.draw(g);
    }

    /* 菜单 LOGO 与氛围 */
    if (this.mode === 'menu') {
      g.save();
      g.translate(0, Math.sin(this.t * 1.1) * 5);
      drawLogo(g, W / 2 - 300, 96, 600, this.t);
      g.restore();
    }
  }

  /** BOSS 绘制参数（按类型组装装扮） */
  _bossDraw(b, override) {
    const acc = { angry: b.enraged };
    if (b.cfg.hat) acc.hat = b.cfg.hat;
    if (b.cfg.glasses) acc.glasses = b.cfg.glasses;
    if (b.cfg.weak === 'belly') acc.buckle = true;
    if (b.cfg.weak === 'chest') acc.medal = true;
    if (b.bells) {
      acc.bells = b.bells.slice();
      acc.bells.active = b.activeBell;
    }
    if (b.cfg.armor && b.plates === 0) acc.hat = null;   /* 盔甲被打飞 */
    return {
      x: b.x, y: b.y,
      scale: b.cfg.scale, dir: b.dir,
      palette: override ? undefined : b.cfg.palette,
      wingPhase: b.wingPhase,
      state: b.state === 'dying' ? 'fall' : 'fly',
      rotation: b.rotation || 0,
      beakOpen: b.beakOpen,
      blink: (b.blinkT || 2) < 0,
      acc,
      sparkle: false,
      t: this.t,
    };
  }

  /* ======================================================================
   * 主循环启动（requestAnimationFrame + 固定步长）
   * ====================================================================== */
  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      /* 单帧异常只丢当前帧，不冻结整个游戏（rAF 在 finally 中照常续排） */
      try {
        if (!this.paused) {
          this._acc += dt;
          const step = 1 / 60;
          let n = 0;
          while (this._acc >= step && n < 4) { this.update(step); this._acc -= step; n++; }
        }
        this.render();
      } catch (e) {
        console.error('[loop] 帧异常（已跳过）', e);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
