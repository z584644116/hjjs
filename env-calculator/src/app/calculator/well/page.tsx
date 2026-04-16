"use client";

import React, { useMemo, useState } from "react";
import { computeWell } from "@/lib/well";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import ResultDisplay from "@/components/ResultDisplay";

export default function WellCalculatorPage() {
  const [B, setB] = useState<string>(""); // m
  const [C, setC] = useState<string>(""); // cm
  const [D, setD] = useState<string>(""); // m
  const [E, setE] = useState<string>(""); // m
  const [F, setF] = useState<string>(""); // cm
  const [G, setG] = useState<string>(""); // porosity (0~1)

  const result = useMemo(() => {
    const b = B === "" ? NaN : parseFloat(B.replace(",", "."));
    const c = C === "" ? NaN : parseFloat(C.replace(",", "."));
    const d = D === "" ? NaN : parseFloat(D.replace(",", "."));
    const e = E === "" ? NaN : parseFloat(E.replace(",", "."));
    const f = F === "" ? NaN : parseFloat(F.replace(",", "."));
    const g =
      G === ""
        ? undefined
        : isNaN(parseFloat(G.replace(",", ".")))
          ? undefined
          : parseFloat(G.replace(",", "."));
    if ([b, c, d, e, f].some((x) => Number.isNaN(x))) return null;
    return computeWell({
      B_depth_m: b,
      C_id_cm: c,
      D_waterLevel_m: d,
      E_headToGround_m: e,
      F_enlarge_cm: f,
      G_porosity: g,
    });
  }, [B, C, D, E, F, G]);

  const handleReset = () => {
    setB("");
    setC("");
    setD("");
    setE("");
    setF("");
    setG("");
  };

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
      {/* Input Card */}
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberInput
            label="建井深度 B"
            unit="m"
            value={B}
            onChange={setB}
            required
          />
          <NumberInput
            label="井管内径 C"
            unit="cm"
            value={C}
            onChange={setC}
            required
          />
          <NumberInput
            label="水位 D"
            unit="m"
            value={D}
            onChange={setD}
            required
          />
          <NumberInput
            label="井口至地面高度 E"
            unit="m"
            value={E}
            onChange={setE}
            required
          />
          <NumberInput
            label="扩孔直径 F"
            unit="cm"
            value={F}
            onChange={setF}
            required
          />
          <NumberInput
            label="填料孔隙度 G"
            value={G}
            onChange={setG}
            hint="若不填，体积结果按Excel规则留空"
          />
        </div>
      </div>

      {/* Results */}
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
