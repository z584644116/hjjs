'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { calculatorNavItems } from '@/constants/navigation';
import { useHistoryStore } from '@/stores/history';

/**
 * 自动记录当前工具的计算历史。
 *
 * 当 `summary` 非空且稳定 1.2 秒后写入一条记录;输入抖动期内不会记录。
 * 当前路由未命中 `calculatorNavItems` 时静默跳过,未来新增工具页面只需在 navigation 中注册即可享受。
 * 同工具同 summary 通过 store 层去重。
 */
export function useRecordHistory(summary: string) {
  const pathname = usePathname();
  const addEntry = useHistoryStore((s) => s.addEntry);

  useEffect(() => {
    const trimmed = summary.trim();
    if (!trimmed) return;

    const item = calculatorNavItems.find((i) => i.href === pathname);
    if (!item) return;

    const timer = window.setTimeout(() => {
      addEntry({
        toolId: item.id,
        title: item.title,
        summary: trimmed,
        href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [pathname, summary, addEntry]);
}
