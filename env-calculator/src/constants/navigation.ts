import React from 'react';
import {
  Beaker24Regular,
  Calculator24Regular,
  Cloud24Regular,
  DataUsage24Regular,
  Drop24Regular,
  LeafOne24Regular,
} from '@fluentui/react-icons';

export type CalculatorCategory = '空气和废气' | '水质' | '通用与质控';

export type CalculatorNavItem = {
  id: string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  description: string;
  category: CalculatorCategory;
  href: string;
  featured?: boolean;
  badge?: string;
  icon: React.ReactNode;
};

export const calculatorCategories: { key: CalculatorCategory; label: string; description: string }[] = [
  {
    key: '空气和废气',
    label: '空气和废气',
    description: '采样、烟气、固定源、AQI 与无组织监测相关计算',
  },
  {
    key: '水质',
    label: '水质',
    description: '溶解氧、pH、水质质控和地下水相关计算',
  },
  {
    key: '通用与质控',
    label: '通用与质控',
    description: '方法检出限、回收率、精密度和土壤质控计算',
  },
];

const mainTools: CalculatorNavItem[] = [
  {
    id: 'sampling-calculator',
    title: '采样嘴计算',
    description: '根据烟气流速、含湿量与仪器规格快速推荐采样嘴径。',
    category: '空气和废气',
    icon: React.createElement(Calculator24Regular),
    href: '/calculator/sampling',
    badge: '固定源',
  },
  {
    id: 'fluegas-conversion',
    title: '烟气折算计算',
    description: '将实测浓度折算至基准氧含量，适用于废气排放核算。',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/fluegas',
  },
  {
    id: 'gas-converter',
    title: '气体单位换算',
    description: '支持 SO2、NO、NO2、CO、NMHC 等污染物浓度换算。',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/gas',
  },
  {
    id: 'unorg-suitability',
    title: '无组织监测适宜度',
    description: '依据 HJ/T 55-2000 快速辅助判断监测布点适宜性。',
    category: '空气和废气',
    icon: React.createElement(LeafOne24Regular),
    href: '/calculator/unorg',
  },
  {
    id: 'do-saturation',
    title: '溶解氧计算',
    description: '按温度与大气压快速换算饱和溶解氧标准值。',
    category: '水质',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/do',
    badge: '常用',
  },
  {
    id: 'water-quality-qc',
    title: '水质质量控制分析',
    shortTitle: '水质质控',
    description: '覆盖离子平衡、TDS、电导率、总硬度、溶解度与碱度/硬度换算。',
    category: '水质',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/wqc',
  },
  {
    id: 'ph-calculator',
    title: 'pH 标准值',
    shortTitle: 'pH 计算',
    description: '标准缓冲液温度修正值与理论 pH 快速查询计算。',
    category: '水质',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/ph',
  },
  {
    id: 'well-calculator',
    title: '地下水井水体积',
    shortTitle: '井水体积',
    description: '按井深、埋深和井径计算井水体积与换水参考量。',
    category: '水质',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/well',
  },
];

const advancedTools: CalculatorNavItem[] = [
  {
    id: 'air-concentration',
    title: '空气采样浓度计算',
    shortTitle: '空气浓度',
    subtitle: 'PM / 固定源',
    description: '按采样流量、时间、压力、温度和滤膜增重计算标准体积与颗粒物浓度。',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/air-conc',
  },
  {
    id: 'isokinetic-check',
    title: '烟气等速跟踪率核查',
    shortTitle: '等速核查',
    subtitle: '90% ~ 110%',
    description: '用动压、压力、温度、皮托管系数和采样嘴径核查等速跟踪率。',
    category: '空气和废气',
    icon: React.createElement(Cloud24Regular),
    href: '/calculator/isokinetic',
  },
  {
    id: 'aqi-index',
    title: 'AQI 空气质量指数',
    shortTitle: 'AQI',
    subtitle: 'IAQI 与级别',
    description: '按 HJ 633 分段插值计算污染物空气质量分指数和等级。',
    category: '空气和废气',
    icon: React.createElement(LeafOne24Regular),
    href: '/calculator/aqi',
  },
  {
    id: 'mdl-advanced',
    title: '方法检出限 MDL',
    shortTitle: 'MDL',
    subtitle: '7~20 个平行样',
    description: '粘贴原始平行样数据，自动输出均值、标准差、MDL、置信区间和 CSV 报告。',
    category: '通用与质控',
    icon: React.createElement(DataUsage24Regular),
    href: '/calculator/mdl',
    badge: '高级',
  },
  {
    id: 'spike-recovery',
    title: '加标回收率',
    shortTitle: '回收率',
    subtitle: '加标样核查',
    description: '按原样、加标样和加标量计算加标回收率。',
    category: '通用与质控',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/recovery',
  },
  {
    id: 'rsd-qc',
    title: '相对标准偏差 RSD',
    shortTitle: 'RSD',
    subtitle: '精密度',
    description: '粘贴至少 2 个测定值，自动计算均值、样本标准差和 RSD。',
    category: '通用与质控',
    icon: React.createElement(DataUsage24Regular),
    href: '/calculator/rsd',
  },
  {
    id: 'soil-qc',
    title: '土壤质控计算',
    shortTitle: '土壤质控',
    subtitle: '含水率 / 制备',
    description: '合并土壤含水率、制备损失率和过筛率核查。',
    category: '通用与质控',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/soil-qc',
  },
];

export const calculatorNavItems: CalculatorNavItem[] = [
  ...mainTools,
  ...advancedTools,
];
