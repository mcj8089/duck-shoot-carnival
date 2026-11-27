/**
 * ============================================================================
 * main.js —— 启动流程与 SDK 初始化
 * ----------------------------------------------------------------------------
 * 启动链路：
 *  ① 域名锁校验（未授权域名 3 秒后跳转 pipygames.com，直接终止启动）
 *  ② 多语言初始化（URL ?lang= > 默认英文）+ 开屏文案注入
 *  ③ 画布自适应（4:3 等比缩放 + DPR 上限，移动端降配）
 *  ④ 开屏两段式：站点 pipygames.com → 加载进度（音频预载）
 *  ⑤ 用户点击开始 → 解锁音频 → 主菜单（首次进入第 1 关触发新手教学）
 * ============================================================================
 */
import { GAME_CONFIG } from '../config/game.config.js';
import { initLocale, t, getLang } from '../config/locales.js';
import { GameSDKInstance } from './sdk/sdk.js';
import { Audio2 } from './core/audio.js';
import { Save } from './core/save.js';
import { Ads } from './core/ads.js';
import { Share } from './core/share.js';
import { W, H } from './art/util.js';
import { drawLogo } from './art/logo.js';
import { Game } from './game/engine.js';
import { Guide } from './game/guide.js';
import { UI } from './ui/ui.js';

/* ============================ ① 域名锁 → ② 多语言 → 开屏 ============================ */
/* init() 为 async（返回 Promise），必须等待真实校验结果——
 * 若同步取 Promise 判断则恒为真值，拦截逻辑永远失效。
 * 用 Promise 链而非顶层 await：构建目标 iife/es2020 不支持 TLA。 */
GameSDKInstance.init().then((domainOk) => {
  if (!domainOk) {
    console.error('[main] 域名未授权，3 秒后跳转（见 SDK 遮罩提示）');
    return;
  }
  /* ② 多语言（URL ?lang= > 存档语言 > 默认英文） */
  initLocale(new URLSearchParams(location.search).get('lang'));
  applyLocale();
  /* ④⑤ 开屏两段式 + 游戏启动 */
  bootSplash();
});

function applyLocale() {
  document.title = getLang() === 'zh'
    ? `${GAME_CONFIG.meta.titleZh} - 免费在线打鸭子游戏`
    : document.title;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

/* ============================ ③ 画布自适应 ============================ */
const canvas = document.getElementById('game-canvas');
let renderScale = Math.min(window.devicePixelRatio || 1, GAME_CONFIG.canvas.maxPixelRatio);

function fitCanvas() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const k = Math.min(vw / W, vh / H);
  const cssW = Math.floor(W * k), cssH = Math.floor(H * k);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  /* 移动端降配：小屏 DPR 上限 1.5 */
  renderScale = Math.min(window.devicePixelRatio || 1, Math.min(vw, vh) < 700 ? 1.5 : GAME_CONFIG.canvas.maxPixelRatio);
  canvas.width = Math.floor(W * renderScale);
  canvas.height = Math.floor(H * renderScale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);
window.addEventListener('orientationchange', () => setTimeout(fitCanvas, 120));

/* ============================ ④⑤ 开屏与启动 ============================ */
const splash = document.getElementById('splash');
const siteEl = document.getElementById('splash-site');
const loadEl = document.getElementById('splash-loading');
const fillEl = document.getElementById('load-fill');
const pctEl = document.getElementById('load-pct');
const startBtn = document.getElementById('splash-start');

function showPhase(el, ms) {
  return new Promise((res) => {
    for (const p of [siteEl, loadEl]) p.classList.remove('on');
    el.classList.add('on');
    setTimeout(res, ms);
  });
}

async function bootSplash() {
  /* 第 1 帧：站点品牌（0.95s） */
  await showPhase(siteEl, 950);
  if (GAME_CONFIG.debug.skipSplash) return finishSplash();
  /* 第 2 帧：加载进度（真实音频预载 + 最低展示 1.2s） */
  loadEl.classList.add('on');
  let progress = 0;
  const drawBar = () => {
    fillEl.style.width = (progress * 100).toFixed(0) + '%';
    pctEl.textContent = (progress * 100).toFixed(0) + '%';
  };
  const minWait = new Promise((res) => setTimeout(res, 1200));
  const t0 = performance.now();
  await Audio2.preload((p) => {
    progress = Math.max(progress, p);
    drawBar();
  });
  progress = 1;
  drawBar();
  await minWait;
  console.log(`[boot] 音频预载完成 ${(performance.now() - t0) / 1000 | 0}s`);
  startBtn.style.visibility = 'visible';
  startBtn.classList.add('pulse');
  await new Promise((res) => startBtn.addEventListener('click', res, { once: true }));
  finishSplash();
}

let game, ui;

function finishSplash() {
  splash.classList.add('out');
  setTimeout(() => splash.remove(), 650);
  Audio2.unlock();
  Audio2.applySettings();
  Audio2.music('bgm_menu');

  /* 引擎 + 引导 + UI */
  game = new Game(canvas, {
    onLevelClear: (res) => ui.showLevelClear(res),
    onGameOver: (res) => ui.showGameOver(res),
    onAmmoEmpty: () => ui.showAmmoOffer(),
    onEvent: (ev, data) => GameSDKInstance.track(ev, data),
  });
  game.guide = new Guide(game);
  ui = new UI(game);
  window.__game = game;   /* 调试句柄：自动化测试 / 控制台排查用 */
  window.__UI__ = ui;     /* UI 句柄：测试需重开面板（如提权后刷新关卡解锁态） */

  /* 广告与分享接线 */
  Ads.hook((ev, data) => GameSDKInstance.track('ads_' + ev, data));
  Share.setSnapshot(() => { try { return canvas.toDataURL('image/png'); } catch (e) { return null; } });
  Share.setLogoDraw((g, x, y, w, h) => drawLogo(g, x, y, w, 0, { duck: false }));

  game.start();
  ui.showMenu();
}

/* 开屏 LOGO 预绘制（加载帧的品牌形象） */
const splashLogoCv = document.getElementById('splash-logo');
if (splashLogoCv) {
  const g = splashLogoCv.getContext('2d');
  let lt = 0;
  const drawSplashLogo = () => {
    if (!document.body.contains(splashLogoCv)) return;
    g.clearRect(0, 0, 460, 240);
    drawLogo(g, 10, 10, 440, lt);
    lt += 0.016;
    requestAnimationFrame(drawSplashLogo);
  };
  drawSplashLogo();
}

/* 全局存档引用（音频模块读取设置用） */
window.__SAVE__ = Save;
