export type ExploreHubTrendTone = 'up' | 'flat' | 'down';

export interface ExploreHubTrendPayload {
  today: number;
  yesterday: number;
  delta: number;
  direction: ExploreHubTrendTone;
  basis?: string;
}

export interface ExploreHubTrendView {
  text: string;
  value: string;
  tone: ExploreHubTrendTone;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDirection(raw: unknown, delta: number): ExploreHubTrendTone {
  if (raw === 'up' || raw === 'flat' || raw === 'down') return raw;
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

export function normalizeExploreHubTrendMap(raw: unknown): Record<string, ExploreHubTrendPayload> {
  if (!raw || typeof raw !== 'object') return {};

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => {
      const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
      const today = toNumber(item.today ?? item.todayValue ?? item.today_value);
      const yesterday = toNumber(item.yesterday ?? item.yesterdayValue ?? item.yesterday_value);
      const delta = item.delta == null ? today - yesterday : toNumber(item.delta);
      return [
        key,
        {
          today,
          yesterday,
          delta,
          direction: normalizeDirection(item.direction, delta),
          basis: item.basis == null ? undefined : String(item.basis),
        },
      ];
    }),
  );
}

export function buildExploreHubTrendView(
  trend: ExploreHubTrendPayload | null | undefined,
  unit = '',
): ExploreHubTrendView | null {
  if (!trend) return null;

  const delta = Number.isFinite(Number(trend.delta)) ? Number(trend.delta) : trend.today - trend.yesterday;
  const tone = normalizeDirection(trend.direction, delta);

  if (tone === 'flat' || delta === 0) {
    return { text: '较昨日持平', value: '0', tone: 'flat' };
  }

  const label = tone === 'up' ? '新增' : '下降';
  const value = `${tone === 'up' ? '+' : '-'}${Math.abs(delta).toLocaleString('zh-CN')}${unit}`;
  return { text: `较昨日${label} ${Math.abs(delta).toLocaleString('zh-CN')}${unit}`, value, tone };
}
