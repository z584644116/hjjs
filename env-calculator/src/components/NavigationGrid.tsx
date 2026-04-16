'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Apps24Regular, Search24Regular } from '@fluentui/react-icons';
import {
  calculatorDomains,
  calculatorNavItems,
  type CalculatorCategory,
  type CalculatorDomain,
} from '@/constants/navigation';

type ActiveCategory = CalculatorCategory | '全部';

function toActiveCategory(value: string | null): ActiveCategory {
  if (
    value === '空气和废气' ||
    value === '水质' ||
    value === '通用与质控' ||
    value === '水处理' ||
    value === '气体处理'
  ) return value;
  return '全部';
}

function toActiveDomain(value: string | null, category: ActiveCategory): CalculatorDomain {
  if (value === '环境处理' || category === '水处理' || category === '气体处理') return '环境处理';
  return '环境检测';
}

export default function NavigationGrid() {
  const searchParams = useSearchParams();
  const activeCategory = toActiveCategory(searchParams.get('category'));
  const activeDomain = toActiveDomain(searchParams.get('domain'), activeCategory);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const displayItems = useMemo(() => {
    const domainItems = calculatorNavItems.filter((item) => item.domain === activeDomain);
    const categoryItems =
      activeCategory === '全部'
        ? domainItems
        : domainItems.filter((item) => item.category === activeCategory);

    if (!deferredQuery) return categoryItems;

    return categoryItems.filter((item) =>
      [item.title, item.shortTitle, item.subtitle, item.domain, item.category, item.badge]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(deferredQuery)),
    );
  }, [activeCategory, activeDomain, deferredQuery]);

  return (
    <div className="page-container">
      <section className="mx-auto max-w-[1160px] space-y-4">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-1">
          <div aria-hidden="true" />
          <h1 className="text-base font-black text-[var(--app-ink)]">{activeCategory === '全部' ? activeDomain : activeCategory}</h1>
          <div className="flex justify-end">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink-secondary)]">
              <Apps24Regular className="h-5 w-5" />
            </span>
          </div>
        </div>

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

        <label className="app-min-search" aria-label="搜索工具">
          <Search24Regular className="h-5 w-5 shrink-0 text-[var(--app-ink-tertiary)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索"
            type="search"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
              清空
            </button>
          )}
        </label>

        {displayItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
            {displayItems.map((item) => (
              <Link key={item.id} href={item.href} className="app-tool-tile" aria-label={item.title}>
                <span className="app-tool-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="app-tool-title">{item.shortTitle ?? item.title}</span>
                {item.subtitle && <span className="app-tool-subtitle">{item.subtitle}</span>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-[var(--app-surface)] p-8 text-center text-sm font-medium text-[var(--app-ink-tertiary)]">
            无结果
          </div>
        )}
      </section>
    </div>
  );
}
