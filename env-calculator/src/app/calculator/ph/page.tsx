"use client";

import React, { useMemo, useState } from "react";
import { Title1, Body1, Input, Label, Card, Divider, makeStyles } from "@fluentui/react-components";
import { computePHStandardValues } from "@/lib/ph";

const useStyles = makeStyles({
  container: { maxWidth: "900px", margin: "0 auto", padding: "24px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  resultCard: { padding: "16px" },
});

export default function PHCalculatorPage() {
  const styles = useStyles();
  const [temperature, setTemperature] = useState<number | "">(25);

  const result = useMemo(() => {
    const t = typeof temperature === "number" ? temperature : NaN;
    return computePHStandardValues(t);
  }, [temperature]);

  return (
    <div className="page-container">
      <div className={styles.container}>
        <Title1 style={{ marginBottom: 8 }}>pH 缓冲溶液标准值计算</Title1>

        <div className={styles.grid}>
          <div className={styles.field}>
            <Label required>温度 (℃)</Label>
            <Input
              type="number"
              value={temperature === "" ? "" : String(temperature)}
              onChange={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setTemperature(v === "" ? "" : Number(v));
              }}
              step={0.1}
              placeholder="例如 25"
            />
          </div>
        </div>

        <Divider style={{ margin: "20px 0" }}>计算结果</Divider>

        <Card className={styles.resultCard}>
          {"error" in result ? (
            <Body1 style={{ color: "var(--colorPaletteRedForeground2)" }}>{result.error}</Body1>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {result.items.map((it) => (
                <Card key={it.label} style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Body1 style={{ color: "var(--colorNeutralForeground2)" }}>标准缓冲（{it.label} @25℃）</Body1>
                    <Body1 style={{ fontWeight: 600, fontSize: 18 }}>{it.standardValue.toFixed(2)}</Body1>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

