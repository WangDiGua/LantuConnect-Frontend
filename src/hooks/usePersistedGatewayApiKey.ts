import { useEffect, useState } from 'react';
import { MAX_STORED_API_KEY_LENGTH, readBoundedLocalStorage } from '../lib/safeStorage';

const STORAGE_KEY = 'lantu_api_key';

/**
 * 与市场页、axios 拦截器共用的本地 API Key；变更会写回 localStorage（trim 后存）。
 */
export function usePersistedGatewayApiKey(): [string, React.Dispatch<React.SetStateAction<string>>] {
  const [value, setValue] = useState(() => readBoundedLocalStorage(STORAGE_KEY, MAX_STORED_API_KEY_LENGTH) ?? '');

  useEffect(() => {
    const trimmed = value.trim();
    try {
      if (trimmed) {
        if (trimmed.length > MAX_STORED_API_KEY_LENGTH) return;
        localStorage.setItem(STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* quota */
    }
  }, [value]);

  return [value, setValue];
}
