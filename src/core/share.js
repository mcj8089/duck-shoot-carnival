/**
 * ============================================================================
 * share.js —— 海外社媒分享模块
 * ----------------------------------------------------------------------------
 * 目标平台：Facebook / X(Twitter) / Reddit / WhatsApp / Telegram / LinkedIn /
 *          YouTube / TikTok / Instagram
 * 策略：
 *  ① 移动端优先 navigator.share（Web Share API）一键调起系统分享面板；
 *  ② 桌面端打开平台官方分享 URL（新标签页），自动带入链接与裂变文案；
 *  ③ YouTube / TikTok / Instagram 无通用网页分享接口 → Canvas 实时合成
 *     分享卡片（游戏截图 + 昵称 + 真实二维码 + 站点品牌条）+ 复制链接引导。
 * 所有分享动作触发 SDK 埋点（平台 + 结果），供裂变数据分析。
 * ============================================================================
 */
import { GAME_CONFIG } from '../../config/game.config.js';
import { t, getLang } from '../../config/locales.js';
import qrcode from '../sdk/qrcode.js';

/** 平台注册表：card=true 表示无通用网页接口、需走分享卡片方案 */
export const PLATFORMS = [
  { id: 'facebook',  name: 'Facebook',  color: '#1877F2', card: false,
    url: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: 'x',         name: 'X (Twitter)', color: '#000000', card: false,
    url: (u, txt) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(txt)}` },
  { id: 'reddit',    name: 'Reddit',     color: '#FF4500', card: false,
    url: (u, txt) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(txt)}` },
  { id: 'whatsapp',  name: 'WhatsApp',   color: '#25D366', card: false,
    url: (u, txt) => `https://api.whatsapp.com/send?text=${encodeURIComponent(txt + ' ' + u)}` },
  { id: 'telegram',  name: 'Telegram',   color: '#229ED9', card: false,
    url: (u, txt) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(txt)}` },
  { id: 'linkedin',  name: 'LinkedIn',   color: '#0A66C2', card: false,
    url: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { id: 'youtube',   name: 'YouTube',    color: '#FF0000', card: true },
  { id: 'tiktok',    name: 'TikTok',     color: '#010101', card: true },
  { id: 'instagram', name: 'Instagram',  color: '#E4405F', card: true },
];

/* 平台图标（品牌化完整造型 SVG path，24x24 视区） */
export const ICON_PATHS = {
  facebook: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z',
  x: 'M17.53 3H20.5l-6.52 7.45L21.5 21h-6.04l-4.73-6.18L5.36 21H2.38l6.97-7.97L2.5 3h6.2l4.28 5.66L17.53 3Zm-1.06 16.2h1.67L7.68 4.7H5.9l10.57 14.5Z',
  reddit: 'M22 12.14c0-1.1-.9-2-2-2-.55 0-1.04.22-1.4.58a9.8 9.8 0 0 0-5.14-1.5l.95-3.02 2.6.61a1.72 1.72 0 1 0 .17-1.02l-3-.7a.5.5 0 0 0-.58.33l-1.16 3.7a9.9 9.9 0 0 0-5.4 1.5 2 2 0 0 0-1.35-.53 1.99 1.99 0 0 0-.9 3.77c-.05.26-.09.52-.09.8 0 3.3 3.72 6 8.3 6s8.3-2.7 8.3-6c0-.27-.03-.53-.09-.79.48-.35.79-.9.79-1.53Zm-13.97 1.4a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Zm8.1 4.32c-1.02 1.02-2.98 1.1-3.56 1.1-.58 0-2.54-.08-3.56-1.1a.39.39 0 0 1 .55-.55c.64.64 2.02.87 3 .87.99 0 2.37-.23 3.01-.87a.39.39 0 0 1 .55.55Zm-.24-2.9a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z',
  whatsapp: 'M12.04 2a9.9 9.9 0 0 0-8.5 14.94L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm5.77 14.06c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.03.24-2.92-.61a11.2 11.2 0 0 1-4.54-4.03c-.6-.94-.9-1.94-.9-2.55 0-.62.32-1.2.7-1.55.36-.35.6-.44.86-.44h.62c.2 0 .47-.07.7.55l.94 2.3c.08.18.13.4-.02.6l-.42.56c-.14.17-.29.28-.13.55.17.28.75 1.24 1.6 2 1.1.99 2.03 1.3 2.32 1.44.29.15.46.12.63-.07l.9-1.05c.2-.24.4-.17.65-.08l1.9.9c.28.13.46.2.53.32.06.11.06.66-.18 1.32Z',
  telegram: 'M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.47-2.27 2.19c-.25.25-.46.46-.94.46l.34-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19L7.05 13.11l-4.64-1.45c-1.01-.32-1.03-1.01.21-1.5L20.63 3.1c.84-.3 1.58.2 1.31 1.5Z',
  linkedin: 'M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z',
  youtube: 'M23 12s0-3.4-.43-5.02a2.51 2.51 0 0 0-1.77-1.77C19.18 4.78 12 4.78 12 4.78s-7.18 0-8.8.43A2.51 2.51 0 0 0 1.43 6.98C1 8.6 1 12 1 12s0 3.4.43 5.02c.24.87.9 1.54 1.77 1.77 1.62.43 8.8.43 8.8.43s7.18 0 8.8-.43a2.51 2.51 0 0 0 1.77-1.77C23 15.4 23 12 23 12Zm-13 3.27V8.73L15.5 12 10 15.27Z',
  tiktok: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 1 1-2.9-2.9c.3 0 .59.05.86.13V9.35a6.34 6.34 0 0 0-.86-.06 6.34 6.34 0 1 0 6.34 6.34V9.53a8.16 8.16 0 0 0 4.78 1.52v-3.4a4.85 4.85 0 0 1-1-.96Z',
  instagram: 'M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16Zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z',
};

class ShareManager {
  constructor() {
    this.onEvent = null;
    this.pageUrl = GAME_CONFIG.meta.siteUrl;
    this.gameTitle = GAME_CONFIG.meta.title;
    this.snapshotProvider = null;   // 游戏注入：() => dataURL（当前画面）
    this.logoDraw = null;           // 游戏注入：(ctx,x,y,w,h) 绘制 LOGO
  }

  hook(fn) { this.onEvent = fn; }
  _track(event, data) { this.onEvent && this.onEvent(event, data); }

  setSnapshot(fn) { this.snapshotProvider = fn; }
  setLogoDraw(fn) { this.logoDraw = fn; }

  /** 组装裂变文案（可选昵称） */
  buildText(nickname) {
    if (getLang() === 'zh') {
      return nickname ? t('shareText', { name: nickname }) : t('shareTextNoName');
    }
    return nickname ? `@${nickname} invite you to the greatest Duck Shoot Carnival!`
                    : 'Come shoot ducks at the greatest Duck Shoot Carnival!';
  }

  _isTouch() { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0; }

  /**
   * 分享主入口
   * @returns {Promise<'native'|'url'|'card'|'fail'>}
   */
  async share(platformId, nickname) {
    const p = PLATFORMS.find((x) => x.id === platformId);
    if (!p) return 'fail';
    const text = this.buildText(nickname);
    this._track('share_click', { platform: platformId, nickname: !!nickname });

    /* ① 移动端：Web Share API（卡片式平台也走系统面板以带图） */
    if (this._isTouch() && navigator.share && !p.card) {
      try {
        await navigator.share({ title: this.gameTitle, text, url: this.pageUrl });
        this._track('share_result', { platform: platformId, result: 'native' });
        return 'native';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'native';
        /* 调起失败 → 落回平台 URL */
      }
    }

    /* ② 卡片式平台（YouTube / TikTok / Instagram）：生成卡片 + 复制链接 */
    if (p.card) {
      try { await this.makeCard(nickname, true); } catch (e) { console.warn('[share] 卡片生成失败', e); }
      this._copy(`${text} ${this.pageUrl}`);
      this._track('share_result', { platform: platformId, result: 'card' });
      return 'card';
    }

    /* ③ 桌面端：官方分享 URL 新标签页 */
    try {
      const url = p.url(this.pageUrl, text);
      window.open(url, '_blank', 'noopener,width=680,height=640');
      this._track('share_result', { platform: platformId, result: 'url' });
      return 'url';
    } catch (e) {
      this._copy(`${text} ${this.pageUrl}`);
      return 'fail';
    }
  }

  /** 复制到剪贴板（含降级） */
  _copy(text) {
    const done = () => this._track('share_result', { platform: 'clipboard', result: 'copied' });
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => this._copyFallback(text, done));
    } else this._copyFallback(text, done);
  }
  _copyFallback(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    ta.remove();
  }

  /**
   * 生成真实二维码 dataURL（qrcode-generator，MIT）
   * @param {string} text 二维码内容
   * @param {number} size 输出尺寸（像素）
   */
  makeQR(text, size = 220) {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      const cell = Math.floor(size / (count + 8));       // 含 4 模块静区
      const dim = cell * (count + 8);
      const cv = document.createElement('canvas');
      cv.width = dim; cv.height = dim;
      const g = cv.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, dim, dim);
      g.fillStyle = '#1d1206';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            g.fillRect(4 * cell + c * cell, 4 * cell + r * cell, cell + 0.5, cell + 0.5);
          }
        }
      }
      return cv.toDataURL('image/png');
    } catch (e) {
      console.warn('[share] QR 生成失败', e);
      return null;
    }
  }

  /**
   * 合成分享卡片 PNG（900x1350）
   * 结构：游戏截图底图 → 压暗 → 顶部品牌 → 标题+昵称 → 底部站点条 + 二维码
   * @param {string} [nickname]
   * @param {boolean} [autoDownload] 触发下载
   * @returns {Promise<string>} dataURL
   */
  async makeCard(nickname, autoDownload = false) {
    const W = 900, H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    /* --- 奶油嘉年华底 + 游戏截图 --- */
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffe9b8'); bg.addColorStop(1, '#ffd28a');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    let base = null;
    try {
      const data = this.snapshotProvider && this.snapshotProvider();
      if (data) base = await this._loadImg(data);
    } catch (e) {}
    if (base) {
      /* 卡片式内嵌截图（带白边圆角），覆盖 4:3 → 卡片比例 */
      const iw = W - 96, ih = Math.min(iw * base.height / base.width, 760);
      const ix = 48, iy = 210;
      g.save();
      this._roundRect(g, ix, iy, iw, ih, 28);
      g.clip();
      const s = Math.max(iw / base.width, ih / base.height);
      const bw = base.width * s, bh = base.height * s;
      g.drawImage(base, ix + (iw - bw) / 2, iy + (ih - bh) / 2, bw, bh);
      g.restore();
      /* 截图描边 */
      g.strokeStyle = '#ffffff'; g.lineWidth = 10;
      this._roundRect(g, ix, iy, iw, ih, 28); g.stroke();
      g.strokeStyle = 'rgba(160,90,20,0.25)'; g.lineWidth = 3;
      this._roundRect(g, ix - 6, iy - 6, iw + 12, ih + 12, 32); g.stroke();
    }

    /* --- 顶部彩旗带 + 标题 --- */
    this._bunting(g, W);
    g.textAlign = 'center';
    g.font = '900 72px "Comic Sans MS", "Comic Sans", "Chalkboard SE", sans-serif';
    g.lineWidth = 14; g.strokeStyle = '#5a2c0a'; g.lineJoin = 'round';
    g.strokeText('DUCK SHOOT', W / 2, 128);
    g.fillStyle = '#ffcf3f';
    g.fillText('DUCK SHOOT', W / 2, 128);
    g.font = '900 46px "Comic Sans MS", "Comic Sans", "Chalkboard SE", sans-serif';
    g.lineWidth = 10;
    g.strokeText('CARNIVAL', W / 2, 178);
    g.fillStyle = '#e84b3c';
    g.fillText('CARNIVAL', W / 2, 178);

    /* --- 中部：昵称 + 邀请文案 --- */
    const cy = 1050;
    g.font = '800 44px "Comic Sans MS", "Comic Sans", sans-serif';
    g.fillStyle = '#5a2c0a';
    g.fillText(nickname ? `@${nickname}` : '', W / 2, cy);
    g.font = '700 36px "Comic Sans MS", "Comic Sans", sans-serif';
    g.fillStyle = '#8a4a12';
    const invite = getLang() === 'zh' ? '快来嘉年华打鸭子吧！' : 'COME SHOOT DUCKS WITH ME!';
    g.fillText(invite, W / 2, cy + 52);

    /* --- 底部：二维码 + 站点条 --- */
    const qrImg = this.makeQR(this.pageUrl, 240);
    const barY = H - 210, barH = 170;
    g.fillStyle = '#7c4720';
    this._roundRect(g, 48, barY, W - 96, barH, 30); g.fill();
    g.strokeStyle = '#ffcf3f'; g.lineWidth = 6;
    this._roundRect(g, 48, barY, W - 96, barH, 30); g.stroke();
    if (qrImg) {
      const qr = await this._loadImg(qrImg);
      g.drawImage(qr, 76, barY + 17, 136, 136);
    }
    g.textAlign = 'left';
    g.font = '900 46px "Arial Black", Arial, sans-serif';
    g.fillStyle = '#ffcf3f';
    g.fillText(GAME_CONFIG.meta.site, qrImg ? 240 : 90, barY + 78);
    g.font = '600 28px Arial, sans-serif';
    g.fillStyle = '#ffffff';
    g.fillText(getLang() === 'zh' ? '扫码立即游玩' : 'SCAN & PLAY NOW', qrImg ? 242 : 90, barY + 126);

    /* --- LOGO 角标（游戏注入的画布绘制器） --- */
    if (this.logoDraw) { try { this.logoDraw(g, 40, 36, 190, 90); } catch (e) {} }

    const dataURL = cv.toDataURL('image/png');
    if (autoDownload) {
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = 'duck-shoot-carnival-share.png';
      a.click();
    }
    this._track('share_card', { nickname: !!nickname });
    return dataURL;
  }

  /** 顶部三角彩旗装饰带（完整造型，非几何占位：带绳结与双层配色） */
  _bunting(g, W) {
    const ropeY = 18;
    g.strokeStyle = '#8a4a12'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, ropeY); g.quadraticCurveTo(W / 2, ropeY + 26, W, ropeY); g.stroke();
    const n = Math.ceil(W / 72);
    for (let i = 0; i <= n; i++) {
      const x = i * 72, y = ropeY + 14 + Math.sin(i / n * Math.PI) * 24;
      const w = 40, h = 48;
      const colors = ['#e84b3c', '#ffcf3f', '#4fb2e5', '#66c04b'];
      const col = colors[i % colors.length];
      g.beginPath();
      g.moveTo(x - w / 2, y); g.lineTo(x + w / 2, y);
      g.quadraticCurveTo(x + w / 2, y + h * 0.7, x, y + h);
      g.quadraticCurveTo(x - w / 2, y + h * 0.7, x - w / 2, y);
      g.closePath();
      g.fillStyle = col; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.beginPath();
      g.moveTo(x - w / 2, y); g.quadraticCurveTo(x - w / 6, y + h * 0.5, x, y + h);
      g.quadraticCurveTo(x - w / 5, y + h * 0.5, x - w / 2, y);
      g.closePath(); g.fill();
    }
  }

  _loadImg(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
  }

  _roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
}

export const Share = new ShareManager();
