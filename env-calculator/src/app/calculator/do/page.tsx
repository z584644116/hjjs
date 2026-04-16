"use client";

import React, { useMemo } from "react";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import ResultDisplay from "@/components/ResultDisplay";
import { useUrlState } from "@/hooks/useUrlState";
import { useRecordHistory } from "@/hooks/useRecordHistory";
import { computeDO, STANDARD_ATM_KPA } from "@/lib/do";

export default function DOCalculatorPage() {
  const [inputs, setInputs] = useUrlState({ P: "", T: "" });

  const result = useMemo(() => {
    const p = inputs.P === "" ? NaN : parseFloat(inputs.P.replace(",", "."));
    const t = inputs.T === "" ? NaN : parseFloat(inputs.T.replace(",", "."));
    return computeDO(p, t);
  }, [inputs.P, inputs.T]);

  const summary = useMemo(() => {
    if ("error" in result) return "";
    if (!inputs.P || !inputs.T) return "";
    return `饱和 DO ${result.standard_value.toFixed(2)} mg/L · T=${inputs.T}℃, P=${inputs.P} kPa`;
  }, [result, inputs.P, inputs.T]);

  useRecordHistory(summary);

  const handleReset = () => setInputs({ P: "", T: "" });

  return (
    <CalculatorShell
      title="溶解氧计算"
      description="温度与大气压换算饱和溶解氧标准值"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      {/* 输入区 */}
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberInput
            label="大气压"
            unit="kPa"
            value={inputs.P}
            onChange={(v) => setInputs({ P: v })}
            placeholder="例如 101.325"
            required
            hint={`参考值:标准大气压 ${STANDARD_ATM_KPA} kPa`}
          />
          <NumberInput
            label="温度"
            unit="℃"
            value={inputs.T}
            onChange={(v) => setInputs({ T: v })}
            placeholder="0 ~ 40"
            required
            hint="范围:0 ~ 40 ℃"
          />
        </div>
      </div>

      {/* 分隔线 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--app-line)]" />
        <span className="text-xs font-medium text-[var(--app-ink-tertiary)] whitespace-nowrap">
          计算结果
        </span>
        <div className="flex-1 h-px bg-[var(--app-line)]" />
      </div>

      {/* 结果区 */}
      {"error" in result ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {result.error}
        </div>
      ) : (
        <ResultDisplay
          title="计算结果"
          items={[
            {
              label: "饱和溶解氧标准值",
              value: result.standard_value.toFixed(2),
              unit: "mg/L",
              status: "success",
            },
            {
              label: "核查示值下限",
              value: result.range_min.toFixed(2),
              unit: "mg/L",
              status: "neutral",
            },
            {
              label: "核查示值上限",
              value: result.range_max.toFixed(2),
              unit: "mg/L",
              status: "neutral",
            },
          ]}
          details={<span>饱和溶解氧标准值 &plusmn; 0.5 mg/L</span>}
        />
      )}
    </CalculatorShell>
  );
}
