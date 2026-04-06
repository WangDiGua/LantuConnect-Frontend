import { prepare, layout, type PreparedText } from '@chenglou/pretext';

/**
 * 与 `src/styles/index.css` @theme 中字体一致；Pretext 要求避免单独依赖 `system-ui`（macOS 下与 DOM 可能不一致）。
 * 排布时用具体 family 兜底。
 */
export const PRETEXT_FONT_SANS_400_14 =
  '400 14px Inter, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", ui-sans-serif, sans-serif';

/** Tailwind `text-sm` + `leading-relaxed`（1.625） */
export const PRETEXT_LINE_HEIGHT_SM_RELAXED = 14 * 1.625;

/** 市场卡 / 资源卡 `text-sm leading-relaxed` 多行描述占位：避免行数变化引起抖动 */
export function descriptionClampMinHeightPx(lines: 2 | 3): number {
  return lines * PRETEXT_LINE_HEIGHT_SM_RELAXED;
}

/** Prism / 终端 compact：与 Tailwind `text-xs leading-snug`（12px × 1.375）对齐 */
export const PRETEXT_FONT_MONO_11_SNUG =
  '400 12px "JetBrains Mono", "Fira Code", ui-monospace, monospace';
export const PRETEXT_LINE_HEIGHT_11_SNUG = 12 * 1.375;

/** 终端非 compact：`text-sm leading-relaxed` + mono */
export const PRETEXT_FONT_MONO_14_RELAXED =
  '400 14px "JetBrains Mono", "Fira Code", ui-monospace, monospace';
export const PRETEXT_LINE_HEIGHT_14_RELAXED = PRETEXT_LINE_HEIGHT_SM_RELAXED;

export type PretextWhiteSpace = 'normal' | 'pre-wrap';

export function measureTextBlockHeight(
  text: string,
  maxWidthPx: number,
  lineHeightPx: number,
  font: string,
  options?: { whiteSpace?: PretextWhiteSpace },
): { height: number; lineCount: number } {
  const w = Math.max(1, maxWidthPx);
  const lh = Math.max(1, lineHeightPx);
  const prepared: PreparedText = prepare(text.length ? text : ' ', font, {
    whiteSpace: options?.whiteSpace ?? 'normal',
  });
  return layout(prepared, w, lh);
}

/** 缓存 prepare 句柄，避免同一段文案重复测字 */
const preparedCache = new Map<string, PreparedText>();
const PREPARED_CACHE_LIMIT = 64;

function cacheKey(font: string, text: string, ws: PretextWhiteSpace): string {
  return `${ws}\0${font}\0${text}`;
}

export function getPreparedText(
  text: string,
  font: string,
  options?: { whiteSpace?: PretextWhiteSpace },
): PreparedText {
  const ws = options?.whiteSpace ?? 'normal';
  const key = cacheKey(font, text, ws);
  let p = preparedCache.get(key);
  if (!p) {
    p = prepare(text.length ? text : ' ', font, { whiteSpace: ws });
    preparedCache.set(key, p);
    if (preparedCache.size > PREPARED_CACHE_LIMIT) {
      const first = preparedCache.keys().next().value as string | undefined;
      if (first) preparedCache.delete(first);
    }
  }
  return p;
}

export function measureTextBlockHeightCached(
  text: string,
  maxWidthPx: number,
  lineHeightPx: number,
  font: string,
  options?: { whiteSpace?: PretextWhiteSpace },
): { height: number; lineCount: number } {
  const w = Math.max(1, maxWidthPx);
  const lh = Math.max(1, lineHeightPx);
  const prepared = getPreparedText(text, font, options);
  return layout(prepared, w, lh);
}
