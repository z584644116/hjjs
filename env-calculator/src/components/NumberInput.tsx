'use client';

import React, { useCallback, useId } from 'react';

interface NumberInputProps {
  label: string;
  unit?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  step?: string;
  min?: number;
  max?: number;
  onSubmit?: () => void;
  disabled?: boolean;
  hint?: string;
}

export default function NumberInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  step,
  min,
  max,
  onSubmit,
  disabled = false,
  hint,
}: NumberInputProps) {
  const id = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(',', '.');
      raw = raw.replace(/[^0-9.\-]/g, '');
      if (raw.length > 1) {
        raw = raw[0] === '-' ? '-' + raw.slice(1).replace(/-/g, '') : raw.replace(/-/g, '');
      }
      const parts = raw.split('.');
      if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
      }
      onChange(raw);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit],
  );

  const hasError = !!error;
  const helperText = hasError ? error : hint;
  const helperId = helperText ? `${id}-helper` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-black text-[var(--app-ink)]">
          {label}
          {required && <span className="ml-1 text-[var(--app-danger)]">*</span>}
        </label>
      </div>

      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? '输入数值'}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={helperId}
          className={`app-form-control px-3 py-2 pr-16 placeholder:text-[var(--app-ink-tertiary)] disabled:cursor-not-allowed disabled:opacity-50 ${
            hasError ? 'border-[var(--app-danger)] shadow-[0_0_0_4px_var(--app-danger-light)]' : ''
          }`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 max-w-[52px] -translate-y-1/2 truncate text-right text-xs font-bold text-[var(--app-ink-tertiary)]">
            {unit}
          </span>
        )}
      </div>

      {helperText && (
        <span id={helperId} className={`text-xs leading-5 ${hasError ? 'text-[var(--app-danger)]' : 'text-[var(--app-ink-tertiary)]'}`}>
          {helperText}
        </span>
      )}
    </div>
  );
}
