import React from 'react';
import {
  Beaker24Regular,
  Calculator24Regular,
  Cloud24Regular,
  DataUsage24Regular,
  Drop24Regular,
  LeafOne24Regular,
} from '@fluentui/react-icons';

export type CalculatorDomain = '环境检测' | '环境处理';
export type CalculatorCategory = '空气和废气' | '水质' | '通用与质控' | '水处理' | '气体处理';

/**
 * 工具使用场景(用于搜索、筛选与未来的场景过滤):
 * - field:  现场采样 / 检测(移动场景)
 * - lab:    实验室分析
 * - qc:     数据后处理 / 质量控制统计
 * - design: 工程设计
 */
export type CalculatorScene = 'field' | 'lab' | 'qc' | 'design';

/** 使用频次,用于首页"常用 / 高级"视图与内部排序。 */
export type CalculatorFrequency = 'common' | 'advanced';

export type CalculatorNavItem = {
  id: string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  description: string;
  domain: CalculatorDomain;
  category: CalculatorCategory;
  href: string;
  featured?: boolean;
  badge?: string;
  icon: React.ReactNode;
  /** 标准依据编号列表,用于搜索匹配与详情展示。 */
  standards?: string[];
  /** 适用场景,一项工具可以同时属于多个场景。 */
  scene?: CalculatorScene[];
  /** 使用频次。 */
  frequency?: CalculatorFrequency;
  /** 纯文本公式或要点,用于 ToolInfoSheet 无 LaTeX 时的回退展示。 */
  formula?: string;
  /** LaTeX 字符串,供 ToolInfoSheet 用 KaTeX 渲染。 */
  formulaTex?: string;
  /** 一行使用提示,显示在 ToolInfoSheet 顶部。 */
  tip?: string;
};

export const calculatorSceneLabels: Record<CalculatorScene, string> = {
  field: '现场',
  lab: '实验室',
  qc: '质控',
  design: '设计',
};

export const calculatorFrequencyLabels: Record<CalculatorFrequency, string> = {
  common: '常用',
  advanced: '高级',
};

export const calculatorDomains: { key: CalculatorDomain; label: string; description: string }[] = [
  {
    key: '环境检测',
    label: '环境检测',
    description: '现场检测、质量控制和常用监测核算',
  },
  {
    key: '环境处理',
    label: '环境处理',
    description: '水处理和气体处理工程设计核算',
  },
];

export const calculatorCategories: { key: CalculatorCategory; label: string; domain: CalculatorDomain; description: string }[] = [
  {
    key: '空气和废气',
    label: '空气和废气',
    domain: '环境检测',
    description: '采样、烟气、固定源、AQI 与无组织监测相关计算',
  },
  {
    key: '水质',
    label: '水质',
    domain: '环境检测',
    description: '溶解氧、pH、水质质控和地下水相关计算',
  },
  {
    key: '通用与质控',
    label: '通用与质控',
    domain: '环境检测',
    description: '方法检出限、回收率、精密度和土壤质控计算',
  },
  {
    key: '水处理',
    label: '水处理',
    domain: '环境处理',
    description: '稳定塘、脱氮除磷和碱度平衡设计计算',
  },
  {
    key: '气体处理',
    label: '气体处理',
    domain: '环境处理',
    description: '吸收塔、填料塔传质和压降设计计算',
  },
];

const mainTools: CalculatorNavItem[] = [
  {
    id: 'sampling-calculator',
    title: '采样嘴计算',
    description: '根据烟气流速、含湿量与仪器规格快速推荐采样嘴径。',
    domain: '环境检测',
    category: '空气和废气',
    icon: React.createElement(Calculator24Regular),
    href: '/calculator/sampling',
    badge: '固定源',
    standards: ['HJ/T 397-2007', 'GB/T 16157-1996'],
    scene: ['field'],
    frequency: 'common',
    formula: '干烟气流速 Vd = Vw × (1 - Xw/100)\n理论嘴径 d = 2 × √(Q / (Vd · π)) × 1000(mm)\n保护功率 = 0.85 × 满功率',
    formulaTex: 'V_d = V_w\\,(1 - X_w/100)\\qquad d = 2\\sqrt{\\dfrac{Q}{\\pi V_d}}\\times 1000',
    tip: '先选仪器,再填烟气参数。含湿量以体积分数 % 计。',
  },
  {
    id: 'fluegas-conversion',
    title: '烟气折算计算',
    description: '将实测浓度折算至基准氧含量,适用于废气排放核算。',
    domain: '环境检测',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/fluegas',
    standards: ['HJ 75-2017', 'GB 13223-2011'],
    scene: ['field', 'lab'],
    frequency: 'common',
    formula: 'C_ref = C_实测 × (21 - O₂基准) / (21 - O₂实测)',
    formulaTex: 'C_{ref} = C_{meas}\\cdot\\dfrac{21 - O_{2,ref}}{21 - O_{2,meas}}',
    tip: '基准氧含量按所属排放标准查定,注意实测 O₂ 必须 < 21%。',
  },
  {
    id: 'gas-converter',
    title: '气体单位换算',
    description: '支持 SO2、NO、NO2、CO、NMHC 等污染物浓度换算。',
    domain: '环境检测',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/gas',
    standards: ['HJ/T 397-2007'],
    scene: ['field', 'lab'],
    frequency: 'common',
    formula: 'C(mg/m³) = ppm × M × P / (R · T)\nR = 0.082057 L·atm/(mol·K)',
    formulaTex: 'C\\,(\\mathrm{mg/m^3}) = \\dfrac{\\mathrm{ppm}\\cdot M\\cdot P}{R\\cdot T}',
    tip: 'NMHC 按碳计(ppmC ↔ mgC/m³),用碳摩尔质量 12.011。',
  },
  {
    id: 'unorg-suitability',
    title: '无组织监测适宜度',
    description: '依据 HJ/T 55-2000 快速辅助判断监测布点适宜性。',
    domain: '环境检测',
    category: '空气和废气',
    icon: React.createElement(LeafOne24Regular),
    href: '/calculator/unorg',
    standards: ['HJ/T 55-2000'],
    scene: ['field'],
    frequency: 'common',
    formula: '综合级别 = 风向标准差 / 风速 / 稳定度 三者取最差\n出现 1 个 d 或 ≥2 个 c 建议取消监测',
    tip: '10 次风向/风速序列连续观测,用样本标准差。',
  },
  {
    id: 'do-saturation',
    title: '溶解氧计算',
    description: '按温度与大气压快速换算饱和溶解氧标准值。',
    domain: '环境检测',
    category: '水质',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/do',
    badge: '常用',
    standards: ['HJ 506-2009'],
    scene: ['field', 'lab'],
    frequency: 'common',
    formula: 'DO = G₂ × (P - e_s) / (101.325 - e_s)\ne_s 为水温对应饱和水蒸气压',
    formulaTex: 'DO = G_2\\cdot\\dfrac{P - e_s}{101.325 - e_s}',
    tip: '温度范围 0~40℃;结果按 ±0.5 mg/L 核查。',
  },
  {
    id: 'water-quality-qc',
    title: '水质质量控制分析',
    shortTitle: '水质质控',
    description: '覆盖离子平衡、TDS、电导率、总硬度、溶解度与碱度/硬度换算。',
    domain: '环境检测',
    category: '水质',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/wqc',
    standards: ['GB/T 5750-2006', 'HJ 164-2020'],
    scene: ['lab', 'qc'],
    frequency: 'advanced',
    formula: '阴阳离子平衡:|ΣC - ΣA| / (ΣC + ΣA) × 100% ≤ 10%\nTDS 与离子总和误差 ≤ 10%\nTDS / EC ∈ [0.55, 0.70]\n硬度(mg/L CaCO₃)=(Ca/20 + Mg/12 + ...) × 50',
    tip: '基础八离子必填,可选离子按需增删。结果按 6 类子分析输出。',
  },
  {
    id: 'ph-calculator',
    title: 'pH 标准值',
    shortTitle: 'pH 计算',
    description: '标准缓冲液温度修正值与理论 pH 快速查询计算。',
    domain: '环境检测',
    category: '水质',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/ph',
    standards: ['HJ 1147-2020'],
    scene: ['lab'],
    frequency: 'common',
    formula: '5 种标准缓冲液 1.68 / 4.00 / 6.86 / 9.18 / 12.46\n使用 PCHIP 分段三次 Hermite 插值\n12.46 缓冲液有效范围 0~60 ℃',
    tip: '温度总范围 0~95℃,超出范围的缓冲液会标"不可用"。',
  },
  {
    id: 'well-calculator',
    title: '地下水井水体积',
    shortTitle: '井水体积',
    description: '按井深、埋深和井径计算井水体积与换水参考量。',
    domain: '环境检测',
    category: '水质',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/well',
    standards: ['HJ 164-2020', 'HJ 25.2-2019'],
    scene: ['field'],
    frequency: 'common',
    formula: '埋深 = D - E\n井水深度 = B + E - D\n体积 V(L) = (A_pipe·h + A_annulus·h·φ) / 1000\nExcel 习惯使用 π = 3.14',
    formulaTex: 'V = \\dfrac{A_{pipe}\\,h + A_{annulus}\\,h\\,\\varphi}{1000}',
    tip: '洗井量参考 3~5 倍井水体积。φ 留空时仅按井管内水体计。',
  },
];

const advancedTools: CalculatorNavItem[] = [
  {
    id: 'air-concentration',
    title: '空气采样浓度计算',
    shortTitle: '空气浓度',
    subtitle: 'PM / 固定源',
    description: '按采样流量、时间、压力、温度和滤膜增重计算标准体积与颗粒物浓度。',
    domain: '环境检测',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/air-conc',
    standards: ['HJ 194-2017', 'HJ 836-2017'],
    scene: ['field', 'lab'],
    frequency: 'common',
    formula: 'V_n = Q · t · (P/101.325) · (273.15/(273.15+T))\nρ = (w₂ - w₁) / V_n',
    formulaTex: '\\rho = \\dfrac{w_2 - w_1}{V_n},\\quad V_n = Q\\,t\\,\\dfrac{P}{101.325}\\cdot\\dfrac{273.15}{273.15+T}',
    tip: '切换"环境空气 PM"与"固定源颗粒物"两种模式,单位略有不同。',
  },
  {
    id: 'isokinetic-check',
    title: '烟气等速跟踪率核查',
    shortTitle: '等速核查',
    subtitle: '90% ~ 110%',
    description: '用动压、压力、温度、皮托管系数和采样嘴径核查等速跟踪率。',
    domain: '环境检测',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/isokinetic',
    standards: ['HJ/T 397-2007', 'HJ 836-2017'],
    scene: ['field'],
    frequency: 'common',
    formula: 'Vs = Kp·√(2Pd / ρs)\nQ_理论 = Vs · A · 60 · 1000 (L/min)\n跟踪率 = Q_实际 / Q_理论',
    formulaTex: 'V_s = K_p\\sqrt{\\dfrac{2P_d}{\\rho_s}},\\quad \\eta = \\dfrac{Q_{actual}}{Q_{theory}}',
    tip: '密度可留空由程序按工况估算;跟踪率合格区间 90%~110%。',
  },
  {
    id: 'aqi-index',
    title: 'AQI 空气质量指数',
    shortTitle: 'AQI',
    subtitle: 'IAQI 与级别',
    description: '按 HJ 633 分段插值计算污染物空气质量分指数和等级。',
    domain: '环境检测',
    category: '空气和废气',
    icon: React.createElement(LeafOne24Regular),
    href: '/calculator/aqi',
    standards: ['HJ 633-2012'],
    scene: ['qc', 'lab'],
    frequency: 'common',
    formula: 'IAQI = (IAQI_HI - IAQI_LO)/(BP_HI - BP_LO) × (C - BP_LO) + IAQI_LO',
    formulaTex: '\\mathrm{IAQI} = \\dfrac{\\mathrm{IAQI}_{HI} - \\mathrm{IAQI}_{LO}}{BP_{HI} - BP_{LO}}(C - BP_{LO}) + \\mathrm{IAQI}_{LO}',
    tip: 'PM2.5/PM10 取 24h 均值;O₃ 区分 1h 与 8h;SO₂ 日均 vs 1h 不同分段。',
  },
  {
    id: 'mdl-advanced',
    title: '方法检出限 MDL',
    shortTitle: 'MDL',
    subtitle: '7~20 个平行样',
    description: '粘贴原始平行样数据,自动输出均值、标准差、MDL、置信区间和 CSV 报告。',
    domain: '环境检测',
    category: '通用与质控',
    icon: React.createElement(DataUsage24Regular),
    href: '/calculator/mdl',
    badge: '高级',
    standards: ['HJ 168-2020'],
    scene: ['qc'],
    frequency: 'advanced',
    formula: 'MDL = t × s\n95% CI = 均值 ± t₀.₉₅ × s / √n',
    formulaTex: '\\mathrm{MDL} = t_{0.99}\\cdot s,\\quad \\mathrm{CI}_{95} = \\bar{x} \\pm t_{0.975}\\cdot\\dfrac{s}{\\sqrt{n}}',
    tip: 'n 建议 7~20;t 值按单侧 99% 自动查表;低于方法定量限需谨慎。',
  },
  {
    id: 'spike-recovery',
    title: '加标回收率',
    shortTitle: '回收率',
    subtitle: '加标样核查',
    description: '按原样、加标样和加标量计算加标回收率。',
    domain: '环境检测',
    category: '通用与质控',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/recovery',
    standards: ['HJ 168-2020'],
    scene: ['lab', 'qc'],
    frequency: 'common',
    formula: '回收率 η = (C加标样 - C原样) / C加标量 × 100%\n合格区间一般 70%~130%',
    formulaTex: '\\eta = \\dfrac{C_{sp} - C_{0}}{C_{add}}\\times 100\\%',
    tip: '加标浓度一般取样品基体浓度的 1~3 倍;痕量项目区间可放宽至 60%~140%。',
  },
  {
    id: 'rsd-qc',
    title: '相对标准偏差 RSD',
    shortTitle: 'RSD',
    subtitle: '精密度',
    description: '粘贴至少 2 个测定值,自动计算均值、样本标准差和 RSD。',
    domain: '环境检测',
    category: '通用与质控',
    icon: React.createElement(DataUsage24Regular),
    href: '/calculator/rsd',
    standards: ['HJ 168-2020'],
    scene: ['lab', 'qc'],
    frequency: 'common',
    formula: 's = √[Σ(xᵢ - x̄)² / (n - 1)]\nRSD = s / |x̄| × 100%',
    formulaTex: '\\mathrm{RSD} = \\dfrac{s}{\\lvert\\bar{x}\\rvert}\\times 100\\%,\\quad s = \\sqrt{\\dfrac{\\sum(x_i - \\bar{x})^2}{n-1}}',
    tip: '常规方法 RSD ≤ 10% 为合格;痕量 / 高端仪器可放宽。',
  },
  {
    id: 'soil-qc',
    title: '土壤质控计算',
    shortTitle: '土壤质控',
    subtitle: '含水率 / 制备',
    description: '合并土壤含水率、制备损失率和过筛率核查。',
    domain: '环境检测',
    category: '通用与质控',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/soil-qc',
    standards: ['HJ/T 166-2004', 'HJ 1020-2019'],
    scene: ['field', 'lab'],
    frequency: 'common',
    formula: '含水率 W = (m湿 - m干) / m干 × 100%\n损失率 = 损失量 / 制备前重量 × 100%\n过筛率 = 过筛重量 / 总重量 × 100%',
    formulaTex: 'W = \\dfrac{m_{wet} - m_{dry}}{m_{dry}}\\times 100\\%',
    tip: '损失率一般 ≤ 5%;过筛率一般 ≥ 95% 视为合格。',
  },
];

const treatmentTools: CalculatorNavItem[] = [
  {
    id: 'water-treatment-engineering',
    title: '环境水处理公式',
    shortTitle: '水处理设计',
    subtitle: '稳定塘 / 脱氮除磷',
    description: '覆盖曝气塘 BOD、温度校正、兼氧塘总氮、碱度平衡和 EBPR 比率。',
    domain: '环境处理',
    category: '水处理',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/water-treatment',
    badge: '工程',
    standards: ['工程设计经验公式'],
    scene: ['design'],
    frequency: 'advanced',
    formula: '曝气塘 Ce = C₀ / (1 + k·t)\n温度校正 k_T = k₂₀ · θ^(T-20)\n净碱度 = 3.57·NO₃-N - 7.14·NH₃-N\nEBPR: COD:TP 20~30 充足',
    tip: '稳定塘与脱氮除磷经验式,实际设计请结合工艺试验数据。',
  },
  {
    id: 'gas-treatment-engineering',
    title: '气体处理公式',
    shortTitle: '气体处理',
    subtitle: '吸收塔 / 填料塔',
    description: '覆盖最小液气摩尔比、传质单元数和填料塔压降。',
    domain: '环境处理',
    category: '气体处理',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/gas-treatment',
    badge: '工程',
    standards: ['工程设计经验公式'],
    scene: ['design'],
    frequency: 'advanced',
    formula: '最小液气比 (L/G)_min = (Y₁ - Y₂) / (X*₁ - X₀)\nNOG ≈ (Y₁ - Y₂) / ΔY_对数均值\n填料压降 ΔP/Z = α·G² / ρ_G',
    tip: '经验式适用气体吸收塔初步设计,精细设计请结合填料手册。',
  },
];

export const calculatorNavItems: CalculatorNavItem[] = [
  ...mainTools,
  ...advancedTools,
  ...treatmentTools,
];
