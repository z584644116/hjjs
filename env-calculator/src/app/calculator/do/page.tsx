"use client";

import React, { useMemo, useState } from "react";
import { 
  Title1, Title2, Body1, Input, Label, Card, Divider, Text,
  makeStyles
} from "@fluentui/react-components";
import { computeDO, STANDARD_ATM_KPA } from "@/lib/do";

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

export default function DOCalculatorPage() {
  const styles = useStyles();
  const [pressureStr, setPressureStr] = useState<string>("");
  const [temperatureStr, setTemperatureStr] = useState<string>("");

  const result = useMemo(() => {
    const p = pressureStr === "" ? NaN : parseFloat(pressureStr.replace(",","."));
    const t = temperatureStr === "" ? NaN : parseFloat(temperatureStr.replace(",","."));
    return computeDO(p, t);
  }, [pressureStr, temperatureStr]);

  return (
    <div className="page-container">
      <div className={styles.container}>
        <Title1 style={{ marginBottom: 8 }}>水饱和空气溶解氧计算</Title1>

        <div className={styles.grid}>
          <div className={styles.field}>
            <Label required>大气压 (kPa)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={pressureStr}
              onChange={(e) => setPressureStr((e.target as HTMLInputElement).value)}
              placeholder="例如 101.325"
            />
            <Text size={200}>
              参考值：标准大气压 {STANDARD_ATM_KPA} kPa
            </Text>
          </div>

          <div className={styles.field}>
            <Label required>温度 (℃)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={temperatureStr}
              onChange={(e) => setTemperatureStr((e.target as HTMLInputElement).value)}
              placeholder="0 ~ 40"
            />
            <Text size={200}>范围：0 ~ 40 ℃</Text>
          </div>
        </div>

        <Divider style={{ margin: "20px 0" }}>
          计算结果
        </Divider>

        <Card className={styles.resultCard}>
          {"error" in result ? (
            <Body1 style={{ color: "var(--colorPaletteRedForeground2)" }}>
              {result.error}
            </Body1>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
              <div>
                <Title2 style={{ fontSize: 16, marginBottom: 6 }}>饱和溶解氧标准值 (mg/L)</Title2>
                <Body1 style={{ fontWeight: 600, fontSize: 20 }}>
                  {result.standard_value.toFixed(2)}
                </Body1>
              </div>

              <div>
                <Title2 style={{ fontSize: 16, marginBottom: 6 }}>核查示值范围 (mg/L)</Title2>
                <Body1>
                  {result.range_min.toFixed(2)} ~ {result.range_max.toFixed(2)}
                </Body1>
                <Text size={200} style={{ color: "var(--colorNeutralForeground2)" }}>
                  即：饱和溶解氧标准值 ± 0.5 mg/L
                </Text>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

