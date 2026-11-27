/**
 * ============================================================================
 * DUCK SHOOT CARNIVAL —— 域名锁配置
 * ----------------------------------------------------------------------------
 * 游戏仅允许在下列域名下运行：
 *   1. 本地开发：localhost / 127.0.0.1 / *.localhost
 *   2. 正式站点：pipygames.com / www.pipygames.com / 子域 *.pipygames.com
 * 其他域名加载完成后展示警告并等待 3 秒，自动跳转至 redirectUrl。
 * ============================================================================
 */
export const DOMAIN_CONFIG = {
  /** 是否启用域名锁（本地调试可临时关闭） */
  enabled: true,

  /** 是否放行 file:// 协议：dist 单文件版「双击即玩」依赖此项（本地单机运行视为已授权） */
  allowFileProtocol: true,

  /** 精确允许的主机名（小写） */
  allowExact: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'pipygames.com',
    'www.pipygames.com',
  ],

  /** 后缀白名单：任意子域，例如 foo.localhost / game.pipygames.com */
  allowSuffix: [
    '.localhost',
    '.pipygames.com',
  ],

  /** 本地开发常见端口一律放行（留空表示命中主机白名单后不限制端口） */
  allowPorts: [],

  /** 未授权时等待几秒后跳转 */
  redirectDelay: 3,

  /** 跳转目标 */
  redirectUrl: 'https://pipygames.com',
};
