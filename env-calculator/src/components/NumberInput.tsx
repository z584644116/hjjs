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

  const helperText = error || hint;
  const helperId = helperText ? `${id}-helper` : undefined;

  return (
    <div className="app-number-field" data-invalid={!!error}>
      <label htmlFor={id} className="app-number-label">
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      <div className="app-number-control">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? '0'}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={helperId}
          className="app-number-input"
        />
        {unit && <span className="app-number-unit">{unit}</span>}
      </div>
      {helperText && (
        <span id={helperId} className="app-number-helper">
          {helperText}
        </span>
      )}
    </div>
  );
}
