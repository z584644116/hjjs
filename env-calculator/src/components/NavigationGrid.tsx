'use client';

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { History24Regular, Search24Regular, Star24Filled } from '@fluentui/react-icons';
import {
  calculatorDomains,
  calculatorNavItems,
  type CalculatorCategory,
  type CalculatorDomain,
  type CalculatorNavItem,
} from '@/constants/navigation';
import { useFavoritesStore } from '@/stores/favorites';

type ActiveCategory = CalculatorCategory | '全部';

function toActiveCategory(value: string | null): ActiveCategory {
  if (
    value === '空气和废气' ||
    value === '水质' ||
    value === '通用与质控' ||
    value === '噪声与振动' ||
    value === '评价与指数' ||
    value === '水处理' ||
    value === '气体处理'
  ) return value;
  return '全部';
}

function toActiveDomain(value: string | null, category: ActiveCategory): CalculatorDomain {
  if (value === '环境处理' || category === '水处理' || category === '气体处理') return '环境处理';
  return '环境检测';
}

function ToolTile({ item, showCategory }: { item: CalculatorNavItem; showCategory?: boolean }) {
  return (
    <Link href={item.href} className="app-tool-tile" aria-label={item.title}>
      <span className="app-tool-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span className="app-tool-title">{item.shortTitle ?? item.title}</span>
      {showCategory ? (
        <span className="app-tool-subtitle">{item.category}</span>
      ) : (
        item.subtitle && <span className="app-tool-subtitle">{item.subtitle}</span>
      )}
    </Link>
  );
}

export default function NavigationGrid() {
  const searchParams = useSearchParams();
  const activeCategory = toActiveCategory(searchParams.get('category'));
  const activeDomain = toActiveDomain(searchParams.get('domain'), activeCategory);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const isSearching = deferredQuery.length > 0;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 避免 zustand persist 在 SSR / hydration 期的闪烁
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const favorites = useFavoritesStore((s) => s.favorites);

  // 快捷键:"/" (非输入态) 与 Ctrl/Cmd+K 聚焦搜索框
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        (target?.isContentEditable ?? false);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === '/' && !inEditable) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayItems = useMemo(() => {
    if (isSearching) {
      // 搜索态:跨 domain 全局搜索,匹配字段包含标准号、描述等
      return calculatorNavItems.filter((item) =>
        [
          item.title,
          item.shortTitle,
          item.subtitle,
          item.description,
          item.domain,
          item.category,
          item.badge,
          ...(item.standards ?? []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(deferredQuery)),
      );
    }

    // 非搜索态:按 domain + category 过滤
    const domainItems = calculatorNavItems.filter((item) => item.domain === activeDomain);
    return activeCategory === '全部'
      ? domainItems
      : domainItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, activeDomain, deferredQuery, isSearching]);

  // 收藏工具列表 - 按 favorites 数组顺序(用户的加入顺序,体现常用度)
  const favoriteItems = useMemo(() => {
    if (!mounted) return [];
    const byId = new Map(calculatorNavItems.map((item) => [item.id, item]));
    return favorites
      .map((id) => byId.get(id))
      .filter((item): item is CalculatorNavItem => Boolean(item));
  }, [favorites, mounted]);

  // 仅在 "全部" 视图下显示收藏置顶区(避免与 category 过滤结果视觉冲突)
  const showFavoritesSection =
    !isSearching && activeCategory === '全部' && favoriteItems.length > 0;

  const headerTitle = isSearching
    ? `搜索结果 ${displayItems.length} 个`
    : activeCategory === '全部'
      ? activeDomain
      : activeCategory;

  return (
    <div className="page-container">
      <section className="mx-auto max-w-[1160px] space-y-4">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-1">
          <div aria-hidden="true" />
          <h1 className="truncate text-base font-black text-[var(--app-ink)]">{headerTitle}</h1>
          <div className="flex justify-end">
            <Link
              href="/history"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink-secondary)] transition-colors hover:border-[var(--app-line-strong)] hover:text-[var(--app-ink)]"
              aria-label="计算历史"
              title="计算历史"
            >
              <History24Regular className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <label className="app-min-search" aria-label="搜索工具">
          <Search24Regular className="h-5 w-5 shrink-0 text-[var(--app-ink-tertiary)]" />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索工具 / 标准号 / 关键词"
            type="search"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
              清空
            </button>
          )}
        </label>

        {!isSearching && (
          <div className="app-domain-switch" aria-label="计算类型">
            {calculatorDomains.map((domain) => (
              <Link
                key={domain.key}
                href={`/?domain=${encodeURIComponent(domain.key)}`}
                data-active={activeDomain === domain.key}
              >
                <span>{domain.label}</span>
                <small>{domain.description}</small>
              </Link>
            ))}
          </div>
        )}

        {showFavoritesSection && (
          <section aria-labelledby="favorites-heading" className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2
                id="favorites-heading"
                className="flex items-center gap-1.5 text-sm font-black text-[var(--app-ink-secondary)]"
              >
                <Star24Filled className="h-4 w-4 text-[var(--app-primary)]" aria-hidden="true" />
                我的收藏
              </h2>
              <span className="text-xs font-medium text-[var(--app-ink-tertiary)]">
                {favoriteItems.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
              {favoriteItems.map((item) => (
                <ToolTile key={`fav-${item.id}`} item={item} />
              ))}
            </div>
            <div className="flex items-center gap-3 px-1 pt-1">
              <h2 className="text-sm font-black text-[var(--app-ink-secondary)]">全部工具</h2>
              <div className="h-px flex-1 bg-[var(--app-line)]" />
            </div>
          </section>
        )}

        {displayItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
            {displayItems.map((item) => (
              <ToolTile key={item.id} item={item} showCategory={isSearching} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-[var(--app-surface)] p-8 text-center text-sm font-medium text-[var(--app-ink-tertiary)]">
            {isSearching ? `未找到与 "${query}" 相关的工具` : '无结果'}
          </div>
        )}
      </section>
    </div>
  );
}
