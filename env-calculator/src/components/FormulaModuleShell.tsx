'use client';

import React, { useMemo, useState } from 'react';

export type FormulaModuleOption = {
  key: string;
  title: string;
  group: string;
  description: string;
  formula: string;
};

interface FormulaModuleShellProps {
  modules: FormulaModuleOption[];
  activeKey: string;
  onChange: (key: string) => void;
  children: React.ReactNode;
  navigationLabel?: string;
  countUnit?: string;
  switchLabel?: string;
  drawerSubtitle?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

export default function FormulaModuleShell({
  modules,
  activeKey,
  onChange,
  children,
  navigationLabel = '公式导航',
  countUnit = '个公式',
  switchLabel = '切换公式',
  drawerSubtitle = '按工艺单元分组',
  searchPlaceholder = '搜索公式',
  emptyText = '无匹配公式',
}: FormulaModuleShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const activeModule = modules.find((item) => item.key === activeKey) ?? modules[0];
  const filteredModules = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return modules;

    return modules.filter((item) =>
      [item.title, item.group, item.description, item.formula]
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [modules, query]);

  const groupedModules = useMemo(() => {
    const groups = new Map<string, FormulaModuleOption[]>();
    filteredModules.forEach((item) => {
      const groupItems = groups.get(item.group) ?? [];
      groupItems.push(item);
      groups.set(item.group, groupItems);
    });
    return Array.from(groups.entries());
  }, [filteredModules]);

  const selectModule = (key: string) => {
    onChange(key);
    setDrawerOpen(false);
    setQuery('');
  };

  const renderModuleList = () => (
    <div className="app-formula-list">
      {groupedModules.map(([group, items]) => (
        <section key={group} className="app-formula-group">
          <div className="app-formula-group-title">{group}</div>
          <div className="app-formula-group-items">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => selectModule(item.key)}
                data-active={item.key === activeKey}
                className="app-formula-item"
              >
                <span>{item.title}</span>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <>
      <section className="app-formula-mobile-head">
        <div className="min-w-0">
          <div className="app-formula-current-group">{activeModule.group}</div>
          <h2>{activeModule.title}</h2>
          <p>{activeModule.formula}</p>
        </div>
        <button type="button" onClick={() => setDrawerOpen(true)}>
          {switchLabel}
        </button>
      </section>

      <div className="app-formula-layout">
        <aside className="app-formula-sidebar" aria-label={navigationLabel}>
          <div className="app-formula-sidebar-head">
            <div>{navigationLabel}</div>
            <small>{modules.length} {countUnit}</small>
          </div>
          {renderModuleList()}
        </aside>

        <div className="min-w-0 space-y-4">
          <section className="app-formula-desktop-head">
            <div className="app-formula-current-group">{activeModule.group}</div>
            <h2>{activeModule.title}</h2>
            <p>{activeModule.description}</p>
            <code>{activeModule.formula}</code>
          </section>
          {children}
        </div>
      </div>

      {drawerOpen && (
        <div className="app-formula-drawer" role="dialog" aria-modal="true" aria-label={switchLabel}>
          <button
            type="button"
            className="app-formula-drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            aria-label={`关闭${navigationLabel}`}
          />
          <div className="app-formula-drawer-panel">
            <div className="app-formula-drawer-grip" aria-hidden="true" />
            <div className="app-formula-drawer-head">
              <div>
                <div className="text-base font-black text-[var(--app-ink)]">{switchLabel}</div>
                <div className="text-xs text-[var(--app-ink-tertiary)]">{drawerSubtitle}</div>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)}>
                关闭
              </button>
            </div>
            <label className="app-formula-search">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
              />
            </label>
            <div className="app-formula-drawer-body">
              {groupedModules.length > 0 ? renderModuleList() : (
                <div className="py-8 text-center text-sm font-medium text-[var(--app-ink-tertiary)]">
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
