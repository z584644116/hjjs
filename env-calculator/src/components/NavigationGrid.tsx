'use client';

import React, { useDeferredValue, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Apps24Regular, Search24Regular } from '@fluentui/react-icons';
import { calculatorNavItems, type CalculatorCategory } from '@/constants/navigation';

type ActiveCategory = CalculatorCategory | '全部';

function toActiveCategory(value: string | null): ActiveCategory {
  if (value === '空气和废气' || value === '水质' || value === '通用与质控') return value;
  return '全部';
}

export default function NavigationGrid() {
  const searchParams = useSearchParams();
  const activeCategory = toActiveCategory(searchParams.get('category'));
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const displayItems = useMemo(() => {
    const categoryItems =
      activeCategory === '全部'
        ? calculatorNavItems
        : calculatorNavItems.filter((item) => item.category === activeCategory);

    if (!deferredQuery) return categoryItems;

    return categoryItems.filter((item) =>
      [item.title, item.shortTitle, item.subtitle, item.category, item.badge]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(deferredQuery)),
    );
  }, [activeCategory, deferredQuery]);

  return (
    <div className="page-container">
      <section className="mx-auto max-w-[1160px] space-y-4">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-1">
          <div aria-hidden="true" />
          <h1 className="text-base font-black text-[var(--app-ink)]">{activeCategory}</h1>
          <div className="flex justify-end">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink-secondary)]">
              <Apps24Regular className="h-5 w-5" />
            </span>
          </div>
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
