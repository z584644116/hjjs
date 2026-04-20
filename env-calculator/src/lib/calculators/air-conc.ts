/**
 * 空气/废气颗粒物浓度计算
 * 支持环境空气和固定污染源两种模式
 */

import { requireNonNegative, requirePositive, roundTo } from './common';
import { CalculationWarning, FormulaMeta } from './types';

// =========================================================================
// 类型定义
// =========================================================================

export type AirConcentrationMode = 'ambient-pm' | 'stack-pm-simple';

export interface AirConcentrationInput {
  mode: AirConcentrationMode;
  flowRateLMin: number;
  samplingMinutes: number;
  pressureKPa: number;
  temperatureC: number;
  weightBeforeMg: number;
  weightAfterMg: number;
  /** 空白滤膜质量(mg)，可选 */
  blankMassMg?: number;
  /** 体积基准: actual=工况, standard-wet=标态湿基, standard-dry=标态干基 */
  volumeBasis?: 'actual' | 'standard-wet' | 'standard-dry';
}

export interface AirConcentrationResult {
  // 核心结果
  particleMassMg: number;
  actualVolumeL: number;
  standardVolumeL: number;
  standardVolumeM3: number;
  concentrationMgM3: number;
  // 警告列表
  warnings: CalculationWarning[];
  // 体积基准说明
  volumeBasisNote: string;
  // 公式元数据
  meta: FormulaMeta;
}

// =========================================================================
// 计算函数
// =========================================================================

/**
 * 空气/废气颗粒物浓度计算
 * 公式: C = m / V_std
 * 体积换算: V_std = V_实 × (P/101.325) × (273.15/(273.15+T))
 */
export function calculateAirConcentration(
  input: AirConcentrationInput
): AirConcentrationResult | { error: string } {
  const warnings: CalculationWarning[] = [];

  // 输入校验
  const flowError = requirePositive(input.flowRateLMin, '采样流量(L/min)');
  if (flowError) return flowError;

  const timeError = requirePositive(input.samplingMinutes, '采样时间(min)');
  if (timeError) return timeError;

  const pressureError = requirePositive(input.pressureKPa, '采样时压力(kPa)');
  if (pressureError) return pressureError;

  if (!Number.isFinite(input.temperatureC) || input.temperatureC <= -273.15) {
    return { error: '请输入有效的采样温度(℃)' };
  }

  const beforeError = requireNonNegative(input.weightBeforeMg, '采样前滤膜质量(mg)');
  if (beforeError) return beforeError;

  const afterError = requireNonNegative(input.weightAfterMg, '采样后滤膜质量(mg)');
  if (afterError) return afterError;

  // 计算颗粒物质量
  const blankMassMg = input.blankMassMg ?? 0;
  let particleMassMg = input.weightAfterMg - input.weightBeforeMg;

  if (blankMassMg > 0) {
    particleMassMg -= blankMassMg;
    if (particleMassMg < 0) {
      warnings.push({
        level: 'warning',
        message: '扣除空白后颗粒物质量为负值，可能空白值有误',
      });
    }
  }

  // 质量校验
  if (particleMassMg < 0) {
    return {
      error: `滤膜增重为负值 (${roundTo(particleMassMg, 4)} mg)，不能得到有效正浓度。建议核查称量数据和空白值。`,
    };
  }

  if (particleMassMg === 0) {
    warnings.push({
      level: 'warning',
      message: '滤膜增重为0，无法计算有效浓度',
      suggestion: '请检查滤膜称量数据或增加采样量',
    });
  }

  // 小增重警告
  if (particleMassMg > 0 && particleMassMg < 1) {
    warnings.push({
      level: 'warning',
      message: `增重较小 (${roundTo(particleMassMg, 4)} mg)，称量不确定度对结果影响较大`,
      suggestion: '建议增加采样时间或使用更精密的天平',
    });
  }

  // 计算体积
  const actualVolumeL = input.flowRateLMin * input.samplingMinutes;

  // 标准体积换算
  const standardVolumeL = actualVolumeL *
    (input.pressureKPa / 101.325) *
    (273.15 / (273.15 + input.temperatureC));
  const standardVolumeM3 = standardVolumeL / 1000;

  // 浓度计算
  const concentrationMgM3 = standardVolumeM3 > 0
    ? particleMassMg / standardVolumeM3
    : NaN;

  // 体积基准说明
  let volumeBasisNote = '';
  const volumeBasis = input.volumeBasis || 'standard-dry';
  switch (volumeBasis) {
    case 'actual':
      volumeBasisNote = '按工况体积计算，未进行标准状态换算';
      break;
    case 'standard-wet':
      volumeBasisNote = '已换算为标态湿基体积(含水汽)';
      break;
    case 'standard-dry':
    default:
      volumeBasisNote = '已换算为标态干基体积(不含水汽)';
      // 固定污染源通常需要干基，添加提示
      if (input.mode === 'stack-pm-simple') {
        warnings.push({
          level: 'info',
          message: '固定污染源正式测量需考虑含湿量、标干体积修正、等速采样等',
        });
      }
  }

  // 模式相关警告
  if (input.mode === 'stack-pm-simple') {
    warnings.push({
      level: 'warning',
      message: '当前为简化估算模式，正式废气颗粒物监测应按相应排放标准执行',
      suggestion: '请按现行有效标准(如HJ/T 397、GB 16157)执行完整程序',
    });
  }

  const meta: FormulaMeta = {
    formulaName: input.mode === 'ambient-pm'
      ? '环境空气颗粒物浓度'
      : '废气颗粒物浓度(简化)',
    formulaText: 'C = m / V_std, V_std = V_实 × (P/101.325) × (273.15/(273.15+T))',
    formulaType: input.mode === 'ambient-pm' ? 'standard-method' : 'engineering-estimate',
    resultLevel: input.mode === 'ambient-pm' ? 'internal-check' : 'engineering-estimate',
    references: input.mode === 'ambient-pm'
      ? ['HJ 618', 'GB 3095']
      : ['HJ/T 397', 'GB 16157'],
    applicability: input.mode === 'ambient-pm'
      ? ['环境空气PM10/PM2.5监测', '无组织排放监测']
      : ['固定污染源废气颗粒物快速估算', '非等速采样初筛'],
    limitations: [
      '固定污染源正式监测需等速采样、滤筒恒重、空白修正',
      '需明确是干基还是湿基体积',
      '采样代表性和滤膜处理影响结果',
    ],
  };

  return {
    particleMassMg: roundTo(particleMassMg, 4),
    actualVolumeL: roundTo(actualVolumeL, 3),
    standardVolumeL: roundTo(standardVolumeL, 3),
    standardVolumeM3: roundTo(standardVolumeM3, 6),
    concentrationMgM3: roundTo(concentrationMgM3, 4),
    warnings,
    volumeBasisNote,
    meta,
  };
}
