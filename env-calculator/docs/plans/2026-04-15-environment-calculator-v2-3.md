# 环境检测计算器 v2.3 实施记录

## 实现范围

- 新增 `/calculator/v23` 综合计算页面，集中承载 v2.3 单位核实版公式。
- 新增 `src/lib/calculators/` 公式层，按需求文档拆分为独立纯函数模块。
- 首页新增“环境公式 v2.3”入口。
- 构建去除 Google Fonts 运行时拉取，改用项目现有系统字体栈，保证离线构建可用。
- 为现有 `src/lib/__tests__/fluegas.test.ts` 补充轻量测试全局类型声明，避免 TypeScript 全量检查失败。

## 公式模块

- `air-volume.ts`：标准状况采样体积换算。
- `pm-conc.ts`：环境空气 PM10/PM2.5 质量浓度。
- `stack-pm.ts`：固定污染源颗粒物浓度。
- `gas.ts`：烟气流速与等速采样验证。
- `aqi.ts`：空气质量指数 IAQI。
- `mdl-qc.ts`：方法检出限。
- `recovery-qc.ts`：加标回收率与 RSD。
- `alkalinity-hardness.ts`：滴定法碱度/硬度，以 CaCO3 计。
- `soil-moisture.ts`：土壤含水率。
- `soil-prep-qc.ts`：土壤制备损失率与过筛率。
- `sample-size.ts`：采样方案统计样本数。
- `exceedance.ts`：污染物超标倍数。

## 验证

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Chrome DevTools 打开 `http://127.0.0.1:10000/calculator/v23`，确认页面渲染、模块切换和控制台无错误。
