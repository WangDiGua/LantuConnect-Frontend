import { useEffect, useMemo, useRef } from 'react';

import { subscribeRealtimePush } from '../lib/realtimePush';
import {
  getRealtimeUiSignal,
  matchesRealtimeUiSignal,
  type RealtimeUiSignalFilter,
} from '../lib/realtimeUiSignal';

export function useSilentRealtimeRefresh(
  onRefresh: () => void | Promise<void>,
  filter: RealtimeUiSignalFilter,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 450;
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const categoriesKey = useMemo(
    () => (filter.categories ?? []).join('|'),
    [filter.categories],
  );
  const notificationTypesKey = useMemo(
    () => (filter.notificationTypes ?? []).join('|'),
    [filter.notificationTypes],
  );

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void Promise.resolve()
          .then(() => onRefreshRef.current())
          .catch(() => {
            // Silent realtime sync should never interrupt the current UI with extra errors.
          });
      }, debounceMs);
    };

    const unsubscribe = subscribeRealtimePush((msg) => {
      const signal = getRealtimeUiSignal(msg);
      if (!signal) return;
      if (!matchesRealtimeUiSignal(signal, filter)) return;
      scheduleRefresh();
    });

    return () => {
      unsubscribe();
      if (timer != null) clearTimeout(timer);
    };
  }, [
    categoriesKey,
    debounceMs,
    enabled,
    filter.resourceCode,
    filter.resourceId,
    filter.resourceType,
    notificationTypesKey,
  ]);
}
