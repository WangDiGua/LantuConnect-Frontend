import { ApiException } from '../types/api';

export type InvokeStage = 'resolve' | 'invoke';

export function mapInvokeFlowError(err: unknown, stage: InvokeStage): string {
  if (err instanceof ApiException) {
    if (stage === 'invoke' && err.status === 401) {
      return 'API Key 无效或已失效，请检查密钥状态';
    }
    if (stage === 'invoke' && err.status === 400) {
      return '请求参数格式错误，请检查 method/params/resourceId';
    }
    if (stage === 'invoke' && err.status === 403) {
      return [
        '403：请确认 API Key 有效且 scope 覆盖当前操作（catalog / resolve / invoke）。',
        '若提示 scope：偏好设置里新建 Key 已默认写入；旧 Key 若 scope 异常请撤销后重建。',
        '若仍拒绝：请核对资源已发布、Key 所属账号具备网关策略允许的调用条件，或联系资源维护者。',
      ].join(' ');
    }
    if (stage === 'invoke' && (err.status === 409 || err.code === 4001)) return '资源当前状态不允许调用，请刷新资源状态后重试';
    if (stage === 'invoke' && err.status === 429) return '调用过于频繁，请稍后重试';
    if (stage === 'invoke' && (err.status ?? 0) >= 500) return '服务异常，请稍后重试';
    if (stage === 'resolve') {
      const base = `资源解析失败：${err.message}`;
      if (err.status === 403 || err.code === 1003) {
        return [
          base,
          '请确认：① 使用与该资源、当前环境一致的完整 API Key secret；② 资源状态为已发布且目录 resolve 对该 Key 返回允许；③ Key 未过期且具备所需 scope。',
        ].join('\n');
      }
      return base;
    }
    return err.message;
  }
  return stage === 'resolve' ? '资源解析失败，请重试' : '调用失败，请稍后重试';
}
