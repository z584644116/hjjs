'use client';

import React, { useCallback, useId, useMemo } from 'react';
import { parseNumberList } from '@/lib/calculators';

interface PasteBulkInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** 达标所需的最小值个数(解析后有效值) */
  minValues?: number;
  /** 解析后有效值的上限,超出会提示 */
  maxValues?: number;
  rows?: number;
  required?: boolean;
}

/**
 * 从 Excel/CSV 一列粘贴多值的通用输入。
 *
 * - 实时解析为 `number[]`(通过 `parseNumberList`,支持空格/逗号/分号/全角分隔)
 * - 显示已识别个数与满足 min/max 的动态状态
 * - 提供"粘贴"按钮(readText 权限不可用时静默失败,用户仍可直接粘贴到 textarea)
 */
export default function PasteBulkInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  minValues,
  maxValues,
  rows = 4,
  required = false,
}: PasteBulkInputProps) {
  const id = useId();
  const parsed = useMemo(() => parseNumberList(value), [value]);
  const count = parsed.length;

  const handleClipboardPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) onChange(text);
    } catch {
      // 非 secure context / 权限被拒 → 静默;用户可以直接在 textarea 里粘贴
    }
  }, [onChange]);

  const statusParts: string[] = [`已识别 ${count} 个`];
  let isCountOk = true;
  if (minValues !== undefined && count < minValues) {
    statusParts.push(`还需 ${minValues - count} 个`);
    isCountOk = false;
  }
  if (maxValues !== undefined && count > maxValues) {
    statusParts.push(`超过最大 ${maxValues}`);
    isCountOk = false;
  }

  return (
    <div className="app-number-field" data-invalid={!!error}>
      <div className="app-paste-bulk-head">
        <label className="app-number-label" htmlFor={id}>
          {label}
          {required && <span aria-hidden="true">*</span>}
        </label>
        <button
          type="button"
          onClick={handleClipboardPaste}
          className="app-paste-bulk-paste"
          aria-label="从剪贴板粘贴"
        >
          <span aria-hidden="true">📋</span>
          <span>粘贴</span>
        </button>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="app-paste-bulk"
        inputMode="decimal"
        aria-invalid={!!error}
      />
      <div className="app-paste-bulk-status" data-ok={isCountOk}>
        <span className="app-paste-bulk-count">{statusParts.join(' · ')}</span>
        {hint && <span className="app-paste-bulk-hint">{hint}</span>}
      </div>
      {error && <span className="app-number-helper">{error}</span>}
    </div>
  );
}
