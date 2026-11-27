/**
 * ============================================================================
 * DUCK SHOOT CARNIVAL —— 关卡配置表
 * ----------------------------------------------------------------------------
 * 设计目标：每关都有「真正不同」的玩法机制，杜绝"每关都差不多"。
 *
 * 机制修饰符（mods）说明：
 *   classic  经典猎鸭（无修饰）
 *   twin     双鸭同飞：每波鸭子成对出现
 *   golden   金鸭出没：概率出现金光闪闪的金鸭，3 倍分数
 *   wind     大风天：侧风持续吹偏鸭群轨迹，场景风车加速、旗帜狂舞
 *   night    夜巡：全场昏暗，仅准星聚光灯范围内可见
 *   balloon  气球节：鸭子抓着气球飞，先打爆气球鸭子才会缓缓下坠
 *   speed    极速冲刺：鸭子速度大幅提升、体型略小
 *   small    迷你鸭群：鸭子体型缩小，命中更考验准头
 *   fog      晨雾：漂移的浓雾团遮挡视野
 *   mirror   镜像双打：左右两侧同时起飞鸭群
 *   armored  小丑面具鸭：第一枪打掉面具（鸭子加速发怒），第二枪才得分
 *   storm    雷暴：全场昏暗 + 周期闪电照亮 + 阵风
 *   boss     BOSS 战：type 指定 BOSS（baron / major / quacker）
 *
 * BOSS 均有专属造型与技能机制（护甲弹反弱点、召唤鸭群、多阶段）。
 * 关卡难度曲线：速度、鸭数、子弹数平滑递增，禁止开局劝退。
 * ============================================================================
 */
export const LEVELS = [
  /* ------------------------- 第一章：嘉年华开园 ------------------------- */
  { id: 1,  nameKey: 'lvl1',  mods: ['classic'],                    waves: 3, ducks: [1, 1, 2], speed: 1.0,  bullets: 3, lives: 4 },
  { id: 2,  nameKey: 'lvl2',  mods: ['twin'],                      waves: 3, ducks: [2, 2, 2], speed: 1.0,  bullets: 3, lives: 4 },
  { id: 3,  nameKey: 'lvl3',  mods: ['golden'],                    waves: 3, ducks: [2, 2, 2], speed: 1.05, bullets: 3, lives: 4 },
  { id: 4,  nameKey: 'lvl4',  mods: ['wind'],                      waves: 3, ducks: [2, 2, 3], speed: 1.1,  bullets: 3, lives: 4 },
  { id: 5,  nameKey: 'lvl5',  mods: ['boss'], boss: { type: 'baron',   hp: 6, speed: 1.0, ducklings: 2 }, bullets: 4, lives: 4 },

  /* ------------------------- 第二章：昼夜变幻 --------------------------- */
  { id: 6,  nameKey: 'lvl6',  mods: ['night'],                     waves: 3, ducks: [2, 2, 2], speed: 1.1,  bullets: 3, lives: 4 },
  { id: 7,  nameKey: 'lvl7',  mods: ['balloon'],                   waves: 3, ducks: [2, 2, 3], speed: 1.1,  bullets: 3, lives: 4 },
  { id: 8,  nameKey: 'lvl8',  mods: ['speed', 'small'],            waves: 3, ducks: [3, 3, 3], speed: 1.6,  bullets: 4, lives: 4 },
  { id: 9,  nameKey: 'lvl9',  mods: ['fog'],                       waves: 3, ducks: [2, 3, 3], speed: 1.15, bullets: 3, lives: 4 },
  { id: 10, nameKey: 'lvl10', mods: ['boss'], boss: { type: 'major',   hp: 8, speed: 1.15, ducklings: 2 }, bullets: 4, lives: 4 },

  /* ------------------------- 第三章：马戏团狂欢 ------------------------- */
  { id: 11, nameKey: 'lvl11', mods: ['mirror'],                    waves: 3, ducks: [4, 4, 6], speed: 1.2,  bullets: 4, lives: 4 },
  { id: 12, nameKey: 'lvl12', mods: ['armored'],                   waves: 3, ducks: [2, 2, 3], speed: 1.2,  bullets: 4, lives: 4 },
  { id: 13, nameKey: 'lvl13', mods: ['storm'],                     waves: 3, ducks: [2, 3, 3], speed: 1.25, bullets: 4, lives: 4 },
  { id: 14, nameKey: 'lvl14', mods: ['speed', 'small', 'golden'],  waves: 3, ducks: [3, 3, 4], speed: 1.7,  bullets: 4, lives: 4 },
  { id: 15, nameKey: 'lvl15', mods: ['boss'], boss: { type: 'quacker', hp: 10, speed: 1.1, ducklings: 3 }, bullets: 5, lives: 4 },

  /* ------------------------- 第四章：混合风暴 --------------------------- */
  { id: 16, nameKey: 'lvl16', mods: ['wind', 'mirror'],            waves: 3, ducks: [4, 4, 6], speed: 1.3,  bullets: 4, lives: 4 },
  { id: 17, nameKey: 'lvl17', mods: ['night', 'fog'],              waves: 3, ducks: [3, 3, 3], speed: 1.3,  bullets: 4, lives: 4 },
  { id: 18, nameKey: 'lvl18', mods: ['balloon', 'speed'],          waves: 3, ducks: [3, 3, 4], speed: 1.75, bullets: 4, lives: 4 },
  { id: 19, nameKey: 'lvl19', mods: ['storm', 'twin'],             waves: 3, ducks: [4, 4, 4], speed: 1.35, bullets: 4, lives: 4 },
  { id: 20, nameKey: 'lvl20', mods: ['boss'], boss: { type: 'baron',   hp: 9, speed: 1.25, ducklings: 3, elite: true }, bullets: 5, lives: 4 },

  /* ------------------------- 第五章：巅峰挑战 --------------------------- */
  { id: 21, nameKey: 'lvl21', mods: ['golden', 'twin'],            waves: 3, ducks: [4, 4, 5], speed: 1.4,  bullets: 4, lives: 4 },
  { id: 22, nameKey: 'lvl22', mods: ['fog', 'mirror'],             waves: 3, ducks: [4, 4, 6], speed: 1.4,  bullets: 4, lives: 4 },
  { id: 23, nameKey: 'lvl23', mods: ['armored', 'speed'],          waves: 3, ducks: [3, 4, 4], speed: 1.8,  bullets: 5, lives: 4 },
  { id: 24, nameKey: 'lvl24', mods: ['storm', 'night'],            waves: 3, ducks: [3, 4, 4], speed: 1.45, bullets: 4, lives: 4 },
  { id: 25, nameKey: 'lvl25', mods: ['boss'], boss: { type: 'major',   hp: 12, speed: 1.35, ducklings: 4, elite: true }, bullets: 5, lives: 4 },

  /* ------------------------- 终章：终极嘉年华 --------------------------- */
  { id: 26, nameKey: 'lvl26', mods: ['mirror', 'small', 'speed'],  waves: 3, ducks: [6, 6, 6], speed: 1.85, bullets: 5, lives: 4 },
  { id: 27, nameKey: 'lvl27', mods: ['wind', 'storm', 'golden'],   waves: 3, ducks: [4, 4, 5], speed: 1.5,  bullets: 4, lives: 4 },
  { id: 28, nameKey: 'lvl28', mods: ['fog', 'night', 'armored'],   waves: 3, ducks: [4, 4, 4], speed: 1.5,  bullets: 5, lives: 4 },
  { id: 29, nameKey: 'lvl29', mods: ['storm', 'mirror', 'small'],  waves: 3, ducks: [6, 6, 8], speed: 1.6,  bullets: 5, lives: 4 },
  { id: 30, nameKey: 'lvl30', mods: ['boss'], boss: { type: 'quacker', hp: 15, speed: 1.3, ducklings: 4, final: true }, bullets: 6, lives: 5 },
];

/** 通 关后解锁：无限嘉年华（无尽模式，机制随机组合、难度持续爬升） */
export const ENDLESS = {
  id: 'endless', nameKey: 'endless', mods: [], waves: Infinity,
  speedBase: 1.2, speedGrow: 0.06, bullets: 4, lives: 4,
  /** 每轮（每 3 波）随机抽 1-3 种机制，保证体验持续新鲜 */
  pool: ['twin', 'golden', 'wind', 'night', 'balloon', 'speed', 'small', 'fog', 'mirror', 'armored', 'storm'],
};

/** BOSS 定义：专属造型参数、飞行轨迹、护甲与弱点、阶段技能（art/duck.js 消费） */
export const BOSSES = {
  /** 火 Baron Von Plume —— 金冠鹅男爵：礼帽+单片镜，头盔弹反，肚皮弱点 */
  baron: {
    scale: 2.6, palette: 'goose',
    hat: 'tophat', glasses: 'monocle',
    armor: 'helmet',            // 头部护甲：命中头部时"当"一声弹反（无伤）
    weak: 'belly',              // 弱点：金色扣环肚皮（呼吸高亮引导）
    pattern: 'figure8',         // 8 字巡游轨迹
    enragedSpeed: 1.5,          // 阶段 2 提速
  },
  /** 军 Major Mallard —— 绿头鸭少校：军盔+勋章，冲锋突进，召唤鸭小队 */
  major: {
    scale: 2.4, palette: 'mallard',
    hat: 'helmet', glasses: null,
    armor: 'helmet',
    weak: 'chest',              // 弱点：胸口红色靶标
    pattern: 'dash',            // 高速冲刺轨迹
    enragedSpeed: 1.7,
  },
  /** 帽 The Great Quacker —— 马戏团领班巨鸭：礼帽+领结，华尔兹旋转，三铃弱点 */
  quacker: {
    scale: 3.0, palette: 'ringmaster',
    hat: 'tophat', glasses: null,
    armor: null,
    weak: 'bells',              // 弱点：三个铃铛轮流点亮，打灭全部才掉血
    pattern: 'waltz',           // 圆舞曲轨迹
    enragedSpeed: 1.6,
  },
};

/** 按关卡 id 取关卡定义（越界安全） */
export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || null;
}

/** 总关卡数（UI 关卡选择网格用） */
export const LEVEL_COUNT = LEVELS.length;
