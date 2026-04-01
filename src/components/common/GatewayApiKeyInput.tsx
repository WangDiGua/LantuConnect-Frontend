import type { Theme } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { textMuted, textSecondary } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export function GatewayApiKeyInput({ theme, value, onChange, className, id }: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>
        X-Api-Key（网关调用）
      </label>
      <input
        id={id}
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="粘贴创建 Key 时返回的完整 secretPlain"
        className={`${nativeInputClass(theme)} w-full font-mono text-sm`}
      />
      <p className={`mt-1.5 text-[11px] leading-snug ${textMuted(theme)}`}>
        与用户设置、MCP 市场共用本地存储。浏览目录可仅用登录态；解析与执行（resolve / invoke / 应用打开）须填写有效 Key。
      </p>
    </div>
  );
}
