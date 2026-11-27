/**
 * ============================================================================
 * DUCK SHOOT CARNIVAL —— 广告 SDK 预留配置
 * ----------------------------------------------------------------------------
 * 预留广告位与渠道开关，后续接入真实 SDK（如 AdSense / H5 联盟 / Pangle 等）
 * 只需在 provider 中填入 account / appId，并在 src/core/ads.js 的
 * showRewarded() 里替换为真实 SDK 调用即可，游戏逻辑零改动。
 * 当前 provider.mode = 'mock'：激励广告弹模拟弹窗并直接发放奖励。
 * ============================================================================
 */
export const ADS_CONFIG = {
  /** 是否启用广告系统（false 时所有广告位静默直发奖励，便于本地调试） */
  enabled: true,

  /** SDK 提供方 */
  provider: {
    mode: 'mock',            // 'mock' | 'adsense' | 'pangle' | 'custom'
    accountId: '',           // TODO: 填入广告账号 ID
    appId: '',               // TODO: 填入应用 ID
    testMode: true,          // 测试模式（真实接入前必须为 true）
  },

  /** 频次控制（防骚扰） */
  frequency: {
    interstitialMinGap: 120,   // 插屏最小间隔（秒）
    rewardedMaxPerSession: 20, // 每会话激励视频上限
    sessionAdCap: 40,          // 每会话总广告上限
  },

  /** 广告位注册表：key => { type, channel 渠道开关, note 展示时机, enabled 开关 } */
  placements: {
    splash_interstitial: { type: 'interstitial', channel: 'pangle',  note: '开屏加载完成后（可选插屏）',      enabled: false },
    reward_revive:       { type: 'rewarded',    channel: 'pangle',  note: '游戏结束后看广告续命（+2 生命）', enabled: true  },
    reward_ammo_pack:    { type: 'rewarded',    channel: 'pangle',  note: '弹尽粮绝时看广告补满弹药',       enabled: true  },
    reward_double_star:  { type: 'rewarded',    channel: 'pangle',  note: '结算页双倍分数奖励',            enabled: true  },
    pause_banner:        { type: 'banner',      channel: 'adsense', note: '暂停页底部横幅（预留）',         enabled: false },
  },
};
