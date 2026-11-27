/**
 * ============================================================================
 * ads.js —— 广告模块（预留）
 * ----------------------------------------------------------------------------
 * 当前为 mock 模式：所有广告位弹模拟弹窗并直接发放奖励。
 * 接入真实 SDK 时只需替换 showRewarded/showInterstitial 内部实现。
 * 所有调用链路异常防护：广告系统任何问题都不允许影响游戏本体。
 * ============================================================================
 */
import { ADS_CONFIG } from '../../config/ads.config.js';

class AdsManager {
  constructor() {
    this.onEvent = null;       // 埋点钩子
    this._sessionCount = 0;
    this._lastInterstitial = 0;
    this.mockVisible = false;
    this.mockDismiss = null;   // mock 弹窗关闭回调（UI 层渲染）
  }

  hook(fn) { this.onEvent = fn; }
  _track(event, data) { this.onEvent && this.onEvent(event, data); }

  get enabled() { return ADS_CONFIG.enabled; }

  /** 频次控制：该广告位当前是否可展示 */
  _canShow(placementKey) {
    const p = ADS_CONFIG.placements[placementKey];
    if (!ADS_CONFIG.enabled || !p || !p.enabled) return false;
    if (this._sessionCount >= ADS_CONFIG.frequency.sessionAdCap) return false;
    if (p.type === 'rewarded' && this._sessionCount >= ADS_CONFIG.frequency.rewardedMaxPerSession) return false;
    return true;
  }

  /**
   * 展示激励视频
   * @param {string} key 广告位 key（见 ads.config.js）
   * @param {function} onReward 奖励发放回调
   * @param {function} [onFail] 展示失败/不可用回调
   */
  showRewarded(key, onReward, onFail) {
    this._track('ad_request', { key, type: 'rewarded' });
    if (!this._canShow(key)) { onFail && onFail(); return; }
    /* mock：直接发放奖励（真实接入时替换为 SDK 调用） */
    if (ADS_CONFIG.provider.mode === 'mock') {
      this._sessionCount++;
      this._track('ad_reward', { key, mock: true });
      setTimeout(() => { try { onReward(); } catch (e) { console.warn('[ads]', e); } }, 50);
      return;
    }
    onFail && onFail();
  }

  /** 展示插屏（频次受控） */
  showInterstitial(key) {
    const now = Date.now();
    if (now - this._lastInterstitial < ADS_CONFIG.frequency.interstitialMinGap * 1000) return;
    if (!this._canShow(key)) return;
    this._lastInterstitial = now;
    this._sessionCount++;
    this._track('ad_interstitial', { key, mock: true });
    /* mock：插屏仅记录埋点，不实际打断玩家 */
  }
}

export const Ads = new AdsManager();
