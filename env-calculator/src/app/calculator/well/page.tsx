"use client";

import React, { useMemo, useState } from "react";
import { Title1, Title2, Body1, Input, Label, Card, Divider, makeStyles, Text } from "@fluentui/react-components";
import { computeWell } from "@/lib/well";

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

export default function WellCalculatorPage() {
  const styles = useStyles();
  const [B, setB] = useState<string>("");  // m
  const [C, setC] = useState<string>("");  // cm
  const [D, setD] = useState<string>("");  // m
  const [E, setE] = useState<string>(""); // m
  const [F, setF] = useState<string>("");  // cm
  const [G, setG] = useState<string>(""); // porosity (0~1)

  const result = useMemo(() => {
    const b = B === '' ? NaN : parseFloat(B.replace(',','.'));
    const c = C === '' ? NaN : parseFloat(C.replace(',','.'));
    const d = D === '' ? NaN : parseFloat(D.replace(',','.'));
    const e = E === '' ? NaN : parseFloat(E.replace(',','.'));
    const f = F === '' ? NaN : parseFloat(F.replace(',','.'));
    const g = G === '' ? undefined : (isNaN(parseFloat(G.replace(',', '.'))) ? undefined : parseFloat(G.replace(',', '.')));
    if ([b,c,d,e,f].some(x => Number.isNaN(x))) return null;
    return computeWell({ B_depth_m: b, C_id_cm: c, D_waterLevel_m: d, E_headToGround_m: e, F_enlarge_cm: f, G_porosity: g });
  }, [B, C, D, E, F, G]);

  return (
    <div className="page-container">
      <div className={styles.container}>
        <Title1 style={{ marginBottom: 8 }}>地下水井水体积计算</Title1>

        <div className={styles.grid}>
          <div className={styles.field}>
            <Label required>建井深度 B (m)</Label>
            <Input type="text" inputMode="decimal" value={B} onChange={e => setB((e.target as HTMLInputElement).value)} />
          </div>
          <div className={styles.field}>
            <Label required>井管内径 C (cm)</Label>
            <Input type="text" inputMode="decimal" value={C} onChange={e => setC((e.target as HTMLInputElement).value)} />
          </div>
          <div className={styles.field}>
            <Label required>水位 D (m)</Label>
            <Input type="text" inputMode="decimal" value={D} onChange={e => setD((e.target as HTMLInputElement).value)} />
          </div>
          <div className={styles.field}>
            <Label required>井口至地面高度 E (m)</Label>
            <Input type="text" inputMode="decimal" value={E} onChange={e => setE((e.target as HTMLInputElement).value)} />
          </div>
          <div className={styles.field}>
            <Label required>扩孔直径 F (cm)</Label>
            <Input type="text" inputMode="decimal" value={F} onChange={e => setF((e.target as HTMLInputElement).value)} />
          </div>
          <div className={styles.field}>
            <Label>填料孔隙度 G (0~1)</Label>
            <Input type="text" inputMode="decimal" value={G} onChange={e => setG((e.target as HTMLInputElement).value)} />
            <Text size={200} style={{ color: "var(--colorNeutralForeground2)" }}>
              若不填，体积结果按Excel规则留空
            </Text>
          </div>
        </div>

        <Divider style={{ margin: "20px 0" }}>计算结果</Divider>

        <div className={styles.resultGrid}>
          <Card style={{ padding: 12 }}>
            <Title2 style={{ fontSize: 16, marginBottom: 6 }}>埋深 (m)</Title2>
            <Body1 style={{ fontWeight: 600, fontSize: 18 }}>{result ? result.buriedDepth_m.toFixed(2) : "--"}</Body1>
          </Card>

          <Card style={{ padding: 12 }}>
            <Title2 style={{ fontSize: 16, marginBottom: 6 }}>井水深度 (m)</Title2>
            <Body1 style={{ fontWeight: 600, fontSize: 18 }}>{result ? result.waterDepth_m.toFixed(2) : "--"}</Body1>
          </Card>

          <Card style={{ padding: 12 }}>
            <Title2 style={{ fontSize: 16, marginBottom: 6 }}>井水体积 (L)</Title2>
            <Body1 style={{ fontWeight: 600, fontSize: 18 }}>
              {!result || result.waterVolume_L == null ? "--" : result.waterVolume_L.toFixed(1)}
            </Body1>
          </Card>
        </div>
      </div>
    </div>
  );
}

