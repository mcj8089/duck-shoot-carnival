/**
 * ============================================================================
 * ui.js —— DOM 界面层
 * ----------------------------------------------------------------------------
 * 管理：主菜单 / 关卡选择网格 / 暂停与设置 / 关卡结算 / 游戏结束 /
 * 广告补弹 / 分享面板（昵称输入 + 9 平台图标 + 卡片方案）/ 竖屏提示。
 * 弹框按钮严格遵循对齐规范：偶数个 → 一排 2 个；奇数个 → 每个宽度 100% 逐行。
 * 全部按钮/面板为嘉年华木质完整设计样式，禁止白底与极简线条占位。
 * ============================================================================
 */
import { GAME_CONFIG } from '../../config/game.config.js';
import { LEVELS, ENDLESS } from '../../config/levels.js';
import { t } from '../../config/locales.js';
import { Save } from '../core/save.js';
import { Audio2 } from '../core/audio.js';
import { Ads } from '../core/ads.js';
import { Share, PLATFORMS, ICON_PATHS } from '../core/share.js';
import { GameSDKInstance } from '../sdk/sdk.js';

const $ = (sel) => document.querySelector(sel);

/** 星星 SVG（实心/空心） */
const starSVG = (fill) => `<svg viewBox="0 0 24 24" class="star${fill ? ' on' : ''}"><path d="M12 2l2.9 6.26 6.6.72-4.9 4.55 1.35 6.47L12 16.7 6.05 20l1.35-6.47L2.5 8.98l6.6-.72L12 2z"/></svg>`;
const lockSVG = `<svg viewBox="0 0 24 24" class="lock"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"/></svg>`;

export class UI {
  constructor(game) {
    this.game = game;
    this.root = $('#ui-root');
    this._buildPersistent();
  }

  /* ==================== 常驻元素（暂停键 / 竖屏提示 / toast） ==================== */
  _buildPersistent() {
    /* 暂停按钮（游戏中右上角，避开 HUD 爱心区域） */
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'btn-icon pause-btn';
    this.pauseBtn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.6" height="16" rx="2"/><rect x="13.4" y="4" width="4.6" height="16" rx="2"/></svg>`;
    this.pauseBtn.addEventListener('click', () => { this.sfx('ui_click'); this.showPause(); });
    this.root.appendChild(this.pauseBtn);

    /* 竖屏提示 */
    this.rotate = document.createElement('div');
    this.rotate.className = 'rotate-overlay';
    this.rotate.innerHTML = `<div class="rotate-icon"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12a10 10 0 0 1 3-7M22 12a10 10 0 0 1-3 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div><p>${t('miscRotate')}</p>`;
    this.root.appendChild(this.rotate);

    /* toast */
    this.toast = document.createElement('div');
    this.toast.className = 'toast';
    this.root.appendChild(this.toast);
  }

  sfx(name) { try { Audio2.play(name); } catch (e) {} }

  showToast(msg, ms = 1800) {
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toast.classList.remove('show'), ms);
  }

  /* ==================== 弹框基础 ==================== */
  /** 生成弹框：title + body HTML + buttons（按钮按奇偶自动布局） */
  dialog({ id, title, body, buttons, onOpen }) {
    const wrap = document.createElement('div');
    wrap.className = 'dlg-wrap';
    wrap.id = id || '';
    const panel = document.createElement('div');
    panel.className = 'dlg-panel';
    let html = `<h2 class="dlg-title">${title}</h2>`;
    if (body) html += `<div class="dlg-body">${body}</div>`;
    if (buttons && buttons.length) {
      /* 对齐规范：偶数 → 一排 2 个；奇数 → 100% 宽度逐行 */
      const even = buttons.length % 2 === 0;
      html += `<div class="dlg-btns ${even ? 'even' : 'odd'}">`;
      for (const b of buttons) {
        html += `<button class="btn ${b.cls || ''}" data-act="${b.act}">${b.label}</button>`;
      }
      html += `</div>`;
    }
    panel.innerHTML = html;
    wrap.appendChild(panel);
    this.root.appendChild(wrap);
    /* 按钮事件 */
    panel.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sfx('ui_click');
        const act = btn.dataset.act;
        const def = (buttons || []).find((b) => b.act === act);
        def && def.on && def.on();
      });
    });
    onOpen && onOpen(panel);
    /* 入场动画 */
    requestAnimationFrame(() => wrap.classList.add('show'));
    this.game.paused = true;
    this.game.uiBlock = true;
    return wrap;
  }

  closeDialog(wrap) {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 260);
    this.game.paused = false;
    this.game.uiBlock = false;
  }

  hideAll() {
    this.root.querySelectorAll('.dlg-wrap, .menu-overlay, .ls-overlay').forEach((el) => el.remove());
    this.game.paused = false;
    this.game.uiBlock = false;
  }

  /* ==================== 主菜单 ==================== */
  showMenu() {
    this.hideAll();
    this.pauseBtn.style.display = 'none';
    this.game.toMenu();
    Audio2.music && Audio2.music('bgm_menu');

    const el = document.createElement('div');
    el.className = 'menu-overlay';
    const best = Save.data.bestScore;
    const cont = Math.min(Save.data.maxLevel, LEVELS.length);
    el.innerHTML = `
      <div class="menu-btns">
        <button class="btn btn-primary" data-act="play">${t('menuPlay')} ${cont > 1 ? `<small>${t('menuContinue')} ${cont}</small>` : ''}</button>
        <button class="btn" data-act="levels">${t('menuLevels')}</button>
        <button class="btn" data-act="how">${t('menuHow')}</button>
        <button class="btn" data-act="settings">${t('dlgSettings')}</button>
      </div>
      <div class="menu-best">${t('menuBest')}<b>${best}</b></div>
      <button class="btn-icon share-fab" data-act="share" title="Share"><svg viewBox="0 0 24 24"><path d="M18 8a3 3 0 1 0-2.9-3.8L8.9 7.4a3 3 0 1 0 0 5.2l6.2 3.2A3 3 0 1 0 16 14l-6.2-3.2a3 3 0 0 0 0-.6L16 7a3 3 0 0 0 2 1z"/></svg></button>
    `;
    this.root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    el.querySelector('[data-act="play"]').addEventListener('click', () => {
      this.sfx('ui_click');
      this._startRealLevel(Math.min(Save.data.maxLevel, LEVELS.length));
    });
    el.querySelector('[data-act="levels"]').addEventListener('click', () => { this.sfx('ui_click'); this.showLevelSelect(); });
    el.querySelector('[data-act="how"]').addEventListener('click', () => {
      this.sfx('ui_click');
      /* 从菜单重看教学：演示模式 */
      el.remove();
      this.game.guide.start(true, () => this.showMenu());
    });
    el.querySelector('[data-act="settings"]').addEventListener('click', () => { this.sfx('ui_click'); this.showSettings(() => this.showMenu()); });
    el.querySelector('[data-act="share"]').addEventListener('click', () => { this.sfx('ui_click'); this.showShare(); });
  }

  /** 真实关卡启动（首次触发教学） */
  _startRealLevel(id) {
    this.hideAll();
    this.pauseBtn.style.display = '';
    const firstTime = !Save.data.tutorialSeen && id === 1;
    this.game.startLevel(id);
    this._setBgm();
    if (firstTime) {
      Save.data.tutorialSeen = true;
      Save.save();
      /* 教学随关卡同步进行：不冻结引擎（冻结会导致 guide.update 不被调用、
       * 鸭子不出生、教学永远卡死），第 1 关首波仅 1 只鸭，节奏足够教学 */
      this.game.guide.start(false, () => { this.game.paused = false; });
    }
  }

  _setBgm() {
    const m = this.game.mods || [];
    const name = m.includes('boss') ? 'bgm_boss' : (m.includes('night') || m.includes('storm')) ? 'bgm_night' : 'bgm_day';
    Audio2.music(name);
  }

  /* ==================== 关卡选择 ==================== */
  showLevelSelect() {
    this.hideAll();
    this.pauseBtn.style.display = 'none';
    const el = document.createElement('div');
    el.className = 'ls-overlay';
    let tiles = '';
    for (const lv of LEVELS) {
      const unlocked = lv.id <= Save.data.maxLevel;
      const stars = Save.getStars(lv.id);
      tiles += `
        <button class="ls-tile ${unlocked ? '' : 'locked'} ${lv.mods.includes('boss') ? 'boss' : ''}" data-lv="${lv.id}" ${unlocked ? '' : 'disabled'}>
          ${unlocked
            ? `<span class="ls-num">${lv.id}</span><span class="ls-stars">${starSVG(stars >= 1)}${starSVG(stars >= 2)}${starSVG(stars >= 3)}</span>${lv.mods.includes('boss') ? '<span class="ls-boss-tag">BOSS</span>' : ''}`
            : `<span class="ls-lock">${lockSVG}</span>`}
        </button>`;
    }
    const endlessOk = Save.data.endlessUnlocked;
    tiles += `
      <button class="ls-tile endless ${endlessOk ? '' : 'locked'}" data-lv="endless" ${endlessOk ? '' : 'disabled'}>
        ${endlessOk
          ? `<span class="ls-num">∞</span><span class="ls-stars">${starSVG(true)}${starSVG(true)}${starSVG(true)}</span><span class="ls-boss-tag">${t('lsEndless')}</span>`
          : `<span class="ls-lock">${lockSVG}</span>`}
      </button>`;

    el.innerHTML = `
      <h2 class="ls-title">${t('lsTitle')}</h2>
      <div class="ls-grid">${tiles}</div>
      <button class="btn btn-back" data-act="back">${t('dlgMenu')}</button>
    `;
    this.root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    el.querySelectorAll('.ls-tile:not(.locked)').forEach((tile) => {
      tile.addEventListener('click', () => {
        this.sfx('ui_click');
        const lv = tile.dataset.lv;
        this._startRealLevel(lv === 'endless' ? 'endless' : parseInt(lv, 10));
      });
    });
    el.querySelector('[data-act="back"]').addEventListener('click', () => { this.sfx('ui_click'); this.showMenu(); });
  }

  /* ==================== 暂停 ==================== */
  showPause() {
    if (this.game.mode !== 'playing') return;
    const wrap = this.dialog({
      title: t('miscPaused'),
      buttons: [
        { act: 'resume', label: t('dlgResume'), cls: 'btn-primary', on: () => { this.closeDialog(wrap); } },
        { act: 'restart', label: t('dlgRestart'), on: () => { this.closeDialog(wrap); this._startRealLevel(this.game.isEndless ? 'endless' : this.game.levelId); } },
        { act: 'settings', label: t('dlgSettings'), on: () => { wrap.remove(); this.showSettings(() => { this.hideAll(); this.pauseBtn.style.display = ''; this.game.paused = false; this.game.uiBlock = false; }); } },
        { act: 'quit', label: t('dlgQuit'), on: () => { this.closeDialog(wrap); this.showMenu(); } },
      ],
    });
  }

  /* ==================== 设置 ==================== */
  showSettings(onClose) {
    const s = Save.data.settings;
    const wrap = this.dialog({
      title: t('setTitle'),
      body: `
        <div class="set-row"><span>${t('setSound')}</span>
          <button class="switch ${s.sound ? 'on' : ''}" data-k="sound"><i></i></button></div>
        <div class="set-row"><span>${t('setMusic')}</span>
          <button class="switch ${s.music ? 'on' : ''}" data-k="music"><i></i></button></div>
      `,
      buttons: [
        { act: 'tutorial', label: t('setTutorial'), cls: 'btn-green', on: () => { this.closeDialog(wrap); this.pauseBtn.style.display = 'none'; this.game.guide.start(true, () => this.showMenu()); } },
        { act: 'close', label: t('setClose'), on: () => { this.closeDialog(wrap); onClose && onClose(); } },
      ],
      onOpen: (panel) => {
        panel.querySelectorAll('.switch').forEach((sw) => {
          sw.addEventListener('click', () => {
            const k = sw.dataset.k;
            Save.data.settings[k] = !Save.data.settings[k];
            Save.save();
            sw.classList.toggle('on');
            Audio2.applySettings();
            this.sfx('ui_click');
          });
        });
      },
    });
  }

  /* ==================== 关卡结算 ==================== */
  showLevelClear(res) {
    GameSDKInstance.track('level_clear', res);
    if (res.isEndless) return;   // 无尽模式不弹结算，直接由 gameover 收尾
    const isRecord = Save.completeLevel(res.levelId, res.stars, res.score);
    const nextId = res.levelId + 1;
    const hasNext = nextId <= LEVELS.length;
    const buttons = [];
    if (hasNext) buttons.push({ act: 'next', label: t('dlgNext'), cls: 'btn-primary', on: () => { this.closeDialog(wrap); this._startRealLevel(nextId); } });
    buttons.push({ act: 'replay', label: t('dlgReplay'), on: () => { this.closeDialog(wrap); this._startRealLevel(res.levelId); } });
    buttons.push({ act: 'menu', label: t('dlgMenu'), on: () => { this.closeDialog(wrap); this.showMenu(); } });

    const wrap = this.dialog({
      title: t('dlgLevelClear'),
      body: `
        <div class="stars-row">${starSVG(res.stars >= 1)}${starSVG(res.stars >= 2)}${starSVG(res.stars >= 3)}</div>
        ${isRecord ? `<div class="new-record">${t('miscNewRecord')}</div>` : ''}
        <div class="res-grid">
          <div><i>${t('dlgStageScore')}</i><b>${res.score}</b></div>
          <div><i>${t('dlgEscaped')}</i><b>${res.escapes}</b></div>
          <div><i>${t('dlgAccuracy')}</i><b>${res.accuracy}%</b></div>
        </div>
      `,
      buttons,
    });
    /* 星星逐个弹出 */
    wrap.querySelectorAll('.stars-row .star').forEach((st, i) => {
      st.style.animationDelay = `${0.25 + i * 0.28}s`;
    });
    if (Ads.enabled) Ads.showInterstitial('splash_interstitial');
  }

  /* ==================== 游戏结束 ==================== */
  showGameOver(res) {
    GameSDKInstance.track('game_over', res);
    const isRecord = Save.data.bestScore < res.score;
    Save.data.bestScore = Math.max(Save.data.bestScore, res.score);
    Save.save();
    let adUsed = false;

    const buttons = [
      {
        act: 'ad', label: `${t('dlgWatchAd')} · ${t('dlgContinue')}`, cls: 'btn-green',
        on: () => {
          if (adUsed) return;
          Ads.showRewarded('reward_revive',
            () => { adUsed = true; this.closeDialog(wrap); this.game.continueAfterGameOver(); },
            () => this.showToast(t('dlgGiveUp')));
        },
      },
      { act: 'retry', label: t('dlgRetry'), cls: 'btn-primary', on: () => { this.closeDialog(wrap); this._startRealLevel(this.game.isEndless ? 'endless' : this.game.levelId); } },
    ];

    const wrap = this.dialog({
      title: t('dlgGameOver'),
      body: `
        ${isRecord ? `<div class="new-record">${t('miscNewRecord')}</div>` : ''}
        <div class="res-grid">
          <div><i>${t('dlgStageScore')}</i><b>${res.score}</b></div>
          <div><i>${t('dlgEscaped')}</i><b>${res.escapes}</b></div>
          <div><i>${t('dlgAccuracy')}</i><b>${res.accuracy}%</b></div>
        </div>
      `,
      buttons,
    });
  }

  /* ==================== 弹尽补弹（激励广告） ==================== */
  showAmmoOffer() {
    const wasPaused = this.game.paused;
    const wrap = this.dialog({
      title: t('hudNoAmmo'),
      body: `<p class="dlg-text">${t('dlgAmmoOffer')}</p>`,
      buttons: [
        {
          act: 'ad', label: `${t('dlgWatchAd')} · ${t('miscAdBtn')}`, cls: 'btn-green',
          on: () => Ads.showRewarded('reward_ammo_pack',
            () => { this.closeDialog(wrap); this.game.refillAmmo(); },
            () => { this.closeDialog(wrap); }),
        },
        { act: 'no', label: t('dlgGiveUp'), on: () => this.closeDialog(wrap) },
      ],
    });
  }

  /* ==================== 分享面板 ==================== */
  showShare() {
    const platBtns = PLATFORMS.map((p) =>
      `<button class="plat ${p.card ? 'card-plat' : ''}" data-p="${p.id}" style="--pc:${p.color}" title="${p.name}">
        <svg viewBox="0 0 24 24"><path d="${ICON_PATHS[p.id]}"/></svg><span>${p.name}</span>
      </button>`).join('');

    const wrap = this.dialog({
      title: t('shareTitle'),
      body: `
        <input class="nick-input" id="share-nick" maxlength="16" placeholder="${t('shareNickname')}" />
        <div class="plat-grid">${platBtns}</div>
      `,
      buttons: [{ act: 'close', label: t('shareClose'), on: () => this.closeDialog(wrap) }],
      onOpen: (panel) => {
        panel.querySelectorAll('.plat').forEach((btn) => {
          btn.addEventListener('click', async () => {
            this.sfx('share_pop');
            const pid = btn.dataset.p;
            const nick = (panel.querySelector('#share-nick').value || '').trim();
            const platform = PLATFORMS.find((x) => x.id === pid);
            const result = await Share.share(pid, nick);
            if (result === 'card' && platform) {
              this.showToast(t('shareCardTip', { p: platform.name }), 2600);
            } else if (result === 'url') {
              this.showToast(t('shareCopy'), 2000);
            }
          });
        });
      },
    });
  }
}
