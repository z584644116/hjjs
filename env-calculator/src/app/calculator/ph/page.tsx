"use client";

import React, { useMemo, useState } from "react";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import { computePHStandardValues } from "@/lib/ph";

function formatValue(value: number, digits: number) {
  return Number.isNaN(value) ? "--" : value.toFixed(digits);
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
    <CalculatorShell title="pH 标准值">
      <section className="space-y-4">
        <NumberInput
          label="温度"
          unit="℃"
          value={temperatureStr}
          onChange={setTemperatureStr}
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
