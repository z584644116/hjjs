"use client";

import React, { useMemo } from "react";
import { GAS_LIST, convertGasUnits, GasKey } from "@/lib/gas";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import ResultDisplay from "@/components/ResultDisplay";
import { useUrlState } from "@/hooks/useUrlState";
import { useRecordHistory } from "@/hooks/useRecordHistory";

export default function GasConverterPage() {
  const [inputs, setInputs] = useUrlState({
    gas: "SO2",
    T: "0",
    P: "101.325",
    v: "",
    unit: "ppm",
  });

  const gas: GasKey = GAS_LIST.some((g) => g.key === inputs.gas)
    ? (inputs.gas as GasKey)
    : "SO2";
  const inputUnit: "ppm" | "mg/m3" = inputs.unit === "mg/m3" ? "mg/m3" : "ppm";

  const result = useMemo(() => {
    const t = inputs.T === "" ? NaN : parseFloat(inputs.T.replace(",", "."));
    const p = inputs.P === "" ? NaN : parseFloat(inputs.P.replace(",", "."));
    const val = inputs.v === "" ? NaN : parseFloat(inputs.v.replace(",", "."));
    try {
      return convertGasUnits({
        gas,
        inputValue: val,
        inputUnit,
        temperatureC: t,
        pressureKPa: p,
        decimals: 2,
      });
    } catch {
      return null;
    }
  }, [gas, inputs.T, inputs.P, inputs.v, inputUnit]);

  const selectedGas = GAS_LIST.find((g) => g.key === gas);

  const tempNum =
    inputs.T === "" || isNaN(parseFloat(inputs.T.replace(",", ".")))
      ? null
      : parseFloat(inputs.T.replace(",", "."));
  const pressNum =
    inputs.P === "" || isNaN(parseFloat(inputs.P.replace(",", ".")))
      ? null
      : parseFloat(inputs.P.replace(",", "."));

  const summary = useMemo(() => {
    if (!result || 'error' in result || !Number.isFinite(result.outputValue) || inputs.v === "") return "";
    return `${gas}: ${inputs.v} ${inputUnit} → ${result.outputValue.toFixed(2)} ${result.outputUnit}`;
  }, [result, gas, inputs.v, inputUnit]);

  useRecordHistory(summary);

  const handleReset = () =>
    setInputs({ gas: "SO2", T: "", P: "", v: "", unit: "ppm" });

  return (
    <CalculatorShell
      title="气体单位换算"
      description="SO2/NO/NO2/CO/NMHC 浓度换算"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              气体
            </label>
            <select
              value={gas}
              onChange={(e) => setInputs({ gas: e.target.value as GasKey })}
              className="w-full min-h-[42px] px-3 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            >
              {GAS_LIST.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.name}
                </option>
              ))}
            </select>
            {selectedGas?.note && (
              <span className="text-xs text-[var(--app-ink-tertiary)]">
                {selectedGas.note}
              </span>
            )}
          </div>

          <NumberInput
            label="温度"
            unit="℃"
            value={inputs.T}
            onChange={(v) => setInputs({ T: v })}
            required
          />

          <NumberInput
            label="大气压"
            unit="kPa"
            value={inputs.P}
            onChange={(v) => setInputs({ P: v })}
            required
          />

          <NumberInput
            label="输入浓度"
            value={inputs.v}
            onChange={(v) => setInputs({ v })}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              输入单位
            </label>
            <select
              value={inputUnit}
              onChange={(e) => setInputs({ unit: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            >
              <option value="ppm">ppm</option>
              <option value="mg/m3">mg/m³</option>
            </select>
          </div>
        </div>
      </div>

      <ResultDisplay
        title="换算结果"
        items={[
          {
            label: "换算结果",
            value: result && !('error' in result) && Number.isFinite(result.outputValue)
              ? `${result.outputValue.toFixed(2)} ${result.outputUnit}`
              : "--",
            status: "success",
          },
          {
            label: "温度",
            value: tempNum !== null ? `${tempNum.toFixed(1)}` : "--",
            unit: tempNum !== null ? "℃" : undefined,
            status: "neutral",
          },
          {
            label: "压力",
            value: pressNum !== null ? `${pressNum.toFixed(3)}` : "--",
            unit: pressNum !== null ? "kPa" : undefined,
            status: "neutral",
          },
          {
            label: "分子量",
            value: selectedGas
              ? `${selectedGas.molarMass_g_mol.toFixed(3)}`
              : "--",
            unit: selectedGas ? "g/mol" : undefined,
            status: "neutral",
          },
        ]}
        details={
          <span>
            使用理想气体关系校正:T(℃)、P(kPa);NMHC 以碳计(ppmC↔mgC/m³)
          </span>
        }
      />
    </CalculatorShell>
  );
}
