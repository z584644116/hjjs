"use client";

import React, { useMemo } from "react";
import { computeWell } from "@/lib/well";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import ResultDisplay from "@/components/ResultDisplay";
import { useUrlState } from "@/hooks/useUrlState";
import { useRecordHistory } from "@/hooks/useRecordHistory";

export default function WellCalculatorPage() {
  const [inputs, setInputs] = useUrlState({
    B: "",
    C: "",
    D: "",
    E: "",
    F: "",
    G: "",
  });

  const result = useMemo(() => {
    const parse = (v: string) =>
      v === "" ? NaN : parseFloat(v.replace(",", "."));
    const b = parse(inputs.B);
    const c = parse(inputs.C);
    const d = parse(inputs.D);
    const e = parse(inputs.E);
    const f = parse(inputs.F);
    const gParsed = parse(inputs.G);
    const g = inputs.G === "" || Number.isNaN(gParsed) ? undefined : gParsed;
    if ([b, c, d, e, f].some((x) => Number.isNaN(x))) return null;
    return computeWell({
      B_depth_m: b,
      C_id_cm: c,
      D_waterLevel_m: d,
      E_headToGround_m: e,
      F_enlarge_cm: f,
      G_porosity: g,
    });
  }, [inputs.B, inputs.C, inputs.D, inputs.E, inputs.F, inputs.G]);

  const summary = useMemo(() => {
    if (!result) return "";
    const vol =
      result.waterVolume_L != null ? `${result.waterVolume_L.toFixed(1)} L` : "--";
    return `井水 ${vol} · 埋深 ${result.buriedDepth_m.toFixed(2)} m · 水深 ${result.waterDepth_m.toFixed(2)} m`;
  }, [result]);

  useRecordHistory(summary);

  const handleReset = () =>
    setInputs({ B: "", C: "", D: "", E: "", F: "", G: "" });

  return (
    <CalculatorShell
      title="地下水井水体积计算"
      description="井水深度、埋深与体积快速计算"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberInput
            label="建井深度 B"
            unit="m"
            value={inputs.B}
            onChange={(v) => setInputs({ B: v })}
            required
          />
          <NumberInput
            label="井管内径 C"
            unit="cm"
            value={inputs.C}
            onChange={(v) => setInputs({ C: v })}
            required
          />
          <NumberInput
            label="水位 D"
            unit="m"
            value={inputs.D}
            onChange={(v) => setInputs({ D: v })}
            required
          />
          <NumberInput
            label="井口至地面高度 E"
            unit="m"
            value={inputs.E}
            onChange={(v) => setInputs({ E: v })}
            required
          />
          <NumberInput
            label="扩孔直径 F"
            unit="cm"
            value={inputs.F}
            onChange={(v) => setInputs({ F: v })}
            required
          />
          <NumberInput
            label="填料孔隙度 G"
            value={inputs.G}
            onChange={(v) => setInputs({ G: v })}
            hint="若不填,体积结果按 Excel 规则留空"
          />
        </div>
      </div>

      <ResultDisplay
        title="计算结果"
        items={[
          {
            label: "埋深",
            value: result ? result.buriedDepth_m.toFixed(2) : "--",
            unit: "m",
            status: "neutral",
          },
          {
            label: "井水深度",
            value: result ? result.waterDepth_m.toFixed(2) : "--",
            unit: "m",
            status: "success",
          },
          {
            label: "井水体积",
            value:
              result && result.waterVolume_L != null
                ? result.waterVolume_L.toFixed(1)
                : "--",
            unit: "L",
            status: "success",
          },
        ]}
      />
    </CalculatorShell>
  );
}
