"use client";

import React, { useMemo, useState } from "react";
import { GAS_LIST, convertGasUnits, GasKey } from "@/lib/gas";
import CalculatorShell from "@/components/CalculatorShell";
import NumberInput from "@/components/NumberInput";
import ResultDisplay from "@/components/ResultDisplay";

export default function GasConverterPage() {
  const [gas, setGas] = useState<GasKey>("SO2");
  const [temperatureStr, setTemperatureStr] = useState<string>("0");
  const [pressureStr, setPressureStr] = useState<string>("101.325");
  const [inputStr, setInputStr] = useState<string>("");
  const [inputUnit, setInputUnit] = useState<"ppm" | "mg/m3">("ppm");

  const result = useMemo(() => {
    const t =
      temperatureStr === ""
        ? NaN
        : parseFloat(temperatureStr.replace(",", "."));
    const p =
      pressureStr === ""
        ? NaN
        : parseFloat(pressureStr.replace(",", "."));
    const v =
      inputStr === "" ? NaN : parseFloat(inputStr.replace(",", "."));
    try {
      return convertGasUnits({
        gas,
        inputValue: v,
        inputUnit,
        temperatureC: t,
        pressureKPa: p,
        decimals: 2,
      });
    } catch {
      return null;
    }
  }, [gas, temperatureStr, pressureStr, inputStr, inputUnit]);

  const selectedGas = GAS_LIST.find((g) => g.key === gas);

  const tempNum =
    temperatureStr === "" || isNaN(parseFloat(temperatureStr.replace(",", ".")))
      ? null
      : parseFloat(temperatureStr.replace(",", "."));
  const pressNum =
    pressureStr === "" || isNaN(parseFloat(pressureStr.replace(",", ".")))
      ? null
      : parseFloat(pressureStr.replace(",", "."));

  return (
    <CalculatorShell
      title="气体单位换算"
      description="SO2/NO/NO2/CO/NMHC 浓度换算"
    >
      {/* Input Card */}
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gas select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              气体
            </label>
            <select
              value={gas}
              onChange={(e) => setGas(e.target.value as GasKey)}
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
            value={temperatureStr}
            onChange={setTemperatureStr}
            required
          />

          <NumberInput
            label="大气压"
            unit="kPa"
            value={pressureStr}
            onChange={setPressureStr}
            required
          />

          <NumberInput
            label="输入浓度"
            value={inputStr}
            onChange={setInputStr}
            required
          />

          {/* Unit select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              输入单位
            </label>
            <select
              value={inputUnit}
              onChange={(e) =>
                setInputUnit(e.target.value as "ppm" | "mg/m3")
              }
              className="w-full min-h-[42px] px-3 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            >
              <option value="ppm">ppm</option>
              <option value="mg/m3">mg/m³</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <ResultDisplay
        title="换算结果"
        items={[
          {
            label: "换算结果",
            value: result && Number.isFinite(result.outputValue)
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
            使用理想气体关系校正：T(℃)、P(kPa)；NMHC 以碳计（ppmC↔mgC/m³）
          </span>
        }
      />
    </CalculatorShell>
  );
}
