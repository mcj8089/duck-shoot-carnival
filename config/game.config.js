/**
 * ============================================================================
 * DUCK SHOOT CARNIVAL —— 全局游戏配置
 * ----------------------------------------------------------------------------
 * 集中管理：画布尺寸、准星物理参数（与原作一致的加速度/摩擦/限速）、
 * 玩法数值（子弹数/生命/基础分/奖励时间）、音频清单、场景主题色板、
 * 调试开关。修改数值只需改这里，无需触碰游戏逻辑。
 * ============================================================================
 */
export const GAME_CONFIG = {

  /** 游戏标识与站点（分享/OG/域名锁共用） */
  meta: {
    id: 'duck-shoot-carnival',
    title: 'Duck Shoot Carnival',
    titleZh: '嘉年华打鸭子',
    site: 'pipygames.com',
    siteUrl: 'https://pipygames.com',
    version: '1.0.0',
  },

  /** 画布：与原作一致的 1024x768（4:3）逻辑分辨率，等比缩放居中 */
  canvas: {
    designWidth: 1024,
    designHeight: 768,
    maxPixelRatio: 2,        // DPR 上限（移动端降配防过载）
    fps: 60,
  },

  /** 准星物理：数值取自原作 CMain 配置（scope_accelleration/friction/max_speed） */
  scope: {
    acceleration: 2.0,       // 按键加速度（像素/帧²，帧率归一化到 60fps）
    friction: 0.85,          // 速度摩擦衰减系数
    maxSpeed: 40,            // 限速（像素/帧）
    radius: 74,              // 准星可视半径
    hitRadius: 15,           // 靶心判定半径
  },

  /** 玩法核心数值（对应原作 num_bullets/lives/hit_score/bonus_time） */
  gameplay: {
    bulletsPerWave: 3,       // 每波子弹数（关卡可覆盖）
    livesPerLevel: 4,        // 每关生命
    hitScore: 100,           // 命中基础分
    bonusTime: 4000,         // 波次奖励倒计时（毫秒），越快命中分越高
    timeBonusDiv: 10,        // 奖励分 = 剩余毫秒 / 10
    streakMax: 5,            // 连击倍率上限
    goldenChance: 0.18,      // 金鸭出现概率（golden 关卡）
    goldenScoreMul: 3,       // 金鸭分数倍率
    duckBaseDuration: 8.2,   // 鸭子基础飞行时长（秒，speed=1 时）
    waveIntroTime: 1.6,      // 波次开场横幅时长（秒）
    waveClearTime: 1.5,      // 波次清空庆祝时长（秒）
    hitFreezeTime: 0.42,     // 命中后僵直时长（秒）
    fallDuration: 1.05,      // 中弹坠落时长（秒）
  },

  /** 场景主题色板（马卡龙嘉年华配色） */
  theme: {
    skyDay:    ['#8fd8ff', '#c9f0ff', '#eafff4'],
    skyDusk:   ['#ffb36b', '#ff8e7a', '#b76ea4'],
    skyNight:  ['#101a3a', '#1d2c58', '#2c3f74'],
    skyStorm:  ['#3a4256', '#4d5870', '#61708c'],
    grass:     ['#7cc242', '#5aa32e', '#3f7d1f'],
    ground:    '#8a5a2b',
    wood:      ['#c98a4b', '#a5642f', '#7c4720'],
    woodLight: '#e8b878',
    cream:     '#fff3d9',
    accentRed: '#e84b3c',
    accentYellow: '#ffcc33',
    accentGreen: '#66c04b',
    accentBlue: '#4fb2e5',
    uiPanel:   'rgba(61,36,14,0.88)',
  },

  /** 音频清单：文件名 => {vol 音量, loop 是否循环, music 是否 BGM}（全部原创合成） */
  audio: {
    ui_click:   { vol: 0.7 },
    ui_hover:   { vol: 0.35 },
    ui_back:    { vol: 0.6 },
    ui_error:   { vol: 0.6 },
    shot:       { vol: 1.0 },
    dry_fire:   { vol: 0.8 },
    reload:     { vol: 0.85 },
    duck_hit:   { vol: 1.0 },
    quack:      { vol: 0.9 },
    quack_sad:  { vol: 0.9 },
    flap:       { vol: 0.25 },
    thud:       { vol: 0.9 },
    feather:    { vol: 0.7 },
    golden:     { vol: 0.95 },
    balloon_pop:{ vol: 0.95 },
    clang:      { vol: 0.9 },
    bonus:      { vol: 0.9 },
    wave_clear: { vol: 1.0 },
    level_clear:{ vol: 1.0 },
    level_fail: { vol: 1.0 },
    boss_roar:  { vol: 1.0 },
    boss_hit:   { vol: 0.95 },
    boss_down:  { vol: 1.0 },
    duckling:   { vol: 0.8 },
    star:       { vol: 0.85 },
    tick:       { vol: 0.4 },
    thunder:    { vol: 1.0 },
    whoosh:     { vol: 0.5 },
    share_pop:  { vol: 0.8 },
    copy:       { vol: 0.7 },
    bgm_menu:   { music: true, vol: 0.42, loop: true },
    bgm_day:    { music: true, vol: 0.45, loop: true },
    bgm_night:  { music: true, vol: 0.4,  loop: true },
    bgm_boss:   { music: true, vol: 0.5,  loop: true },
  },

  /** 调试开关 */
  debug: {
    skipSplash: false,       // 跳过开屏（自动化测试用）
    showFps: false,
  },
};
