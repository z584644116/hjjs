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
    description: '采样、烟气、固定源与无组织监测相关计算',
  },
  {
    key: '水质',
    label: '水质',
    description: '溶解氧、pH、水质质控和地下水相关计算',
  },
  {
    key: '通用与质控',
    label: '通用与质控',
    description: '常用环境公式、样本量和质量控制辅助计算',
  },
];

export const calculatorNavItems: CalculatorNavItem[] = [
  {
    id: 'environment-formulas-v23',
    title: '环境公式 v2.3',
    shortTitle: '公式 v2.3',
    description: '按空气废气、水质、通用与质控分类整合常用环境公式。',
    category: '通用与质控',
    icon: React.createElement(DataUsage24Regular),
    href: '/calculator/v23',
    featured: true,
    badge: '12 模块',
  },
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
    description: '支持 SO₂、NO、NO₂、CO、NMHC 等污染物浓度换算。',
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
    description: '覆盖离子平衡、TDS、电导率、硬度与溶解度核查。',
    category: '水质',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/wqc',
  },
  {
    id: 'ph-calculator',
    title: 'pH 计算',
    description: '标准缓冲液温度修正值与理论 pH 快速查询计算。',
    category: '水质',
    icon: React.createElement(Beaker24Regular),
    href: '/calculator/ph',
  },
  {
    id: 'well-calculator',
    title: '地下水井水体积',
    description: '按井深、埋深和井径计算井水体积与换水参考量。',
    category: '水质',
    icon: React.createElement(Drop24Regular),
    href: '/calculator/well',
  },
];