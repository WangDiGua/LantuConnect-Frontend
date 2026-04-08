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
        '403：网关需同时满足 API Key scope 与资源授权。',
        '若提示 scope 相关：请确认 Key 含 catalog/resolve/invoke 或 *（偏好设置里「新建」已默认写入；旧 Key 若 scope 为空请撤销后重建）。',
        '若仍拒绝：对他人资源请在详情页「申请授权」，或请资源方在授权中心完成授权。',
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
          '请确认：① 工具测试里填的是该资源「已批准授权」对应的 API Key 完整 secret（与个人设置里存的全局 Key 可能不是同一把）；② 该资源与当前 Key 之间已有生效中的授权；③ 授权未过期。',
        ].join('\n');
      }
      return base;
    }
    return err.message;
  }
  return stage === 'resolve' ? '资源解析失败，请重试' : '调用失败，请稍后重试';
}
