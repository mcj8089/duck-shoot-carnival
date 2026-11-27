/**
 * ============================================================================
 * domainLock.js —— 域名锁
 * ----------------------------------------------------------------------------
 * 校验当前运行域名是否在白名单（localhost / pipygames.com / file:// 单机版）。
 * 未授权域名：展示警告遮罩，等待 redirectDelay 秒后自动跳转至官方站点。
 * ============================================================================
 */
import { DOMAIN_CONFIG } from '../../config/domains.config.js';

class DomainLockImpl {
  /** @returns {boolean} 当前环境是否被授权 */
  check() {
    if (!DOMAIN_CONFIG.enabled) return true;

    /* file:// 单机版（dist 双击即玩）直接放行 */
    if (DOMAIN_CONFIG.allowFileProtocol && location.protocol === 'file:') return true;

    const host = location.hostname.toLowerCase().replace(/\.$/, '');
    if (DOMAIN_CONFIG.allowExact.includes(host)) return true;
    for (const suffix of DOMAIN_CONFIG.allowSuffix) {
      if (host.endsWith(suffix)) return true;
    }
    return false;
  }

  /** 未授权时启动拦截流程：警告遮罩 + 倒计时跳转；返回是否已放行 */
  guard(onBlock) {
    if (this.check()) return true;
    const delay = DOMAIN_CONFIG.redirectDelay || 3;
    onBlock && onBlock(delay);
    setTimeout(() => { location.href = DOMAIN_CONFIG.redirectUrl; }, delay * 1000);
    return false;
  }
}

/* 单例导出（类名与实例名不可同名，避免模块作用域重复声明错误） */
export const DomainLock = new DomainLockImpl();
