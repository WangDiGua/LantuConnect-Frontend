import type { ResourceRuntimeUpdateFilter } from '../lib/resourceRuntimeRealtime';
import { useSilentRealtimeRefresh } from './useSilentRealtimeRefresh';

export function useSilentResourceRuntimeRefresh(
  onRefresh: () => void | Promise<void>,
  filter: ResourceRuntimeUpdateFilter,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  useSilentRealtimeRefresh(
    onRefresh,
    {
      categories: ['health_runtime_sync'],
      resourceType: filter.resourceType,
      resourceId: filter.resourceId,
      resourceCode: filter.resourceCode,
    },
    options,
  );
}
