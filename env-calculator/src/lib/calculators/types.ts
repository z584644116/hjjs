/**
 * 统一计算结果结构
 * 环境计算器所有模块应使用此结构返回结果
 */

// 结果级别：说明结果可用于什么场景
export type ResultLevel =
  | 'reportable-check'   // 可用于正式报告/记录，但需核对现行标准
  | 'internal-check'      // 仅供内部质控核查
  | 'engineering-estimate' // 仅供工程估算/方案校核
  | 'teaching-reference'; // 仅供教学参考

// 警告级别
export type WarningLevel = 'info' | 'warning' | 'danger';

// 计算警告
export interface CalculationWarning {
  level: WarningLevel;
  message: string;
  suggestion?: string;
}

// 公式假设条件
export interface FormulaAssumption {
  label: string;
  value: string;
}

// 公式元数据
export interface FormulaMeta {
  formulaName: string;
  formulaText: string;
  /** standard-method: 标准方法 | quality-control: 质控统计 | engineering-estimate: 工程估算 | teaching-reference: 教学参考 */
  formulaType: 'standard-method' | 'quality-control' | 'engineering-estimate' | 'teaching-reference';
  resultLevel: ResultLevel;
  references?: string[];
  applicability?: string[];
  limitations?: string[];
}

// 数值显示格式
export interface DisplayValue {
  raw: number;
  display: string;
  unit: string;
  rounding: 'round-half-even' | 'round' | 'floor' | 'ceil';
}

// 统一计算结果
export interface CalculationResult<T> {
  ok: boolean;
  data?: T;
  errors: string[];
  warnings: CalculationWarning[];
  assumptions: FormulaAssumption[];
  meta: FormulaMeta;
}

// 计算错误的类型（用于内部函数返回）
export interface CalculationError {
  error: string;
}

export function isCalculationError(result: unknown): result is CalculationError {
  return typeof result === 'object' && result !== null && 'error' in result;
}
