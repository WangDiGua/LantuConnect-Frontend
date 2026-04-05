import React, { useId } from 'react';
import type { Theme } from '../../types';
import { fieldErrorText, hintText, labelBase } from '../../utils/uiClasses';

/** 子控件应透传的 a11y 属性（与 label 的 htmlFor 同源 id） */
export type FormFieldA11y = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
};

export type FormFieldShellProps = {
  theme: Theme;
  label: React.ReactNode;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  className?: string;
  children: (a11y: FormFieldA11y) => React.ReactNode;
};

/**
 * 表单项外壳：label + 控件 + hint + 内联错误。
 * 通过 children 函数注入 id / aria-invalid / aria-describedby，避免 cloneElement 与复杂控件不兼容。
 */
export function FormFieldShell({
  theme,
  label,
  error,
  hint,
  fullWidth,
  className = '',
  children,
}: FormFieldShellProps) {
  const uid = useId().replace(/:/g, '');
  const controlId = `ff-${uid}`;
  const errorId = `ff-${uid}-err`;
  const hasErr = Boolean(error?.trim());

  const a11y: FormFieldA11y = {
    id: controlId,
    'aria-invalid': hasErr,
    'aria-describedby': hasErr ? errorId : undefined,
  };

  return (
    <div className={[fullWidth ? 'md:col-span-2' : '', className].filter(Boolean).join(' ')}>
      <label htmlFor={controlId} className={`mb-1 block ${labelBase(theme)}`}>
        {label}
      </label>
      {children(a11y)}
      {hint ? <p className={`mt-1.5 ${hintText(theme)}`}>{hint}</p> : null}
      {hasErr ? (
        <p id={errorId} className={`mt-1 ${fieldErrorText()}`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
