/**
 * ============================================================================
 * DUCK SHOOT CARNIVAL —— 多语言文案
 * ----------------------------------------------------------------------------
 * 支持英文（默认）/ 中文双语，通过配置参数切换：
 *   · 默认语言由 DEFAULT_LANG 控制（不显示语言切换按钮）；
 *   · URL 参数 ?lang=zh 可临时覆盖（便于本地验证）。
 * 同一页面只渲染一种语言的文案，绝不混排。
 * ============================================================================
 */

/** 默认语言（正式站点固定英文） */
export const DEFAULT_LANG = 'en';

export const LOCALES = {

  /* ================================ 英文 ================================ */
  en: {
    /* --- 开屏 --- */
    splashSiteTip: 'Best free games, every week',
    splashLoading: 'LOADING',
    splashTapToStart: 'TAP TO START',

    /* --- 主菜单 --- */
    menuTagline: 'The Greatest Duck Carnival!',
    menuPlay: 'PLAY',
    menuLevels: 'LEVELS',
    menuHow: 'HOW TO PLAY',
    menuBest: 'Best Score',
    menuContinue: 'CONTINUE LV.',

    /* --- 关卡选择 --- */
    lsTitle: 'SELECT LEVEL',
    lsLocked: 'Complete previous level to unlock',
    lsEndless: 'ENDLESS',
    lsEndlessLocked: 'Finish level 30 to unlock',
    lsStars: 'Stars',

    /* --- HUD --- */
    hudScore: 'SCORE',
    hudWave: 'WAVE',
    hudLevel: 'LEVEL',
    hudBonus: 'BONUS',
    hudNoAmmo: 'NO AMMO!',
    hudWaveClear: 'WAVE CLEAR!',
    hudReload: 'RELOADED!',
    hudDucksLeft: 'DUCKS',
    hudIdleHint: 'Aim at a duck!',

    /* --- 机制名称与说明（关卡开场卡） --- */
    mod_classic: 'Classic Hunt',
    mod_twin: 'Twin Trouble',
    mod_golden: 'Golden Ducks',
    mod_wind: 'Windy Meadow',
    mod_night: 'Night Watch',
    mod_balloon: 'Balloon Festival',
    mod_speed: 'Rush Hour',
    mod_small: 'Mini Flock',
    mod_fog: 'Morning Fog',
    mod_mirror: 'Double Trouble',
    mod_armored: 'Masked Clowns',
    mod_storm: 'Thunder Storm',
    mod_boss: 'BOSS BATTLE',
    desc_classic: 'Shoot the ducks before they fly away!',
    desc_twin: 'Ducks always fly in pairs!',
    desc_golden: 'Spot the golden ducks — triple score!',
    desc_wind: 'The wind blows ducks off course. Watch the flags!',
    desc_night: 'Dark night! Only your spotlight reveals the ducks.',
    desc_balloon: 'Ducks ride balloons — pop the balloon first!',
    desc_speed: 'Super fast ducks! Keep your aim steady.',
    desc_small: 'Mini ducks, tiny targets!',
    desc_fog: 'Thick fog drifts across the meadow.',
    desc_mirror: 'Ducks attack from BOTH sides at once!',
    desc_armored: 'Clown ducks wear masks — two hits to score!',
    desc_storm: 'Lightning flashes reveal the flock. Mind the wind!',
    desc_boss: 'A giant boss duck appears! Hit its weak spot!',
    modCombo: 'COMBO',

    /* --- BOSS --- */
    boss_baron: 'Baron Von Plume',
    boss_major: 'Major Mallard',
    boss_quacker: 'The Great Quacker',
    bossDefeated: 'BOSS DEFEATED!',
    bossWeakHint: 'Hit the glowing weak spot!',

    /* --- 结算弹框 --- */
    dlgLevelClear: 'LEVEL CLEAR!',
    dlgGameOver: 'GAME OVER',
    dlgStageScore: 'Score',
    dlgEscaped: 'Ducks Escaped',
    dlgAccuracy: 'Accuracy',
    dlgNext: 'NEXT LEVEL',
    dlgReplay: 'REPLAY',
    dlgMenu: 'MAIN MENU',
    dlgResume: 'RESUME',
    dlgRestart: 'RESTART',
    dlgSettings: 'SETTINGS',
    dlgQuit: 'QUIT',
    dlgContinue: 'CONTINUE',
    dlgWatchAd: 'WATCH AD',
    dlgGiveUp: 'GIVE UP',
    dlgRetry: 'TRY AGAIN',
    dlgPlusLives: 'Revive with 2 lives?',
    dlgAmmoOffer: 'Out of ammo! Refill for free?',

    /* --- 设置 --- */
    setTitle: 'SETTINGS',
    setSound: 'Sound FX',
    setMusic: 'Music',
    setTutorial: 'PLAY TUTORIAL',
    setClose: 'CLOSE',

    /* --- 新手教学（分步引导） --- */
    tutStep: 'STEP',
    tutSkip: 'SKIP',
    tut1Title: 'AIM THE GUN',
    tut1Touch: 'Drag anywhere to move the crosshair.',
    tut1Mouse: 'Move with ARROW KEYS or drag the mouse.',
    tut2Title: 'FIRE!',
    tut2Touch: 'Tap the SHOOT button to fire.',
    tut2Mouse: 'CLICK or press SPACE to fire.',
    tut3Title: 'WATCH YOUR AMMO',
    tut3Text: 'Only 3 shells per wave. Make every shot count!',
    tut4Title: 'DEFEND THE CARNIVAL',
    tut4Text: 'If a duck flies away, you lose a heart!',
    tut5Title: 'STREAK BONUS',
    tut5Text: 'Hit ducks back-to-back to multiply your score!',
    tutTapContinue: 'Tap anywhere to continue',
    tutReplayDone: 'Tutorial finished!',

    /* --- 实时提示 --- */
    hintEscape: 'A duck is escaping!',
    hintNoAmmo: 'No ammo — wait for ducks to leave!',

    /* --- 分享 --- */
    shareTitle: 'SHARE THE FUN',
    shareNickname: 'Your nickname (optional)',
    shareText: '@{name} invite you to the greatest Duck Shoot Carnival!',
    shareTextNoName: 'Come shoot ducks at the greatest Duck Shoot Carnival!',
    shareCopy: 'Link copied! Open the app and paste it',
    shareCardTip: 'Card saved! Open {p} app and post it with the link.',
    shareClose: 'CLOSE',
    sharePlatform: 'SHARE',

    /* --- 通用 --- */
    miscLoading: 'Loading',
    miscRotate: 'Please rotate your device',
    miscNewRecord: 'NEW RECORD!',
    miscPaused: 'PAUSED',
    miscAdBtn: 'FREE',
    miscEndlessWave: 'ENDLESS',
  },

  /* ================================ 中文 ================================ */
  zh: {
    /* --- 开屏 --- */
    splashSiteTip: '每周精品免费小游戏',
    splashLoading: '加载中',
    splashTapToStart: '点击开始',

    /* --- 主菜单 --- */
    menuTagline: '史上最欢乐的鸭子嘉年华！',
    menuPlay: '开始游戏',
    menuLevels: '关卡选择',
    menuHow: '玩法说明',
    menuBest: '最高分',
    menuContinue: '继续关卡',

    /* --- 关卡选择 --- */
    lsTitle: '选择关卡',
    lsLocked: '通关上一关后解锁',
    lsEndless: '无尽模式',
    lsEndlessLocked: '通关第 30 关解锁',
    lsStars: '星级',

    /* --- HUD --- */
    hudScore: '得分',
    hudWave: '波次',
    hudLevel: '关卡',
    hudBonus: '奖励',
    hudNoAmmo: '没有子弹！',
    hudWaveClear: '本波清空！',
    hudReload: '已装填！',
    hudDucksLeft: '剩余鸭子',
    hudIdleHint: '瞄准鸭子开火！',

    /* --- 机制名称与说明 --- */
    mod_classic: '经典猎鸭',
    mod_twin: '双鸭齐飞',
    mod_golden: '金鸭出没',
    mod_wind: '大风草场',
    mod_night: '夜间巡逻',
    mod_balloon: '气球庆典',
    mod_speed: '极速冲刺',
    mod_small: '迷你鸭群',
    mod_fog: '晨雾弥漫',
    mod_mirror: '左右夹击',
    mod_armored: '面具小丑鸭',
    mod_storm: '雷暴闪电',
    mod_boss: 'BOSS 决战',
    desc_classic: '在鸭子飞走之前把它们打下来！',
    desc_twin: '鸭子总是成双成对出现！',
    desc_golden: '找到金闪闪的金鸭——三倍分数！',
    desc_wind: '大风会吹偏鸭群轨迹，盯紧旗帜！',
    desc_night: '深夜一片漆黑，只有你的探照灯能照亮鸭子。',
    desc_balloon: '鸭子抓着气球飞——先把气球打爆！',
    desc_speed: '超级高速鸭！稳住你的准星。',
    desc_small: '迷你鸭群，超小目标！',
    desc_fog: '浓雾在草场上空缓缓漂移。',
    desc_mirror: '鸭群从左右两侧同时进攻！',
    desc_armored: '小丑鸭戴着面具——两枪才能得分！',
    desc_storm: '闪电会照亮鸭群，小心侧风！',
    desc_boss: '巨型 BOSS 鸭登场！瞄准弱点开火！',
    modCombo: '连击',

    /* --- BOSS --- */
    boss_baron: '金冠鹅男爵',
    boss_major: '绿头鸭少校',
    boss_quacker: '大话痨领班',
    bossDefeated: 'BOSS 击败！',
    bossWeakHint: '攻击发光的弱点！',

    /* --- 结算弹框 --- */
    dlgLevelClear: '关卡通过！',
    dlgGameOver: '游戏结束',
    dlgStageScore: '本关得分',
    dlgEscaped: '逃脱鸭子',
    dlgAccuracy: '命中率',
    dlgNext: '下一关',
    dlgReplay: '重新挑战',
    dlgMenu: '返回主菜单',
    dlgResume: '继续游戏',
    dlgRestart: '重新开始',
    dlgSettings: '游戏设置',
    dlgQuit: '退出关卡',
    dlgContinue: '继续游戏',
    dlgWatchAd: '观看广告',
    dlgGiveUp: '放弃挑战',
    dlgRetry: '再试一次',
    dlgPlusLives: '看广告复活并获得 2 条生命？',
    dlgAmmoOffer: '子弹用完了！看广告免费补满？',

    /* --- 设置 --- */
    setTitle: '游戏设置',
    setSound: '游戏音效',
    setMusic: '背景音乐',
    setTutorial: '重看新手教学',
    setClose: '关闭',

    /* --- 新手教学 --- */
    tutStep: '第',
    tutSkip: '跳过',
    tut1Title: '瞄准猎枪',
    tut1Touch: '按住屏幕拖动即可移动准星。',
    tut1Mouse: '使用方向键移动，或按住鼠标拖动。',
    tut2Title: '开火！',
    tut2Touch: '点击射击按钮开火。',
    tut2Mouse: '点击鼠标或按空格键开火。',
    tut3Title: '注意弹药',
    tut3Text: '每波只有 3 发子弹，务必弹无虚发！',
    tut4Title: '保卫嘉年华',
    tut4Text: '让鸭子飞走了会损失一颗爱心！',
    tut5Title: '连击奖励',
    tut5Text: '连续命中鸭子可获得翻倍分数！',
    tutTapContinue: '点击任意位置继续',
    tutReplayDone: '教学完成！',

    /* --- 实时提示 --- */
    hintEscape: '有鸭子要逃走了！',
    hintNoAmmo: '没有子弹——等鸭子飞离吧！',

    /* --- 分享 --- */
    shareTitle: '分享快乐',
    shareNickname: '你的昵称（可选）',
    shareText: '@{name} 邀请你来玩最欢乐的嘉年华打鸭子！',
    shareTextNoName: '快来嘉年华打鸭子，一起百发百中！',
    shareCopy: '链接已复制！打开对应 App 粘贴发布',
    shareCardTip: '卡片已保存！打开 {p} 发布并粘贴链接。',
    shareClose: '关闭',
    sharePlatform: '分享到',

    /* --- 通用 --- */
    miscLoading: '加载中',
    miscRotate: '请将设备横过来游玩',
    miscNewRecord: '新纪录！',
    miscPaused: '已暂停',
    miscAdBtn: '免费',
    miscEndlessWave: '无尽',
  },
};

/* -------------------------------------------------------------------------- */
/* 语言状态与查询 API                                                           */
/* -------------------------------------------------------------------------- */
let _lang = DEFAULT_LANG;

/** 初始化语言：URL ?lang= 参数 > 默认配置（仅允许 en/zh） */
export function initLocale(urlParam) {
  const q = (urlParam || '').toLowerCase();
  if (q === 'zh' || q === 'zh-cn' || q === 'zh-hans') _lang = 'zh';
  else if (q === 'en') _lang = 'en';
  else _lang = DEFAULT_LANG;
  return _lang;
}

/** 当前语言代码 */
export function getLang() { return _lang; }

/** 是否中文 */
export function isZh() { return _lang === 'zh'; }

/** 文案查询：t('menuPlay')；支持 t('shareText', { name: 'Tom' }) 占位符替换 */
export function t(key, params) {
  const pack = LOCALES[_lang] || LOCALES.en;
  let s = pack[key] != null ? pack[key] : (LOCALES.en[key] != null ? LOCALES.en[key] : key);
  if (params && typeof s === 'string') {
    for (const k in params) s = s.split('{' + k + '}').join(params[k]);
  }
  return s;
}
