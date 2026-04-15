"use client";

import React, { useMemo, useState } from "react";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import { computePHStandardValues } from "@/lib/ph";

const QUICK_TEMPERATURES = [18.6, 25, 95];

function formatFixed(value: number, digits: number) {
  return Number.isNaN(value) ? "\u2014" : value.toFixed(digits);
}

export default function PHCalculatorPage() {
  const [temperatureStr, setTemperatureStr] = useState<string>("25.0");

  const result = useMemo(() => {
    const temperature =
      temperatureStr.trim() === ""
        ? NaN
        : parseFloat(temperatureStr.replace(",", "."));
    return computePHStandardValues(temperature);
  }, [temperatureStr]);

  return (
    <CalculatorShell
      title="pH 缓冲液标准值"
      description="标准缓冲溶液温度修正值计算"
    >
      {/* 输入卡片 */}
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-4 flex flex-col gap-3">
        <NumberInput
          label="温度"
          unit="℃"
          value={temperatureStr}
          onChange={setTemperatureStr}
          placeholder="例如 25.0"
          required
        />

        <div className="flex gap-2">
          {QUICK_TEMPERATURES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTemperatureStr(String(t))}
              className="flex-1 min-w-[84px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface-secondary)] text-sm font-medium text-[var(--app-ink-secondary)] hover:bg-[var(--app-surface-tertiary)] hover:border-[var(--app-line-strong)] hover:text-[var(--app-ink)] transition-colors"
            >
              {t} ℃
            </button>
          ))}
        </div>
      </div>

      {/* 错误卡片 */}
      {"error" in result ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {result.error}
        </div>
      ) : (
        /* 结果网格 */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {result.items.map((item) => (
            <div
              key={item.label}
              className={`rounded-[var(--app-radius-lg)] border bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-4 flex flex-col gap-3 transition-colors ${
                item.available
                  ? "border-[var(--app-line)]"
                  : "border-[var(--app-danger)]"
              }`}
            >
              {/* 头部：标签 + 主值 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-[var(--app-ink-secondary)] font-medium">
                    缓冲液 {item.label}
                  </span>
                  <span className="text-xs text-[var(--app-ink-tertiary)]">
                    {item.range[0]}\u2013{item.range[1]} ℃
                  </span>
                </div>
                {item.available ? (
                  <span className="text-3xl leading-8 font-semibold text-[var(--app-primary)] whitespace-nowrap">
                    {formatFixed(item.standardValue, 3)}
                  </span>
                ) : (
                  <span className="text-lg leading-6 font-semibold text-[var(--app-danger)] whitespace-nowrap">
                    不可用
                  </span>
                )}
              </div>

              {/* 元信息网格 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[var(--app-radius-sm)] bg-[var(--app-surface-secondary)] p-2.5 flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-[var(--app-ink-tertiary)]">
                    匹配温度点
                  </span>
                  <span className="text-sm font-medium text-[var(--app-ink)] break-words">
                    {item.available
                      ? `${formatFixed(item.matchedTemp, 0)} ℃`
                      : "\u2014"}
                  </span>
                </div>
                <div className="rounded-[var(--app-radius-sm)] bg-[var(--app-surface-secondary)] p-2.5 flex flex-col gap-1 min-w-0">
                  <span className="text-xs text-[var(--app-ink-tertiary)]">
                    操作值
                  </span>
                  <span className="text-sm font-medium text-[var(--app-ink)] break-words">
                    {formatFixed(item.displayValue, 2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CalculatorShell>
  );
}
