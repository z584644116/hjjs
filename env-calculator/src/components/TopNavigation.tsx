'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/Providers';
import { calculatorCategories, calculatorNavItems } from '@/constants/navigation';
import {
  Apps24Regular,
  Beaker24Regular,
  DataUsage24Regular,
  Dismiss24Regular,
  Drop24Regular,
  Home24Regular,
  Navigation24Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons';

const mobileTabs = [
  {
    label: '空气',
    href: '/?category=空气和废气',
    icon: <Apps24Regular />,
    category: '空气和废气',
  },
  {
    label: '水质',
    href: '/?category=水质',
    icon: <Drop24Regular />,
    category: '水质',
  },
  {
    label: '质控',
    href: '/?category=通用与质控',
    icon: <DataUsage24Regular />,
    category: '通用与质控',
  },
  { label: '全部', href: '/', icon: <Home24Regular />, category: '全部' },
];

export default function TopNavigation() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCategory = searchParams.get('category') ?? '全部';

  const groupedLinks = useMemo(
    () =>
      calculatorCategories.map((category) => ({
        ...category,
        items: calculatorNavItems.filter((item) => item.category === category.key),
      })),
    [],
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--app-line)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] backdrop-blur-xl">
        <div className="page-container py-0">
          <div className="flex min-h-[62px] items-center justify-between gap-3 md:min-h-[70px] md:gap-6">
            <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="返回环境计算器首页">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-[var(--app-primary)] text-white shadow-[0_14px_28px_rgba(15,118,110,0.22)]">
                <Beaker24Regular />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[17px] font-black leading-none tracking-[-0.02em] text-[var(--app-ink)] md:text-[19px]">
                  环境计算器
                </span>
              </span>
            </Link>

            <div className="hidden flex-1 lg:block" aria-hidden="true" />

            <div className="flex items-center gap-2">
              <Link href="/" className="app-action-primary hidden md:inline-flex">
                全部工具
              </Link>

              <button
                type="button"
                onClick={toggleTheme}
                className="app-icon-button"
                aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                title={theme === 'dark' ? '浅色模式' : '深色模式'}
              >
                {theme === 'dark' ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
              </button>

              <button type="button" onClick={() => setDrawerOpen(true)} className="app-icon-button lg:hidden" aria-label="打开导航菜单">
                <Navigation24Regular />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="app-mobile-nav" aria-label="手机主导航">
        {mobileTabs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-active={pathname === '/' && activeCategory === item.category}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/36"
            onClick={() => setDrawerOpen(false)}
            aria-label="关闭导航菜单遮罩"
          />
          <div className="absolute right-0 top-0 flex h-full w-[340px] max-w-[90vw] flex-col border-l border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-lg)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[var(--app-line)] px-5 py-4">
              <div>
                <div className="text-base font-black text-[var(--app-ink)]">全部工具</div>
                <div className="text-xs text-[var(--app-ink-tertiary)]">空气 / 水质 / 通用质控</div>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="app-icon-button" aria-label="关闭导航菜单">
                <Dismiss24Regular />
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-[48px] items-center rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface-secondary)] px-4 text-sm font-black text-[var(--app-ink)]"
              >
                首页工作台
              </Link>

              {groupedLinks.map((group) => (
                <section key={group.key} className="space-y-2.5">
                  <div className="px-1">
                    <div className="text-sm font-black text-[var(--app-ink)]">{group.label}</div>
                    <div className="text-xs text-[var(--app-ink-tertiary)]">{group.description}</div>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        className="block rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface-secondary)] px-4 py-3 transition-all hover:border-[var(--app-line-strong)] hover:bg-[var(--app-surface-tertiary)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-[var(--app-ink)]">{item.title}</span>
                          {item.badge && <span className="app-chip">{item.badge}</span>}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-[var(--app-ink-tertiary)]">{item.description}</div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </nav>

            <div className="app-safe-bottom flex items-center justify-between border-t border-[var(--app-line)] px-5 py-4 text-xs text-[var(--app-ink-tertiary)]">
              <span>本地计算 · 单手可达</span>
              <button type="button" onClick={toggleTheme} className="font-black text-[var(--app-primary)]">
                {theme === 'dark' ? '浅色' : '深色'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
