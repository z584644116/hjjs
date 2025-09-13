"use client";

import React, { useMemo, useState } from "react";
import { Title1, Title2, Body1, Input, Label, Card, Divider, makeStyles, Text } from "@fluentui/react-components";
import { GAS_LIST, convertGasUnits, GasKey } from "@/lib/gas";

const useStyles = makeStyles({
  container: { maxWidth: "900px", margin: "0 auto", padding: "24px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
  },
});

export default function GasConverterPage() {
  const styles = useStyles();
  const [gas, setGas] = useState<GasKey>("SO2");
  const [temperatureC, setTemperatureC] = useState<number | "">(25);
  const [pressureKPa, setPressureKPa] = useState<number | "">(101.325);
  const [inputValue, setInputValue] = useState<number | "">(1);
  const [inputUnit, setInputUnit] = useState<'ppm' | 'mg/m3'>("ppm");

  const result = useMemo(() => {
    const t = typeof temperatureC === "number" ? temperatureC : NaN;
    const p = typeof pressureKPa === "number" ? pressureKPa : NaN;
    const v = typeof inputValue === "number" ? inputValue : NaN;
    try {
      return convertGasUnits({ gas, inputValue: v, inputUnit, temperatureC: t, pressureKPa: p, decimals: 2 });
    } catch (e) {
      return null;
    }
  }, [gas, temperatureC, pressureKPa, inputValue, inputUnit]);

  return (
    <div className="page-container">
      <div className={styles.container}>
        <Title1 style={{ marginBottom: 8 }}>气体单位换算</Title1>

        <div className={styles.grid}>
          <div className={styles.field}>
            <Label required>气体</Label>
            <select
              value={gas}
              onChange={(e) => setGas(e.target.value as GasKey)}
              style={{ height: 32, borderRadius: 4 }}
            >
              {GAS_LIST.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.name}
                </option>
              ))}
            </select>
            <Text size={200} style={{ color: "var(--colorNeutralForeground2)" }}>
              {GAS_LIST.find(g => g.key === gas)?.note || ""}
            </Text>
          </div>

          <div className={styles.field}>
            <Label required>温度 (℃)</Label>
            <Input type="number" step={0.1} value={temperatureC === "" ? "" : String(temperatureC)}
              onChange={e => setTemperatureC((e.target as HTMLInputElement).value === "" ? "" : Number((e.target as HTMLInputElement).value))} />
          </div>

          <div className={styles.field}>
            <Label required>大气压 (kPa)</Label>
            <Input type="number" step={0.1} value={pressureKPa === "" ? "" : String(pressureKPa)}
              onChange={e => setPressureKPa((e.target as HTMLInputElement).value === "" ? "" : Number((e.target as HTMLInputElement).value))} />
          </div>

          <div className={styles.field}>
            <Label required>输入数值</Label>
            <Input type="number" step={0.001} value={inputValue === "" ? "" : String(inputValue)}
              onChange={e => setInputValue((e.target as HTMLInputElement).value === "" ? "" : Number((e.target as HTMLInputElement).value))} />
          </div>

          <div className={styles.field}>
            <Label required>输入单位</Label>
            <select
              value={inputUnit}
              onChange={(e) => setInputUnit(e.target.value as 'ppm' | 'mg/m3')}
              style={{ height: 32, borderRadius: 4 }}
            >
              <option value="ppm">ppm</option>
              <option value="mg/m3">mg/m³</option>
            </select>
          </div>
        </div>

        <Divider style={{ margin: "20px 0" }}>换算结果</Divider>

        <div className={styles.resultGrid}>
          <Card style={{ padding: 12 }}>
            <Title2 style={{ fontSize: 16, marginBottom: 6 }}>结果</Title2>
            <Body1 style={{ fontWeight: 600, fontSize: 18 }}>
              {result ? `${result.outputValue.toFixed(2)} ${result.outputUnit}` : "--"}
            </Body1>
            <Text size={200} style={{ color: "var(--colorNeutralForeground2)" }}>
              使用理想气体关系校正：T(℃)、P(kPa)；默认 NMHC 以丙烷当量
            </Text>
          </Card>

          <Card style={{ padding: 12 }}>
            <Title2 style={{ fontSize: 16, marginBottom: 6 }}>参数</Title2>
            <Body1>温度：{typeof temperatureC === 'number' ? `${temperatureC.toFixed(1)} ℃` : "--"}</Body1>
            <Body1>压力：{typeof pressureKPa === 'number' ? `${pressureKPa.toFixed(3)} kPa` : "--"}</Body1>
            <Body1>分子量：{GAS_LIST.find(g => g.key === gas)?.molarMass_g_mol.toFixed(3)} g/mol</Body1>
          </Card>
        </div>
      </div>
    </div>
  );
}

