import { ApiException } from '../../types/api';
import type { AgentVersion } from '../../types/dto/agent';

function deprecatedError<T>(): Promise<T> {
  return Promise.reject(
    new ApiException({
      code: 1004,
      status: 410,
      message: '接口已下线，请迁移到统一网关接口',
    }),
  );
}

export const versionService = {
  list: (_agentId: number): Promise<AgentVersion[]> =>
    Promise.resolve([]),

  create: (_agentId: number, _payload: { version: string; changelog: string }, _username?: string): Promise<AgentVersion> =>
    deprecatedError<AgentVersion>(),

  publish: (_versionId: number): Promise<void> => deprecatedError<void>(),

  rollback: (_versionId: number): Promise<void> => deprecatedError<void>(),
};
