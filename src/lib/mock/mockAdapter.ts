import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import { env } from '../../config/env';
import type { ApiResponse, PaginatedData } from '../../types/api';
import { registerAllHandlers } from './handlers';

export function mockOk<T>(data: T): [number, ApiResponse<T>] {
  return [200, { code: 0, data, message: 'ok', timestamp: Date.now() }];
}

export function paginate<T>(
  list: T[],
  page: number,
  pageSize: number,
): [number, ApiResponse<PaginatedData<T>>] {
  const start = (page - 1) * pageSize;
  return [
    200,
    {
      code: 0,
      data: {
        list: list.slice(start, start + pageSize),
        total: list.length,
        page,
        pageSize,
      },
      message: 'ok',
      timestamp: Date.now(),
    },
  ];
}

export function setupMockAdapter(instance: AxiosInstance): void {
  if (!env.VITE_USE_MOCK) return;

  const mock = new MockAdapter(instance, {
    delayResponse: env.VITE_MOCK_DELAY_MS,
    onNoMatch: 'passthrough',
  });

  registerAllHandlers(mock);

  if (import.meta.env.DEV) {
    console.log('[mock] Mock adapter initialized with', env.VITE_MOCK_DELAY_MS, 'ms delay');
  }
}
