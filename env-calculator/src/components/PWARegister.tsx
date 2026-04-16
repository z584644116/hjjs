'use client';

import { useEffect } from 'react';

/**
 * 在生产环境注册 Service Worker,为现场无网场景提供离线可用能力。
 *
 * dev 环境不注册,避免 Turbopack 热更新被缓存拦截。
 * 微信内置浏览器 / 非 secure context 下的 SW 注册会静默失败,不影响正常使用。
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 静默失败,例如微信内置、非 secure context
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
