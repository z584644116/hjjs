"use client";

import React, { useMemo } from "react";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import { useUrlState } from "@/hooks/useUrlState";
import { useRecordHistory } from "@/hooks/useRecordHistory";
import { computePHStandardValues } from "@/lib/ph";

function formatValue(value: number, digits: number) {
  return Number.isNaN(value) ? "--" : value.toFixed(digits);
}

export default function PHCalculatorPage() {
  const [inputs, setInputs] = useUrlState({ T: "25.0" });

  const result = useMemo(() => {
    const temperature =
      inputs.T.trim() === ""
        ? NaN
        : parseFloat(inputs.T.replace(",", "."));
    return computePHStandardValues(temperature);
  }, [inputs.T]);

  const summary = useMemo(() => {
    if ("error" in result) return "";
    if (!inputs.T.trim()) return "";
    return `pH 标准值 · T=${inputs.T}℃`;
  }, [result, inputs.T]);

  useRecordHistory(summary);

  const handleReset = () => setInputs({ T: "" });

  return (
    <CalculatorShell
      title="pH 标准值"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <section className="space-y-4">
        <NumberInput
          label="温度"
          unit="℃"
          value={inputs.T}
          onChange={(v) => setInputs({ T: v })}
          placeholder="25.0"
          required
        />

        {"error" in result ? (
          <div className="rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] p-3 text-sm text-[var(--app-danger)]">
            {result.error}
          </div>
        ) : (
          <div className="app-result-list">
            {result.items.map((item) => (
              <div key={item.label} className="app-result-row" data-status={item.available ? "neutral" : "danger"}>
                <span className="app-result-label">缓冲液 {item.label}</span>
                <span className="app-result-value">
                  <span>{item.available ? formatValue(item.standardValue, 3) : "不可用"}</span>
                  <small>标准值</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </CalculatorShell>
  );
}
