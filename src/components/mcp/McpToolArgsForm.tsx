import React, { useMemo } from 'react';
import type { Theme } from '../../types';
import { lantuCheckboxPrimaryClass, nativeInputClass } from '../../utils/formFieldClasses';
import { textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { LantuSelect } from '../common/LantuSelect';

export type McpToolArgsFormProps = {
  theme: Theme;
  inputSchema: Record<string, unknown> | undefined;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  disabled?: boolean;
};

type JsonSchemaProperty = {
  key: string;
  type?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
};

function collectShallowProperties(schema: Record<string, unknown>): JsonSchemaProperty[] | null {
  const typ = typeof schema.type === 'string' ? schema.type : '';
  if (typ !== 'object' && typ !== '') {
    /* 部分 MCP 只给 properties 不显式 type */
    if (!schema.properties) return null;
  }
  const props = schema.properties;
  if (props === null || typeof props !== 'object' || Array.isArray(props)) return null;
  const rec = props as Record<string, unknown>;
  const requiredArr = Array.isArray(schema.required)
    ? (schema.required as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  const required = new Set(requiredArr);

  const out: JsonSchemaProperty[] = [];
  for (const key of Object.keys(rec)) {
    const p = rec[key];
    if (p === null || typeof p !== 'object' || Array.isArray(p)) return null;
    const pr = p as Record<string, unknown>;
    const pt = typeof pr.type === 'string' ? pr.type : '';
    /* 仅支持扁平标量 + 枚举；嵌套 object/array 视为过复杂 */
    if (pt === 'object' || pt === 'array') return null;
    if (pr.properties != null || pr.items != null) return null;
    if (pr.anyOf != null || pr.oneOf != null || pr.allOf != null) return null;

    out.push({
      key,
      type: pt || undefined,
      description: typeof pr.description === 'string' ? pr.description : undefined,
      enum: Array.isArray(pr.enum) ? pr.enum : undefined,
      default: pr.default,
    });
    if (required.has(key)) {
      /* mark in label via parent listing order */
    }
  }
  return out;
}

export const McpToolArgsForm: React.FC<McpToolArgsFormProps> = ({
  theme,
  inputSchema,
  value,
  onChange,
  disabled = false,
}) => {
  const isDark = theme === 'dark';
  const fields = useMemo(() => (inputSchema ? collectShallowProperties(inputSchema) : null), [inputSchema]);

  if (!fields || fields.length === 0) return null;

  const setKey = (k: string, v: unknown) => {
    const next = { ...value, [k]: v };
    if (v === '' || v === undefined) delete next[k];
    onChange(next);
  };

  return (
    <div className="space-y-3" role="group" aria-label="工具参数（根据 inputSchema 生成）">
      <p className={`text-xs font-semibold ${textSecondary(theme)}`}>参数表单（可同步至下方 JSON）</p>
      {fields.map((f) => {
        const req =
          Array.isArray((inputSchema as Record<string, unknown>).required) &&
          ((inputSchema as Record<string, unknown>).required as string[]).includes(f.key);
        const cur = value[f.key];
        const label = (
          <span>
            {f.key}
            {req ? <span className="text-rose-500"> *</span> : null}
          </span>
        );

        if (f.enum && f.enum.length > 0) {
          const opts = f.enum.map((e) => ({ value: String(e), label: String(e) }));
          const strVal = cur === undefined || cur === null ? '' : String(cur);
          return (
            <div key={f.key}>
              <label className={`mb-1.5 block text-xs font-medium ${textMuted(theme)}`}>{label}</label>
              <LantuSelect
                theme={theme}
                value={strVal || String(f.enum[0])}
                onChange={(v) => setKey(f.key, v)}
                options={opts}
                triggerClassName="!text-xs"
                disabled={disabled}
              />
              {f.description ? <p className={`mt-1 text-xs ${textMuted(theme)}`}>{f.description}</p> : null}
            </div>
          );
        }

        if (f.type === 'boolean') {
          const checked = cur === true;
          return (
            <div key={f.key}>
              <label className={`flex cursor-pointer items-center gap-2 text-sm ${textPrimary(theme)}`}>
                <input
                  type="checkbox"
                  className={lantuCheckboxPrimaryClass}
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) => setKey(f.key, e.target.checked)}
                />
                {label}
              </label>
              {f.description ? <p className={`mt-1 text-xs ${textMuted(theme)}`}>{f.description}</p> : null}
            </div>
          );
        }

        if (f.type === 'integer' || f.type === 'number') {
          const num = typeof cur === 'number' ? cur : cur === undefined || cur === null ? '' : Number(cur);
          return (
            <div key={f.key}>
              <label className={`mb-1.5 block text-xs font-medium ${textMuted(theme)}`}>{label}</label>
              <input
                type="number"
                disabled={disabled}
                value={typeof num === 'number' && Number.isFinite(num) ? num : ''}
                onChange={(e) => {
                  const t = e.target.value;
                  if (t === '') setKey(f.key, undefined);
                  else setKey(f.key, f.type === 'integer' ? parseInt(t, 10) : parseFloat(t));
                }}
                className={`${nativeInputClass(theme)} font-mono text-xs`}
              />
              {f.description ? <p className={`mt-1 text-xs ${textMuted(theme)}`}>{f.description}</p> : null}
            </div>
          );
        }

        return (
          <div key={f.key}>
            <label className={`mb-1.5 block text-xs font-medium ${textMuted(theme)}`}>{label}</label>
            <input
              type="text"
              disabled={disabled}
              value={cur === undefined || cur === null ? '' : String(cur)}
              onChange={(e) => setKey(f.key, e.target.value)}
              className={`${nativeInputClass(theme)} font-mono text-xs`}
            />
            {f.description ? <p className={`mt-1 text-xs ${textMuted(theme)}`}>{f.description}</p> : null}
          </div>
        );
      })}
    </div>
  );
};

McpToolArgsForm.displayName = 'McpToolArgsForm';
