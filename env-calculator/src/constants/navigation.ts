import React from 'react';
import {
  Beaker24Regular,
  Calculator24Regular,
  ChartMultiple24Regular,
  Cloud24Regular,
  DataUsage24Regular,
  Drop24Regular,
  LeafOne24Regular,
} from '@fluentui/react-icons';

export type CalculatorDomain = '环境检测' | '环境处理';
export type CalculatorCategory =
  | '空气和废气'
  | '水质'
  | '通用与质控'
  | '实验室分析'
  | '噪声与振动'
  | '评价与指数'
  | '水处理'
  | '气体处理';

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
    key: '实验室分析',
    label: '实验室分析',
    domain: '环境检测',
    description: '溶液稀释、标准曲线、样品浓度回算与滴定通用计算',
  },
  {
    key: '噪声与振动',
    label: '噪声与振动',
    domain: '环境检测',
    description: '等效声级、统计声级、背景修正、混响与声屏障估算',
  },
  {
    key: '评价与指数',
    label: '评价与指数',
    domain: '环境检测',
    description: '综合污染指数、内梅罗、TLI、生物多样性、地累积 Igeo',
  },
  {
    key: '水处理',
    label: '水处理',
    domain: '环境处理',
    description: '稳定塘、活性污泥、曝气供氧、消毒与深度处理核心设计公式',
  },
  {
    key: '气体处理',
    label: '气体处理',
    domain: '环境处理',
    description: '吸收塔、除尘、脱硫脱硝与有机废气治理核心设计公式',
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
  {
    id: 'qc-stats',
    title: '质控统计分析',
    shortTitle: '质控统计',
    subtitle: 'RPD / 离群点 / t 检验',
    description:
      '平行样 RPD、Grubbs / Dixon 离群点检验、双样本 Welch t 检验四个模块,内嵌 α=0.05 临界值表。',
    domain: '环境检测',
    category: '通用与质控',
    icon: React.createElement(ChartMultiple24Regular),
    href: '/calculator/qc-stats',
    badge: '统计',
    standards: ['GB/T 4883-2008', 'HJ 168-2020', 'GB/T 6379.2-2004'],
    scene: ['qc', 'lab'],
    frequency: 'common',
    formula:
      'RPD = |x₁ − x₂| / ((x₁ + x₂)/2) × 100%\nGrubbs G = |x − x̄| / s,G > G_crit → 离群\nDixon r(n) = 相邻差 / 极差,r > r_crit → 离群\nt = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)',
    formulaTex:
      'G = \\dfrac{|x_{\\mathrm{ext}} - \\bar x|}{s},\\quad t = \\dfrac{\\bar x_1 - \\bar x_2}{\\sqrt{s_1^2/n_1 + s_2^2/n_2}}',
    tip: 'RPD 分 10%/20%/30%/50% 四档;Grubbs 要求近似正态;Dixon 适 n ≤ 30;t 检验双边 α=0.05。',
  },
  {
    id: 'laboratory-analysis',
    title: '实验室分析计算',
    shortTitle: '实验室分析',
    subtitle: '稀释 / 曲线 / 回算 / 滴定',
    description:
      '覆盖溶液稀释(单级 + 连续)、标准曲线线性回归、样品浓度回算、滴定通用模板共 4 个实验台高频公式。',
    domain: '环境检测',
    category: '实验室分析',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/laboratory',
    badge: '台面',
    standards: ['ICH Q2(R1)', 'HJ 168-2020', 'GB/T 601-2016'],
    scene: ['lab', 'qc'],
    frequency: 'common',
    formula:
      '单级 C₁V₁ = C₂V₂;连续 perStep = (C₀/C_f)^(1/n)\ny = a·x + b,R²,MDL = 3.3·s(y/x)/|a|,LOQ = 10·s(y/x)/|a|\nρ = (C_inst − C_b)·V_f·f / V_s 或 m_s·(1 − w)\nc_x = (c_T·V_net / n_rxn)·f / V_s',
    formulaTex:
      '\\mathrm{MDL} = \\dfrac{3.3\\,s_{y/x}}{|a|},\\quad c_x = \\dfrac{c_T\\,V_{net}\\,f}{n_{rxn}\\,V_s}',
    tip: '4 模块独立 state;R² < 0.999 告警,回归 MDL 仅作初筛,报备用 HJ 168 平行样 MDL。',
  },
  {
    id: 'noise-calculator',
    title: '噪声与振动计算',
    shortTitle: '噪声计算',
    subtitle: 'Leq / 背景 / 声屏障',
    description: '覆盖等效声级、统计声级、声源叠加、距离衰减、背景修正、Sabine 混响、声屏障插损 7 个模块。',
    domain: '环境检测',
    category: '噪声与振动',
    icon: React.createElement(DataUsage24Regular),
    href: '/calculator/noise',
    badge: '工程',
    standards: ['GB 3096-2008', 'GB 12348-2008', 'GB 12523-2011', 'JGJ/T 131-2012'],
    scene: ['field', 'design'],
    frequency: 'advanced',
    formula: 'Leq = 10·lg(1/n · Σ 10^(Li/10))\nΔL = 20·lg(r₂/r₁)\nT60 = 0.161·V/A\nIL = 5 + 20·lg[√(2πN)/tanh(√(2πN))]',
    formulaTex: 'L_{eq} = 10\\lg\\!\\left(\\dfrac{1}{n}\\sum 10^{L_i/10}\\right),\\quad T_{60} = \\dfrac{0.161\\,V}{A}',
    tip: '读数建议 ≥ 100 个;背景修正规则 ΔL < 3 dB 不可用,≥ 10 dB 无需修正。',
  },
  {
    id: 'assessment-indices',
    title: '环境评价与指数',
    shortTitle: '评价指数',
    subtitle: '综合污染 / TLI / Igeo',
    description: '综合污染指数、内梅罗、富营养化 TLI、生物多样性与地累积 Igeo 五类核心指数。',
    domain: '环境检测',
    category: '评价与指数',
    icon: React.createElement(LeafOne24Regular),
    href: '/calculator/assessment',
    standards: ['GB 3838-2002', 'GB 15618-2018', 'HJ 663-2013'],
    scene: ['qc', 'design'],
    frequency: 'advanced',
    formula: 'P = (1/n)·Σ (Cᵢ/Sᵢ)\nN = √((P̄² + P_max²)/2)\nTLI = Σ Wⱼ·TLI(j)\nH\' = -Σ pᵢ·ln(pᵢ)\nIgeo = log₂(Cᵢ / (k·Bᵢ))',
    formulaTex: 'N = \\sqrt{\\dfrac{\\bar{P}^{2} + P_{max}^{2}}{2}},\\quad I_{geo} = \\log_2\\!\\dfrac{C_i}{k\\,B_i}',
    tip: '只提供核心指数;行业专用指数(如 CWQI、SPI)请按本行业标准单独核算。',
  },
];

const treatmentTools: CalculatorNavItem[] = [
  {
    id: 'water-treatment-engineering',
    title: '环境水处理公式',
    shortTitle: '水处理设计',
    subtitle: '15 子模块',
    description: '覆盖稳定塘、脱氮除磷、活性污泥 F/M/SVI/SRT/HRT、AOR/SOR 曝气供氧、药剂投加、CT/UV/EBCT 深度处理共 15 个工程公式。',
    domain: '环境处理',
    category: '水处理',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/water-treatment',
    badge: '工程',
    standards: ['工程设计经验公式', 'HJ 2038'],
    scene: ['design'],
    frequency: 'advanced',
    formula: 'F/M = Q·S₀/(V·X)\nSVI = V30×1000/MLSS\nAOR = a\'·Q·ΔBOD + b\'·Q·ΔNH₄ − 1.42·R_endo\nSOR = AOR·Cs20/[α(β·CsT − CL)]·1.024^(20-T)\nCT = C·t,D = I·t',
    formulaTex: 'F/M = \\dfrac{Q\\,S_0}{V\\,X},\\quad SOR = AOR\\cdot\\dfrac{C_{s,20}}{\\alpha(\\beta C_{s,T} - C_L)}\\cdot 1.024^{20-T}',
    tip: '稳定塘、活性污泥、曝气供氧、消毒与深度处理通用经验式,实际设计请结合工艺试验数据。',
  },
  {
    id: 'gas-treatment-engineering',
    title: '气体处理公式',
    shortTitle: '气体处理',
    subtitle: '11 子模块',
    description: '覆盖吸收塔液气比/NTU/压降、静电除尘 Deutsch、袋式 A/C、旋风 d50、湿法 L/G、Ca/S、SCR、RTO、活性炭等温共 11 个工程公式。',
    domain: '环境处理',
    category: '气体处理',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/gas-treatment',
    badge: '工程',
    standards: ['工程设计经验公式', 'HJ 2028', 'HJ 2020'],
    scene: ['design'],
    frequency: 'advanced',
    formula: '(L/G)min = (Yi-Yo)/(Xo*-Xi)\nη = 1 - exp(-SCA·ωk)\nd50 = √[9μW/(2π·Ne·Vi·ρp)]\nNSR = n_NH3/n_NOx\nη_RTO = (T预-T进)/(T燃-T进)',
    formulaTex: '\\eta = 1 - e^{-\\mathrm{SCA}\\cdot\\omega_k},\\quad d_{50} = \\sqrt{\\dfrac{9\\mu W}{2\\pi N_e V_i \\rho_p}}',
    tip: '吸收、除尘、脱硫脱硝与有机废气治理通用经验式,初步选型使用,详细设计请结合填料/催化剂手册。',
  },
];

export const calculatorNavItems: CalculatorNavItem[] = [
  ...mainTools,
  ...advancedTools,
  ...treatmentTools,
];
