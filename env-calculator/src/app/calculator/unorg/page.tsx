"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Location24Regular } from "@fluentui/react-icons";
import {
  calculateSolarParams,
  calculateStability,
  calculateSuitability,
  stabilityDescriptions,
  suitabilityInfo,
  type StabilityClass,
} from "@/lib/unorg";
import CalculatorShell from "@/components/CalculatorShell";
import ResultDisplay from "@/components/ResultDisplay";

export default function UnorganizedSuitabilityPage() {
  // Time & location
  const [dateISO, setDateISO] = useState("");
  const [timeHHmm, setTimeHHmm] = useState("");
  const [latStr, setLatStr] = useState<string>("");
  const [lonStr, setLonStr] = useState<string>("");

  // Weather conditions
  const [totalCloud, setTotalCloud] = useState<number | "">("");
  const [lowCloud, setLowCloud] = useState<number | "">("");
  const [windSpeedType, setWindSpeedType] = useState<"custom" | "10m">(
    "custom"
  );
  const [windSpeedHeightStr, setWindSpeedHeightStr] =
    useState<string>("2");
  const [terrain, setTerrain] = useState<"city" | "countryside">("city");

  // Wind readings (10)
  const [dirs, setDirs] = useState<string[]>(Array(10).fill(""));
  const [speeds, setSpeeds] = useState<string[]>(Array(10).fill(""));

  // GPS
  const [gpsLoading, setGpsLoading] = useState(false);

  // Results
  const [error, setError] = useState<string>("");
  const [stability, setStability] = useState<null | {
    dayOfYear: number;
    solarDeclination: number;
    solarAltitude: number;
    radiationLevel: -2 | -1 | 0 | 1 | 2 | 3;
    windSpeed10m: number;
    stabilityClass: StabilityClass;
  }>(null);
  const [suitability, setSuitability] = useState<null | ReturnType<
    typeof calculateSuitability
  >>(null);

  const setCurrentDateTime = useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setDateISO(`${y}-${m}-${d}`);
    setTimeHHmm(`${hh}:${mm}`);
  }, []);

  useEffect(() => {
    setCurrentDateTime();
  }, [setCurrentDateTime]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("您的设备不支持GPS定位功能");
      return;
    }
    setGpsLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLatStr(latitude.toFixed(4));
        setLonStr(longitude.toFixed(4));
        setGpsLoading(false);
      },
      (gpsError) => {
        setGpsLoading(false);
        switch (gpsError.code) {
          case gpsError.PERMISSION_DENIED:
            setError("GPS定位被拒绝，请在浏览器设置中允许位置访问权限");
            break;
          case gpsError.POSITION_UNAVAILABLE:
            setError("GPS定位信息不可用，请检查设备GPS是否开启");
            break;
          case gpsError.TIMEOUT:
            setError("GPS定位超时，请重试");
            break;
          default:
            setError("GPS定位失败，请重试");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleCalculate = () => {
    setError("");
    setSuitability(null);

    const latNum = parseFloat((latStr || "").replace(",", "."));
    const lonNum = parseFloat((lonStr || "").replace(",", "."));
    if (
      !dateISO ||
      !timeHHmm ||
      Number.isNaN(latNum) ||
      Number.isNaN(lonNum) ||
      typeof totalCloud !== "number" ||
      typeof lowCloud !== "number"
    ) {
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
      if (dv !== "") {
        const parsed = parseFloat(dv.replace(",", "."));
        if (!Number.isNaN(parsed)) dirVals.push(parsed);
      }
      if (sv !== "") {
        const parsedS = parseFloat(sv.replace(",", "."));
        if (!Number.isNaN(parsedS)) speedVals.push(parsedS);
      }
    }
    if (speedVals.length === 0) {
      setError("请至少输入一次有效的风速读数");
      return;
    }

    const measuredWindSpeed =
      speedVals.reduce((a, b) => a + b, 0) / speedVals.length;

    const solar = calculateSolarParams(
      dateISO,
      timeHHmm,
      latNum,
      lonNum,
      totalCloud,
      lowCloud
    );
    const heightNum =
      windSpeedHeightStr === ""
        ? undefined
        : isNaN(
              parseFloat(windSpeedHeightStr.replace(",", "."))
            )
          ? undefined
          : parseFloat(windSpeedHeightStr.replace(",", "."));
    const stab = calculateStability(
      measuredWindSpeed,
      solar.radiationLevel,
      windSpeedType,
      heightNum,
      terrain
    );
    const merged = { ...solar, ...stab };
    setStability({ ...merged });

    if (dirVals.length >= 2) {
      const suit = calculateSuitability(
        dirVals,
        stab.windSpeed10m,
        stab.stabilityClass
      );
      setSuitability(suit);
    } else if (dirVals.length === 1) {
      setError(
        "风向标准差计算需要至少2个读数，适宜度分析未执行。"
      );
    }
  };

  const handleReset = () => {
    setDateISO("");
    setTimeHHmm("");
    setLatStr("");
    setLonStr("");
    setTotalCloud("");
    setLowCloud("");
    setWindSpeedType("custom");
    setWindSpeedHeightStr("");
    setTerrain("city");
    setDirs(Array(10).fill(""));
    setSpeeds(Array(10).fill(""));
    setGpsLoading(false);
    setError("");
    setStability(null);
    setSuitability(null);
  };

  const actions = (
    <>
      <button type="button" onClick={handleCalculate} className="app-action-primary flex-1 md:flex-none">
        开始计算
      </button>
      <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
        重置
      </button>
    </>
  );

  return (
    <CalculatorShell
      title="大气稳定度与监测适宜度计算"
      description="依据《大气污染物无组织排放监测技术导则 HJ/T 55-2000》"
      actions={actions}
    >
      {/* Time & Location Card */}
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface-secondary)] shadow-[var(--app-shadow-sm)] p-5">
        <h2 className="text-base font-semibold text-[var(--app-ink)] mb-3">
          时间和地点
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              监测日期
            </label>
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              北京时间
            </label>
            <input
              type="time"
              value={timeHHmm}
              onChange={(e) => setTimeHHmm(e.target.value)}
              className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              当地纬度 (°)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="例如 31.2000"
              value={latStr}
              onChange={(e) => setLatStr(e.target.value)}
              className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm placeholder:text-[var(--app-ink-tertiary)] outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              当地经度 (°)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="例如 121.4000"
              value={lonStr}
              onChange={(e) => setLonStr(e.target.value)}
              className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm placeholder:text-[var(--app-ink-tertiary)] outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            />
          </div>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={gpsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] hover:bg-[var(--app-surface-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {gpsLoading ? (
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <Location24Regular className="w-4 h-4" />
            )}
            {gpsLoading ? "定位中..." : "获取当前位置"}
          </button>
        </div>
      </div>

      {/* Weather Conditions Card */}
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-5">
        <h2 className="text-base font-semibold text-[var(--app-ink)] mb-3">
          气象条件
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              总云量 (0-10成)
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={totalCloud === "" ? "" : String(totalCloud)}
              onChange={(e) =>
                setTotalCloud(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              低云量 (0-10成)
            </label>
            <input
              type="number"
              min={0}
              max={10}
              value={lowCloud === "" ? "" : String(lowCloud)}
              onChange={(e) =>
                setLowCloud(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
              <span className="text-[var(--app-danger)] mr-0.5">*</span>
              风速测定方式
            </label>
            <select
              value={windSpeedType}
              onChange={(e) =>
                setWindSpeedType(e.target.value as "custom" | "10m")
              }
              className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
            >
              <option value="custom">自定义高度风速</option>
              <option value="10m">10米处风速</option>
            </select>
          </div>
        </div>

        {windSpeedType === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--app-line)]">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
                <span className="text-[var(--app-danger)] mr-0.5">*</span>
                风速测定高度 (m)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={windSpeedHeightStr}
                onChange={(e) => setWindSpeedHeightStr(e.target.value)}
                className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--app-ink-secondary)]">
                <span className="text-[var(--app-danger)] mr-0.5">*</span>
                下垫面类型
              </label>
              <select
                value={terrain}
                onChange={(e) =>
                  setTerrain(e.target.value as "city" | "countryside")
                }
                className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
              >
                <option value="countryside">乡村</option>
                <option value="city">城市</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Wind Direction & Speed Readings Card */}
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-5">
        <h2 className="text-base font-semibold text-[var(--app-ink)] mb-1">
          风向与风速连续读数 (10次)
        </h2>
        <p className="text-xs text-[var(--app-ink-tertiary)] mb-3">
          输入10次连续读数（至少2个风向用于标准差计算）。
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[var(--app-ink-secondary)]">
                第 {i + 1} 次
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="风向°"
                  value={dirs[i]}
                  onChange={(e) =>
                    setDirs((prev) => {
                      const arr = [...prev];
                      arr[i] = e.target.value;
                      return arr;
                    })
                  }
                  className="w-full min-h-[38px] px-2 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm placeholder:text-[var(--app-ink-tertiary)] outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="m/s"
                  value={speeds[i]}
                  onChange={(e) =>
                    setSpeeds((prev) => {
                      const arr = [...prev];
                      arr[i] = e.target.value;
                      return arr;
                    })
                  }
                  className="w-full min-h-[38px] px-2 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm placeholder:text-[var(--app-ink-tertiary)] outline-none hover:border-[var(--app-line-strong)] focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)] transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm font-medium">
          {error}
        </div>
      )}

      {/* Stability Results */}
      {stability && (
        <ResultDisplay
          title="大气稳定度"
          items={[
            {
              label: "大气稳定度等级",
              value: `${stability.stabilityClass} ${stabilityDescriptions[stability.stabilityClass]}`,
              status: "success",
            },
            {
              label: "太阳高度角",
              value: `${stability.solarAltitude.toFixed(2)}`,
              unit: "°",
              status: "neutral",
            },
            {
              label: "太阳辐射等级",
              value: `${stability.radiationLevel}`,
              status: "neutral",
            },
            {
              label: "10m风速",
              value: `${stability.windSpeed10m.toFixed(2)}`,
              unit: "m/s",
              status: "neutral",
            },
          ]}
        />
      )}

      {/* Suitability Results */}
      {suitability && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Direction suitability */}
            <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-4">
              <h3 className="text-sm font-semibold text-[var(--app-ink)] mb-2">
                风向变化
              </h3>
              <p className="text-xs text-[var(--app-ink-secondary)]">
                平均风向：{suitability.meanDirection.toFixed(1)}°
              </p>
              <p className="text-xs text-[var(--app-ink-secondary)]">
                方向描述：{suitability.directionDescription}
              </p>
              <p className="text-xs text-[var(--app-ink-secondary)]">
                标准差：{suitability.dirStdDev.toFixed(2)} °
              </p>
              <p className="text-sm font-semibold mt-2 text-[var(--app-ink)]">
                适宜度：{suitabilityInfo.text[suitability.dirSuitability]}
              </p>
            </div>

            {/* Speed suitability */}
            <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-4">
              <h3 className="text-sm font-semibold text-[var(--app-ink)] mb-2">
                平均风速
              </h3>
              <p className="text-xs text-[var(--app-ink-secondary)]">
                10m平均：{suitability.speedAvg.toFixed(2)} m/s
              </p>
              <p className="text-sm font-semibold mt-2 text-[var(--app-ink)]">
                适宜度：{suitabilityInfo.text[suitability.speedSuitability]}
              </p>
            </div>

            {/* Stability suitability */}
            <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] p-4">
              <h3 className="text-sm font-semibold text-[var(--app-ink)] mb-2">
                大气稳定度
              </h3>
              <p className="text-xs text-[var(--app-ink-secondary)]">
                等级：{suitability.stabilityClass}
              </p>
              <p className="text-sm font-semibold mt-2 text-[var(--app-ink)]">
                适宜度：
                {suitabilityInfo.text[suitability.stabilitySuitability]}
              </p>
            </div>
          </div>

          {/* Overall verdict */}
          <div
            className={`rounded-[var(--app-radius-lg)] p-5 ${
              suitability.shouldCancel
                ? "bg-[var(--app-danger-light)] border border-[var(--app-danger)]"
                : "bg-[var(--app-success-light)] border border-[var(--app-success)]"
            }`}
          >
            <h3 className="text-base font-semibold text-[var(--app-ink)] mb-2">
              总适宜度判定
            </h3>
            <p
              className={`text-xl font-bold ${
                suitability.shouldCancel
                  ? "text-[var(--app-danger)]"
                  : "text-[var(--app-success)]"
              }`}
            >
              {suitabilityInfo.text[suitability.overall]}
            </p>
            <p className="text-sm text-[var(--app-ink-secondary)] mt-1">
              {suitabilityInfo.desc[suitability.overall]}
            </p>
            {suitability.shouldCancel && (
              <p className="text-sm font-bold text-[var(--app-danger)] mt-2">
                建议：应取消监测或改期
              </p>
            )}
          </div>
        </>
      )}
    </CalculatorShell>
  );
}
