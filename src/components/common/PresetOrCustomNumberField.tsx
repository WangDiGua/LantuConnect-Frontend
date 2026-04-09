import React from 'react';
import type { Theme } from '../../types';
import type { NumericPresetItem } from '../../utils/numericFormPresets';
import { LantuSelect } from './LantuSelect';

export type { NumericPresetItem } from '../../utils/numericFormPresets';

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function selectMode(value: number, presets: NumericPresetItem[]): string {
  return presets.some((p) => p.value === value) ? String(value) : 'custom';
}

export interface PresetOrCustomNumberFieldProps {
  theme: Theme;
  value: number;
  onChange: (v: number) => void;
  presets: NumericPresetItem[];
  customMin: number;
  customMax: number;
  /** 从预设切到「自定义」时的初始值 */
  customSeed: number;
  inputClassName: string;
  /** 可选：下拉容器宽度类名 */
  selectClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * 常用数值档位 +「自定义」数字输入；与审计日志保留、限流窗口等策略表单一致。
 */
export function PresetOrCustomNumberField({
  theme,
  value,
  onChange,
  presets,
  customMin,
  customMax,
  customSeed,
  inputClassName,
  selectClassName,
  ariaLabel,
  disabled,
}: PresetOrCustomNumberFieldProps) {
  const mode = selectMode(value, presets);
  const options = [
    ...presets.map((p) => ({ value: String(p.value), label: p.label })),
    { value: 'custom', label: '自定义…' },
  ];

  return (
    <div>
      <LantuSelect
        theme={theme}
        value={mode}
        options={options}
        disabled={disabled}
        className={selectClassName}
        onChange={(next) => {
          if (next === 'custom') {
            const seed = mode === 'custom' ? value : customSeed;
            onChange(clampInt(seed, customMin, customMax, customSeed));
          } else {
            onChange(Number(next));
          }
        }}
        ariaLabel={ariaLabel}
      />
      {mode === 'custom' ? (
        <input
          type="number"
          className={`${inputClassName} mt-2`}
          min={customMin}
          max={customMax}
          step={1}
          inputMode="numeric"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(clampInt(n, customMin, customMax, customSeed));
          }}
          aria-label={ariaLabel ? `${ariaLabel} 数值` : '自定义数值'}
        />
      ) : null}
    </div>
  );
}
