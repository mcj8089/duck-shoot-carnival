/**
 * ============================================================================
 * save.js —— 本地存档模块
 * ----------------------------------------------------------------------------
 * 基于 localStorage 的进度/设置存档：关卡解锁与星级、最高分、音画设置、
 * 新手教学标记、会话统计。任何读写异常都被吞掉（隐私模式 / 配额溢出），
 * 绝不阻塞游戏。
 * ============================================================================
 */
const KEY = 'duck-shoot-carnival-save-v1';

/** 存档默认结构 */
function defaults() {
  return {
    uid: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    bestScore: 0,
    maxLevel: 1,              // 已解锁的最大关卡（1 起）
    stars: {},                // { [levelId]: 1|2|3 }
    endlessUnlocked: false,
    tutorialSeen: false,
    settings: { sound: true, music: true },
    stats: { shots: 0, hits: 0, ducks: 0, bosses: 0 },
  };
}

class SaveManager {
  constructor() {
    this.data = defaults();
    this.load();
  }

  /** 从 localStorage 读取（损坏/缺失时用默认值） */
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        /* 浅合并，保证旧版本存档缺字段时可补默认值 */
        this.data = Object.assign(defaults(), parsed);
        this.data.settings = Object.assign(defaults().settings, parsed.settings || {});
        this.data.stats = Object.assign(defaults().stats, parsed.stats || {});
      }
    } catch (e) { /* 隐私模式等场景静默降级 */ }
  }

  /** 持久化（异常静默） */
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) {}
  }

  /* ----------------------- 进度 API ----------------------- */

  /** 通关某关卡：记录星级、解锁下一关；返回是否产生新记录 */
  completeLevel(levelId, stars, score) {
    const d = this.data;
    const prevBest = d.bestScore;
    d.stars[levelId] = Math.max(d.stars[levelId] || 0, stars);
    if (typeof levelId === 'number') d.maxLevel = Math.max(d.maxLevel, levelId + 1);
    if (levelId === 30) d.endlessUnlocked = true;
    d.bestScore = Math.max(d.bestScore, score);
    this.save();
    return score > prevBest;
  }

  getStars(levelId) { return this.data.stars[levelId] || 0; }

  /* ----------------------- 统计 API ----------------------- */
  addStat(field, n = 1) { this.data.stats[field] = (this.data.stats[field] || 0) + n; this.save(); }
}

export const Save = new SaveManager();
