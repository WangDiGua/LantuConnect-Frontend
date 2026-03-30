import { ApiException } from '../types/api';

export type ErrorSeverity = 'field' | 'permission' | 'notfound' | 'conflict' | 'ratelimit' | 'server' | 'network' | 'unknown';

export interface ClassifiedError {
  severity: ErrorSeverity;
  message: string;
  code: number;
  status: number;
  details?: Record<string, string[]>;
  canRetry: boolean;
}

export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof ApiException) {
    const s = err.status;
    const c = err.code;

    if (s === 400 || c === 1001 || c === 1007 || c === 1008)
      return { severity: 'field', message: err.message, code: c, status: s, details: err.details, canRetry: false };

    if (s === 403 || c === 1003)
      return { severity: 'permission', message: err.message, code: c, status: s, canRetry: false };

    if (s === 404 || c === 1004)
      return { severity: 'notfound', message: err.message, code: c, status: s, canRetry: false };

    if (s === 409 || c === 1005 || c === 1006 || c === 4001 || c === 4003 || c === 4004 || c === 4005 || c === 4007 || c === 4008 || c === 4009 || c === 4010 || c === 4011 || c === 4012)
      return { severity: 'conflict', message: err.message, code: c, status: s, canRetry: false };

    if (s === 429 || c === 3001 || c === 3002 || c === 3003 || c === 3004 || c === 3005)
      return { severity: 'ratelimit', message: err.message, code: c, status: s, canRetry: true };

    if (s >= 500 || c === 5001 || c === 5002 || c === 5003 || c === 5004 || c === 5005 || c === 5006)
      return { severity: 'server', message: err.message, code: c, status: s, canRetry: true };

    return { severity: 'unknown', message: err.message, code: c, status: s, canRetry: true };
  }

  if (err instanceof Error) {
    if (err.message.includes('网络') || err.message.includes('Network'))
      return { severity: 'network', message: err.message, code: 0, status: 0, canRetry: true };
    return { severity: 'unknown', message: err.message, code: 0, status: 0, canRetry: true };
  }

  return { severity: 'unknown', message: '未知错误', code: 0, status: 0, canRetry: true };
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiException) return err.message;
  if (err instanceof Error) return err.message;
  return '操作失败';
}

export function isRetryable(err: unknown): boolean {
  return classifyError(err).canRetry;
}

export function isPermissionError(err: unknown): boolean {
  return classifyError(err).severity === 'permission';
}

export function isNotFoundError(err: unknown): boolean {
  return classifyError(err).severity === 'notfound';
}

export function isConflictError(err: unknown): boolean {
  return classifyError(err).severity === 'conflict';
}

export function isRateLimitError(err: unknown): boolean {
  return classifyError(err).severity === 'ratelimit';
}

export function nullDisplay(value: unknown, placeholder = '--'): string {
  if (value === null || value === undefined || value === '') return placeholder;
  return String(value);
}
