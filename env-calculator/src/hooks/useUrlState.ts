'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 把字符串字典状态双向同步到 URL hash。
 *
 * - 初次挂载从 `window.location.hash` 读取,覆盖 initial 中已存在的键。
 * - 状态变化通过 `history.replaceState` 回写 hash(不污染浏览器历史,不触发 Next.js 导航)。
 * - 空字符串键不写入 hash,保持 URL 简洁。
 *
 * 设计上只支持 `Record<string, string>`,与当前项目所有 NumberInput 字符串输入保持一致。
 */
export function useUrlState<T extends Record<string, string>>(
  initial: T,
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = useState<T>(initial);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const raw = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!raw) return;

    const params = new URLSearchParams(raw);
    const picked: Record<string, string> = {};
    (Object.keys(initial) as string[]).forEach((key) => {
      const value = params.get(key);
      if (value !== null) picked[key] = value;
    });
    if (Object.keys(picked).length > 0) {
      setState((prev) => ({ ...prev, ...picked }));
    }
  }, [initial]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
      if (value !== '' && value != null) params.set(key, String(value));
    });
    const next = params.toString();
    const nextHash = next ? `#${next}` : '';
    const current = window.location.hash;

    if (nextHash !== current) {
      const url = `${window.location.pathname}${window.location.search}${nextHash}`;
      window.history.replaceState(null, '', url);
    }
  }, [state]);

  const update = useCallback((updates: Partial<T>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return [state, update];
}
