"use client";

import React, { useMemo, useState } from "react";
import {
  Title1,
  Title2,
  Body1,
  Input,
  Label,
  Card,
  Divider,
  makeStyles,
  Text,
  MessageBar,
  MessageBarBody,
} from "@fluentui/react-components";
import { calculateFlueGasConversion } from "@/lib/fluegas";

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

export default function FlueGasCalculatorPage() {
  const styles = useStyles();
  
  // Input states
  const [measuredConcentrationStr, setMeasuredConcentrationStr] = useState<string>("");
  const [referenceO2Str, setReferenceO2Str] = useState<string>("");
  const [measuredO2Str, setMeasuredO2Str] = useState<string>("");

  // Calculate result with useMemo for performance
  const result = useMemo(() => {
    // Parse inputs (support both comma and dot as decimal separator)
    const measuredConc = measuredConcentrationStr === "" 
      ? NaN 
      : parseFloat(measuredConcentrationStr.replace(",", "."));
    
    const refO2 = referenceO2Str === "" 
      ? NaN 
      : parseFloat(referenceO2Str.replace(",", "."));
    
    const measO2 = measuredO2Str === "" 
      ? NaN 
      : parseFloat(measuredO2Str.replace(",", "."));

    return calculateFlueGasConversion(measuredConc, refO2, measO2);
  }, [measuredConcentrationStr, referenceO2Str, measuredO2Str]);

  return (
    <div className="page-container">
      <div className={styles.container}>
        <Title1 style={{ marginBottom: 8 }}>烟气折算计算</Title1>
        <Body1 style={{ marginBottom: 24, color: "var(--colorNeutralForeground2)" }}>
          根据烟气排放标准，将实测污染物浓度折算为基准氧含量下的污染物浓度
        </Body1>

        {/* Information Banner */}
        <MessageBar intent="info" style={{ marginBottom: 20 }}>
          <MessageBarBody>
            <strong>计算公式：</strong>折算后浓度 = 实测浓度 × (21 - 基准氧含量) / (21 - 实测氧含量)
          </MessageBarBody>
        </MessageBar>

        {/* Input Fields */}
        <Card style={{ padding: "20px", marginBottom: 20 }}>
          <Title2 style={{ marginBottom: 16, fontSize: "16px" }}>输入参数</Title2>
          
          <div className={styles.grid}>
            <div className={styles.field}>
              <Label required>实测污染物浓度</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={measuredConcentrationStr}
                onChange={(e) => setMeasuredConcentrationStr((e.target as HTMLInputElement).value)}
                placeholder="例如 150"
              />
              <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
                输入数值（无需单位，输出与输入单位一致）
              </Text>
            </div>

            <div className={styles.field}>
              <Label required>基准氧含量 (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={referenceO2Str}
                onChange={(e) => setReferenceO2Str((e.target as HTMLInputElement).value)}
                placeholder="例如 6"
              />
              <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
                范围：0-21%
              </Text>
            </div>

            <div className={styles.field}>
              <Label required>实测氧含量 (%)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={measuredO2Str}
                onChange={(e) => setMeasuredO2Str((e.target as HTMLInputElement).value)}
                placeholder="例如 13.09"
              />
              <Text size={200} style={{ color: "var(--colorNeutralForeground3)" }}>
                范围：0-21%（必须小于21%）
              </Text>
            </div>
          </div>
        </Card>

        <Divider style={{ margin: "20px 0" }}>计算结果</Divider>

        {/* Result Display */}
        <Card className={styles.resultCard}>
          {"error" in result ? (
            <Body1 style={{ color: "var(--colorPaletteRedForeground2)" }}>
              {result.error}
            </Body1>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Main Result */}
              <div>
                <Text size={300} style={{ color: "var(--colorNeutralForeground2)", display: "block", marginBottom: 8 }}>
                  折算后污染物浓度
                </Text>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <Text 
                    size={600} 
                    style={{ 
                      fontWeight: 600, 
                      fontSize: 32,
                      color: "var(--colorBrandForeground1)"
                    }}
                  >
                    {result.convertedConcentration.toFixed(2)}
                  </Text>
                  <Text size={400} style={{ color: "var(--colorNeutralForeground2)" }}>
                    （与输入浓度单位一致）
                  </Text>
                </div>
              </div>

              <Divider />

              {/* Additional Info */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <Card style={{ padding: 12, backgroundColor: "var(--colorNeutralBackground2)" }}>
                  <Text size={200} style={{ color: "var(--colorNeutralForeground2)", display: "block" }}>
                    折算系数
                  </Text>
                  <Text size={400} style={{ fontWeight: 600 }}>
                    {result.conversionFactor.toFixed(4)}
                  </Text>
                </Card>

                <Card style={{ padding: 12, backgroundColor: "var(--colorNeutralBackground2)" }}>
                  <Text size={200} style={{ color: "var(--colorNeutralForeground2)", display: "block" }}>
                    实测浓度
                  </Text>
                  <Text size={400} style={{ fontWeight: 600 }}>
                    {measuredConcentrationStr || "-"}
                  </Text>
                </Card>

                <Card style={{ padding: 12, backgroundColor: "var(--colorNeutralBackground2)" }}>
                  <Text size={200} style={{ color: "var(--colorNeutralForeground2)", display: "block" }}>
                    基准氧含量
                  </Text>
                  <Text size={400} style={{ fontWeight: 600 }}>
                    {referenceO2Str ? `${referenceO2Str}%` : "-"}
                  </Text>
                </Card>

                <Card style={{ padding: 12, backgroundColor: "var(--colorNeutralBackground2)" }}>
                  <Text size={200} style={{ color: "var(--colorNeutralForeground2)", display: "block" }}>
                    实测氧含量
                  </Text>
                  <Text size={400} style={{ fontWeight: 600 }}>
                    {measuredO2Str ? `${measuredO2Str}%` : "-"}
                  </Text>
                </Card>
              </div>

              {/* Calculation Note */}
              <MessageBar intent="success">
                <MessageBarBody>
                  <Text size={200}>
                    结果已按<strong>四舍六入五成双</strong>规则修约至小数点后两位
                  </Text>
                </MessageBarBody>
              </MessageBar>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

