"use client";

import React, { useMemo, useState } from "react";
import {
  Body1,
  Button,
  Card,
  Input,
  Label,
  Title1,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { computePHStandardValues } from "@/lib/ph";

const QUICK_TEMPERATURES = [18.6, 25, 95];

const useStyles = makeStyles({
  page: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "14px 12px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    [`@media (min-width: 640px)`]: {
      padding: "22px 16px 36px",
      gap: "18px",
    },
  },
  inputCard: {
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    borderRadius: tokens.borderRadiusXLarge,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  quickActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  quickButton: {
    flex: "1 1 calc(33.333% - 6px)",
    minWidth: "84px",
    [`@media (min-width: 640px)`]: {
      flex: "0 0 auto",
      minWidth: "96px",
    },
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    [`@media (min-width: 720px)`]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
  },
  resultCard: {
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    borderRadius: tokens.borderRadiusXLarge,
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
  },
  headerBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  label: {
    color: tokens.colorNeutralForeground2,
  },
  range: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  primaryValue: {
    fontSize: "30px",
    lineHeight: "32px",
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    whiteSpace: "nowrap",
  },
  disabledValue: {
    fontSize: "18px",
    lineHeight: "24px",
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteRedForeground2,
    whiteSpace: "nowrap",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },
  metaItem: {
    padding: "10px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  },
  metaLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  metaValue: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightMedium,
    wordBreak: "break-word",
  },
  errorText: {
    color: tokens.colorPaletteRedForeground2,
  },
});

function formatFixed(value: number, digits: number) {
  return Number.isNaN(value) ? "—" : value.toFixed(digits);
}

export default function PHCalculatorPage() {
  const styles = useStyles();
  const [temperatureStr, setTemperatureStr] = useState<string>("25.0");

  const result = useMemo(() => {
    const temperature = temperatureStr.trim() === "" ? NaN : parseFloat(temperatureStr.replace(",", "."));
    return computePHStandardValues(temperature);
  }, [temperatureStr]);

  return (
    <div className="page-container">
      <div className={styles.page}>
        <Title1>pH 缓冲液标准值</Title1>

        <Card className={styles.inputCard}>
          <div className={styles.field}>
            <Label required htmlFor="ph-temperature-input">
              温度（℃）
            </Label>
            <Input
              id="ph-temperature-input"
              type="text"
              inputMode="decimal"
              value={temperatureStr}
              onChange={(event) => setTemperatureStr((event.target as HTMLInputElement).value)}
              placeholder="例如 25.0"
              size="large"
            />
          </div>

          <div className={styles.quickActions}>
            {QUICK_TEMPERATURES.map((temperature) => (
              <Button
                key={temperature}
                className={styles.quickButton}
                appearance="secondary"
                onClick={() => setTemperatureStr(String(temperature))}
              >
                {temperature} ℃
              </Button>
            ))}
          </div>
        </Card>

        {"error" in result ? (
          <Card className={styles.resultCard}>
            <Body1 className={styles.errorText}>{result.error}</Body1>
          </Card>
        ) : (
          <div className={styles.resultGrid}>
            {result.items.map((item) => (
              <Card key={item.label} className={styles.resultCard}>
                <div className={styles.row}>
                  <div className={styles.headerBlock}>
                    <Body1 className={styles.label}>缓冲液 {item.label}</Body1>
                    <span className={styles.range}>{item.range[0]}–{item.range[1]} ℃</span>
                  </div>
                  <div className={item.available ? styles.primaryValue : styles.disabledValue}>
                    {item.available ? formatFixed(item.standardValue, 3) : "不可用"}
                  </div>
                </div>

                <div className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>匹配温度点</span>
                    <span className={styles.metaValue}>
                      {item.available ? `${formatFixed(item.matchedTemp, 0)} ℃` : "—"}
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>操作值</span>
                    <span className={styles.metaValue}>{formatFixed(item.displayValue, 2)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}