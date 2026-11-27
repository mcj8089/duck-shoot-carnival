/**
 * ============================================================================
 * audio.js —— 音频管理模块
 * ----------------------------------------------------------------------------
 * 负责预加载 assets/audio/ 下全部原创 WAV（由 tools/gen_audio.py 程序化合成，
 * 无任何原作采样），管理音效 / BGM 双通道：
 *  · play(name, {vol, rate})   单发音效（80ms 同名去重防炸耳）
 *  · playVar(name)             带随机变调的音效
 *  · music(name)               无缝循环 BGM，旧曲淡出、新曲淡入
 *  · setSound / setMusic       用户设置（持久化到存档）
 * 全链路异常防护：AudioContext 不可用 / 解码失败 / file:// 环境均静默降级，
 * 绝不阻塞游戏启动。
 * ============================================================================
 */
import { GAME_CONFIG } from '../../config/game.config.js';

const MANIFEST = GAME_CONFIG.audio;

class AudioManager {
  constructor() {
    this.buffers = new Map();    // name => { buf, meta }
    this.ctx = null;             // AudioContext（用户手势后懒创建）
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.currentMusic = null;
    this.musicSource = null;
    this._recent = new Map();    // 同名去重时间戳
    this.unlocked = false;
    this.disabled = false;
  }

  /** 预加载全部 WAV（进度回调驱动开屏进度条） */
  async preload(onProgress) {
    const names = Object.keys(MANIFEST);
    let done = 0;
    const jobs = names.map(async (name) => {
      const meta = MANIFEST[name];
      try {
        /* file:// 双击版：Chrome 禁止 fetch 本地文件，直接跳过避免 404 刷屏 */
        if (location.protocol === 'file:') throw new Error('file:// audio disabled');
        const res = await fetch(`assets/audio/${name}.wav`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const ab = await res.arrayBuffer();
        const ctx = this.ensureCtx();
        if (!ctx) throw new Error('audio disabled');
        const buf = await ctx.decodeAudioData(ab);
        this.buffers.set(name, { buf, meta });
      } catch (e) {
        if (e.message !== 'file:// audio disabled') {
          console.warn(`[audio] 加载失败(忽略): ${name}`);
        }
      }
      done++;
      onProgress && onProgress(done / names.length);
    });
    await Promise.all(jobs);
  }

  /** 获取（或创建）AudioContext；失败返回 null 并永久静音，不抛异常 */
  ensureCtx() {
    if (!this.disabled) {
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) throw new Error('AudioContext unsupported');
          this.ctx = new AC();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 1;
          this.masterGain.connect(this.ctx.destination);
          this.sfxGain = this.ctx.createGain();
          this.sfxGain.gain.value = 1;
          this.sfxGain.connect(this.masterGain);
          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.value = 0;
          this.musicGain.connect(this.masterGain);
        } catch (e) {
          console.warn('[audio] 无法创建 AudioContext，已静音运行');
          this.ctx = null;
          this.disabled = true;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }
    return this.ctx;
  }

  /** 用户手势解锁（开屏点击开始时调用） */
  unlock() {
    try { this.ensureCtx(); } catch (e) { this.disabled = true; }
    this.unlocked = true;
  }

  /** 应用存档中的声音开关设置 */
  applySettings() {
    const s = window.__SAVE__?.data.settings || { sound: true, music: true };
    if (this.sfxGain) this.sfxGain.gain.value = s.sound ? 1 : 0;
    if (this.musicGain) {
      this.musicGain.gain.value = (s.music && this.currentMusic)
        ? (MANIFEST[this.currentMusic]?.vol ?? 0.5) : 0;
    }
  }

  /** 播放单发音效；未解锁/被禁用/未加载时静默 */
  play(name, opt = {}) {
    if (!this.ctx || !this.sfxGain) return;
    const entry = this.buffers.get(name);
    if (!entry) return;
    const s = window.__SAVE__?.data.settings;
    if (s && !s.sound) return;
    const now = performance.now();
    if (this._recent.get(name) && now - this._recent.get(name) < 80) return;
    this._recent.set(name, now);
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = entry.buf;
      src.playbackRate.value = opt.rate ?? 1;
      const g = this.ctx.createGain();
      g.gain.value = (opt.vol ?? 1) * (entry.meta.vol ?? 1);
      src.connect(g); g.connect(this.sfxGain);
      src.start();
    } catch (e) { /* 播放异常静默 */ }
  }

  /** 带随机变调的播放（鸭子叫声/命中音更自然） */
  playVar(name, baseVol = 1) {
    this.play(name, { vol: baseVol, rate: 0.92 + Math.random() * 0.16 });
  }

  /** 切换 BGM（无缝：旧曲淡出 0.6s，新曲淡入 1.2s） */
  music(name) {
    if (!this.ctx) { this.currentMusic = name; return; }
    if (this.currentMusic === name) return;
    const s = window.__SAVE__?.data.settings || { music: true };
    const t0 = this.ctx.currentTime;
    if (this.musicSource) {
      const old = this.musicSource;
      const oldGain = this.musicGain.gain.value;
      this.musicGain.gain.cancelScheduledValues(t0);
      this.musicGain.gain.setValueAtTime(oldGain, t0);
      this.musicGain.gain.linearRampToValueAtTime(0, t0 + 0.6);
      setTimeout(() => { try { old.stop(); } catch (e) {} }, 700);
      this.musicSource = null;
    }
    this.currentMusic = name;
    if (!name) return;
    const entry = this.buffers.get(name);
    if (!entry) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = entry.buf;
      src.loop = true;
      src.connect(this.musicGain);
      src.start();
      this.musicSource = src;
      this.musicGain.gain.setValueAtTime(0, t0);
      this.musicGain.gain.linearRampToValueAtTime(s.music ? (entry.meta.vol ?? 0.5) : 0, t0 + 1.2);
    } catch (e) { /* 静默 */ }
  }
}

export const Audio2 = new AudioManager();
