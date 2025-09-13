"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Title1, Title2, Body1, Input, Label, Card, Divider, makeStyles, Text, Button } from "@fluentui/react-components";
import {
  calculateSolarParams,
  calculateStability,
  calculateSuitability,
  stabilityDescriptions,
  suitabilityInfo,
  type StabilityClass,
} from "@/lib/unorg";

const useStyles = makeStyles({
  container: { maxWidth: "1100px", margin: "0 auto", padding: "24px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
  },
  readingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "8px",
    marginTop: "12px",
  },
  readingItem: { display: "flex", flexDirection: "column", gap: "6px" },
  pairRow: {
    display: "flex",
    gap: "8px",
    '@media (max-width: 520px)': { flexDirection: 'column' },
  },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: '9999px',
    fontWeight: 700,
    minWidth: '80px',
    textAlign: "center",
    color: "white",
    background: "var(--colorBrandBackground)",
  },
});

export default function UnorganizedSuitabilityPage() {
  const styles = useStyles();

  // 时间地点
  const [dateISO, setDateISO] = useState("");
  const [timeHHmm, setTimeHHmm] = useState("");
  const [latStr, setLatStr] = useState<string>("31.2000");
  const [lonStr, setLonStr] = useState<string>("121.4000");

  // 气象条件
  const [totalCloud, setTotalCloud] = useState<number | "">(4);
  const [lowCloud, setLowCloud] = useState<number | "">(2);
  const [windSpeedType, setWindSpeedType] = useState<'custom'|'10m'>('custom');
  const [windSpeedHeight, setWindSpeedHeight] = useState<number | "">(2);
  const [terrain, setTerrain] = useState<'city'|'countryside'>('countryside');

  // 连续读数（10次）
  const [dirs, setDirs] = useState<(number|"")[]>(Array(10).fill(""));
  const [speeds, setSpeeds] = useState<(number|"")[]>(Array(10).fill(""));

  // 结果
  const [error, setError] = useState<string>("");
  const [stability, setStability] = useState<null | { dayOfYear: number; solarDeclination: number; solarAltitude: number; radiationLevel: -2|-1|0|1|2|3; windSpeed10m: number; stabilityClass: StabilityClass }>(null);
  const [suitability, setSuitability] = useState<null | ReturnType<typeof calculateSuitability>>(null);

  useEffect(() => {
    // 默认当前日期时间
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setDateISO(`${y}-${m}-${d}`);
    setTimeHHmm(`${hh}:${mm}`);
  }, []);

  const handleCalculate = () => {
    setError("");
    setSuitability(null);

    // 校验
    const latNum = parseFloat((latStr || '').replace(',', '.'));
    const lonNum = parseFloat((lonStr || '').replace(',', '.'));
    if (!dateISO || !timeHHmm || Number.isNaN(latNum) || Number.isNaN(lonNum) || typeof totalCloud !== 'number' || typeof lowCloud !== 'number') {
      setError("时间、地点与气象条件为必填项");
      return;
    }
    if (totalCloud < 0 || totalCloud > 10 || lowCloud < 0 || lowCloud > 10) {
      setError("云量需在0-10之间");
      return;
    }

    const dirVals: number[] = [];
    const speedVals: number[] = [];
    for (let i = 0; i < 10; i++) {
      const dv = dirs[i];
      const sv = speeds[i];
      if (typeof dv === 'number') dirVals.push(dv);
      if (typeof sv === 'number') speedVals.push(sv);
    }
    if (speedVals.length === 0) {
      setError("请至少输入一次有效的风速读数");
      return;
    }

    const measuredWindSpeed = speedVals.reduce((a, b) => a + b, 0) / speedVals.length;

    const solar = calculateSolarParams(dateISO, timeHHmm, latNum, lonNum, totalCloud, lowCloud);
    const stab = calculateStability(measuredWindSpeed, solar.radiationLevel, windSpeedType, typeof windSpeedHeight === 'number' ? windSpeedHeight : undefined, terrain);
    const merged = { ...solar, ...stab };
    setStability({ ...merged });

    if (dirVals.length >= 2) {
      const suit = calculateSuitability(dirVals, stab.windSpeed10m, stab.stabilityClass);
      setSuitability(suit);
    } else if (dirVals.length === 1) {
      setError("风向标准差计算需要至少2个读数，适宜度分析未执行。");
    }
  };

  return (
    <div className="page-container">
      <div className={styles.container}>
        <Title1 style={{ marginBottom: 8 }}>
          大气稳定度与监测适宜度计算
        </Title1>
        <Body1 style={{ color: 'var(--colorNeutralForeground2)', marginBottom: 16 }}>
          依据《大气污染物无组织排放监测技术导则 HJ/T 55-2000》
        </Body1>

        <div className={styles.grid}>
          <div className="bg-gray-100" style={{ padding: 16, borderRadius: 8 }}>
            <Title2 style={{ fontSize: 16, marginBottom: 8 }}>时间和地点</Title2>
            <div className={styles.field}>
              <Label required>监测日期</Label>
              <Input type="date" value={dateISO} onChange={e => setDateISO((e.target as HTMLInputElement).value)} />
            </div>
            <div className={styles.field}>
              <Label required>北京时间</Label>
              <Input type="time" value={timeHHmm} onChange={e => setTimeHHmm((e.target as HTMLInputElement).value)} />
            </div>
            <div className={styles.field}>
              <Label required>当地纬度 (°)</Label>
              <Input type="text" inputMode="decimal" placeholder="例如 31.2000" value={latStr} onChange={e => setLatStr((e.target as HTMLInputElement).value)} />
            </div>
            <div className={styles.field}>
              <Label required>当地经度 (°)</Label>
              <Input type="text" inputMode="decimal" placeholder="例如 121.4000" value={lonStr} onChange={e => setLonStr((e.target as HTMLInputElement).value)} />
            </div>
          </div>

          <div className="bg-gray-100" style={{ padding: 16, borderRadius: 8 }}>
            <Title2 style={{ fontSize: 16, marginBottom: 8 }}>气象条件</Title2>
            <div className={styles.field}>
              <Label required>总云量 (0-10成)</Label>
              <Input type="number" min={0} max={10} value={totalCloud === '' ? '' : String(totalCloud)} onChange={e => setTotalCloud((e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))} />
            </div>
            <div className={styles.field}>
              <Label required>低云量 (0-10成)</Label>
              <Input type="number" min={0} max={10} value={lowCloud === '' ? '' : String(lowCloud)} onChange={e => setLowCloud((e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))} />
            </div>
            <div className={styles.field}>
              <Label required>风速测定方式</Label>
              <select value={windSpeedType} onChange={e => setWindSpeedType(e.target.value as any)} style={{ height: 32, borderRadius: 4 }}>
                <option value="custom">自定义高度风速</option>
                <option value="10m">10米处风速</option>
              </select>
            </div>
            {windSpeedType === 'custom' && (
              <>
                <div className={styles.field}>
                  <Label required>风速测定高度 (m)</Label>
                  <Input type="number" step={0.1} value={windSpeedHeight === '' ? '' : String(windSpeedHeight)} onChange={e => setWindSpeedHeight((e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))} />
                </div>
                <div className={styles.field}>
                  <Label required>下垫面类型</Label>
                  <select value={terrain} onChange={e => setTerrain(e.target.value as any)} style={{ height: 32, borderRadius: 4 }}>
                    <option value="countryside">乡村</option>
                    <option value="city">城市</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-gray-100" style={{ padding: 16, borderRadius: 8, marginTop: 16 }}>
          <Title2 style={{ fontSize: 16, marginBottom: 8 }}>风向与风速连续读数 (10次)</Title2>
          <Text size={200} style={{ color: 'var(--colorNeutralForeground2)' }}>输入10次连续读数（至少2个风向用于标准差计算）。</Text>
          <div className={styles.readingsGrid}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={styles.readingItem}>
                <Label>第 {i + 1} 次</Label>
                <div className={styles.pairRow}>
                  <Input type="number" step={0.1} placeholder="风向°" value={dirs[i] === '' ? '' : String(dirs[i])}
                    style={{ flex: 1, minWidth: 0 }}
                    onChange={e => setDirs(prev => { const arr = [...prev]; arr[i] = (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value); return arr; })} />
                  <Input type="number" step={0.1} placeholder="风速m/s" value={speeds[i] === '' ? '' : String(speeds[i])}
                    style={{ flex: 1, minWidth: 0 }}
                    onChange={e => setSpeeds(prev => { const arr = [...prev]; arr[i] = (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value); return arr; })} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--colorPaletteRedBackground1)', color: 'var(--colorPaletteRedForeground1)' }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button appearance="primary" onClick={handleCalculate}>计算</Button>
        </div>

        {stability && (
          <div style={{ marginTop: 16 }}>
            <Divider>计算结果</Divider>
            <div className={styles.resultGrid}>
              <Card style={{ padding: 12 }}>
                <Title2 style={{ fontSize: 16, marginBottom: 6 }}>大气稳定度等级</Title2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={styles.badge}>{stability.stabilityClass}</span>
                  <Body1 style={{ fontWeight: 600 }}>{stabilityDescriptions[stability.stabilityClass]}</Body1>
                </div>
              </Card>
              <Card style={{ padding: 12 }}>
                <Title2 style={{ fontSize: 16, marginBottom: 6 }}>中间参数</Title2>
                <Body1>日期序数：{stability.dayOfYear}</Body1>
                <Body1>太阳倾角(δ)：{stability.solarDeclination.toFixed(2)} °</Body1>
                <Body1>太阳高度角(h₀)：{stability.solarAltitude.toFixed(2)} °</Body1>
                <Body1>太阳辐射等级：{stability.radiationLevel}</Body1>
                <Body1>10m风速(平均)：{stability.windSpeed10m.toFixed(2)} m/s</Body1>
              </Card>
            </div>
          </div>
        )}

        {suitability && (
          <div style={{ marginTop: 16 }}>
            <Divider>监测适宜度分析</Divider>
            <div className={styles.resultGrid}>
              <Card style={{ padding: 12 }}>
                <Title2 style={{ fontSize: 16, marginBottom: 6 }}>风向变化</Title2>
                <Body1>平均风向：{`${suitability.meanDirection.toFixed(1)}°`}</Body1>
                <Body1>方向描述：{suitability.directionDescription}</Body1>
                <Body1>标准差：{suitability.dirStdDev.toFixed(2)} °</Body1>
                <Body1>适宜度：<strong>{suitabilityInfo.text[suitability.dirSuitability]}</strong></Body1>
              </Card>
              <Card style={{ padding: 12 }}>
                <Title2 style={{ fontSize: 16, marginBottom: 6 }}>平均风速</Title2>
                <Body1>10m平均：{suitability.speedAvg.toFixed(2)} m/s</Body1>
                <Body1>适宜度：<strong>{suitabilityInfo.text[suitability.speedSuitability]}</strong></Body1>
              </Card>
              <Card style={{ padding: 12 }}>
                <Title2 style={{ fontSize: 16, marginBottom: 6 }}>大气稳定度</Title2>
                <Body1>等级：{suitability.stabilityClass}</Body1>
                <Body1>适宜度：<strong>{suitabilityInfo.text[suitability.stabilitySuitability]}</strong></Body1>
              </Card>
            </div>

            <div style={{ padding: 16, borderRadius: 8, marginTop: 12, background: suitability.shouldCancel ? 'var(--colorPaletteRedBackground1)' : 'var(--colorPaletteLightTealBackground2)' }}>
              <Title2 style={{ fontSize: 16, marginBottom: 6 }}>总适宜度判定</Title2>
              <Body1 style={{ fontWeight: 700, fontSize: 20 }}>{suitabilityInfo.text[suitability.overall]}</Body1>
              <Body1 style={{ marginTop: 6 }}>
                {suitability.shouldCancel ? (
                  <span>
                    {suitabilityInfo.desc[suitability.overall]}<br />
                    <strong>建议：应取消监测或改期</strong>
                  </span>
                ) : (
                  <span>{suitabilityInfo.desc[suitability.overall]}</span>
                )}
              </Body1>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

