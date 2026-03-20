import React, { useState } from 'react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, inputClass, btnPrimaryClass, btnGhostClass } from '../userApp/UserAppShell';
import { useAdminGatewayRoutes, useCreateGatewayRoute, useDeleteGatewayRoute } from '../../hooks/queries/useAdmin';
import type { GatewayRoute } from '../../types/dto/admin';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface Props {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminIntegrationModule: React.FC<Props> = ({ activeSubItem, theme, fontSize, showMessage }) => {
  const [hooks, setHooks] = useState<{ id: string; path: string; secret: string }[]>([
    { id: 'h1', path: '/hooks/billing', secret: 'whsec_***' },
  ]);
  const [sandbox, setSandbox] = useState({ name: '', ttl: '24' });
  const [oauth, setOauth] = useState<{ id: string; client: string; redirect: string }[]>([
    { id: 'o1', client: 'campus-app', redirect: 'https://app.example.com/cb' },
  ]);
  const [sdkKey, setSdkKey] = useState('sdk_publish_****');
  const [oauthName, setOauthName] = useState('');
  const [oauthCb, setOauthCb] = useState('');

  const routesQuery = useAdminGatewayRoutes();
  const createRoute = useCreateGatewayRoute();
  const deleteRoute = useDeleteGatewayRoute();
  const [newPath, setNewPath] = useState('');
  const [newUpstream, setNewUpstream] = useState('');
  const [newRps, setNewRps] = useState('100');
  const [routeToDelete, setRouteToDelete] = useState<GatewayRoute | null>(null);
  const [routeSearch, setRouteSearch] = useState('');

  if (activeSubItem === 'API 网关') {
    const { data: routes, isLoading, isError, error, refetch } = routesQuery;

    const addRoute = () => {
      const path = newPath.trim() || '/v1/new';
      const upstream = newUpstream.trim() || 'svc:9000';
      const rps = Math.max(1, Number(newRps) || 100);
      createRoute.mutate(
        { path, upstream, rps },
        {
          onSuccess: () => {
            showMessage('已添加路由', 'success');
            setNewPath('');
            setNewUpstream('');
            setNewRps('100');
          },
          onError: (e) => showMessage(e instanceof Error ? e.message : '创建失败', 'error'),
        },
      );
    };

    const confirmDelete = () => {
      if (!routeToDelete) return;
      const id = routeToDelete.id;
      deleteRoute.mutate(id, {
        onSuccess: () => {
          showMessage('已删除路由', 'success');
          setRouteToDelete(null);
        },
        onError: (e) => showMessage(e instanceof Error ? e.message : '删除失败', 'error'),
      });
    };

    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="API 网关" subtitle="路由与限流绑定">
        <div className={`${cardClass(theme)} p-4 mb-4 space-y-3 max-w-lg`}>
          <input
            className={inputClass(theme)}
            placeholder="路径（默认 /v1/new）"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
          />
          <input
            className={inputClass(theme)}
            placeholder="上游（默认 svc:9000）"
            value={newUpstream}
            onChange={(e) => setNewUpstream(e.target.value)}
          />
          <input
            className={inputClass(theme)}
            type="number"
            min={1}
            placeholder="RPS"
            value={newRps}
            onChange={(e) => setNewRps(e.target.value)}
          />
          <button
            type="button"
            className={btnPrimaryClass}
            disabled={createRoute.isPending}
            onClick={addRoute}
          >
            {createRoute.isPending ? '提交中…' : '新增路由'}
          </button>
        </div>

        {isLoading ? (
          <PageSkeleton type="table" rows={4} />
        ) : isError ? (
          <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
        ) : !routes?.length ? (
          <EmptyState title="暂无路由" description="添加第一条 API 网关路由" />
        ) : (() => {
          const s = routeSearch.trim().toLowerCase();
          const filtered = s ? routes.filter((r) => `${r.path}${r.upstream}`.toLowerCase().includes(s)) : routes;
          return (
          <>
          <div className="mb-4">
            <input className={`${inputClass(theme)} max-w-xs`} placeholder="搜索路径/上游…" value={routeSearch} onChange={(e) => setRouteSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="无匹配路由" description="尝试调整搜索条件" />
          ) : (
          <div className={cardClass(theme)}>
            {filtered.map((r) => (
              <div
                key={r.id}
                className={`p-4 flex flex-wrap justify-between gap-2 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
              >
                <div>
                  <div className="font-mono text-sm">{r.path}</div>
                  <div className="text-xs text-slate-500">{r.upstream}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-600">{r.rps} rps</div>
                  <button
                    type="button"
                    className={`text-sm ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`}
                    onClick={() => setRouteToDelete(r)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
          </>
          );
        })()}

        <button
          type="button"
          className={`${btnGhostClass(theme)} mt-4`}
          onClick={() => {
            refetch();
            showMessage('配置已热更新', 'success');
          }}
        >
          热更新
        </button>

        <ConfirmDialog
          open={!!routeToDelete}
          title="删除路由"
          message={routeToDelete ? `确定删除路由「${routeToDelete.path}」？此操作不可撤销。` : ''}
          confirmText="删除"
          variant="danger"
          loading={deleteRoute.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setRouteToDelete(null)}
        />
      </UserAppShell>
    );
  }

  if (activeSubItem === 'Webhook 路由') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="Webhook 路由" subtitle="入站签名与转发">
        <div className={`${cardClass(theme)} p-4 mb-4 space-y-3 max-w-lg`}>
          <input className={inputClass(theme)} placeholder="路径" defaultValue="/hooks/custom" />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              setHooks((prev) => [...prev, { id: `h${Date.now()}`, path: '/hooks/custom', secret: 'whsec_new' }]);
              showMessage('路由已创建', 'success');
            }}
          >
            创建
          </button>
        </div>
        <div className={cardClass(theme)}>
          {hooks.map((h) => (
            <div key={h.id} className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div className="font-mono text-sm">{h.path}</div>
              <div className="text-xs text-slate-500 mt-1">{h.secret}</div>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === '沙箱环境') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="沙箱环境" subtitle="临时联调命名空间（Mock）">
        <div className={`${cardClass(theme)} p-4 max-w-lg space-y-3`}>
          <input className={inputClass(theme)} placeholder="沙箱名称" value={sandbox.name} onChange={(e) => setSandbox((s) => ({ ...s, name: e.target.value }))} />
          <select className={inputClass(theme)} value={sandbox.ttl} onChange={(e) => setSandbox((s) => ({ ...s, ttl: e.target.value }))}>
            <option value="24">24 小时</option>
            <option value="72">72 小时</option>
          </select>
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              if (!sandbox.name.trim()) {
                showMessage('请填写名称', 'error');
                return;
              }
              showMessage(`沙箱「${sandbox.name}」已开通`, 'success');
            }}
          >
            开通沙箱
          </button>
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'OAuth 客户端') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="OAuth 客户端" subtitle="第三方应用登记">
        <div className={`${cardClass(theme)} p-4 mb-4 space-y-3 max-w-lg`}>
          <input className={inputClass(theme)} placeholder="应用名" value={oauthName} onChange={(e) => setOauthName(e.target.value)} />
          <input className={inputClass(theme)} placeholder="回调 URL" value={oauthCb} onChange={(e) => setOauthCb(e.target.value)} />
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              if (!oauthName.trim() || !oauthCb.trim()) {
                showMessage('请填写完整', 'error');
                return;
              }
              setOauth((prev) => [...prev, { id: `o${Date.now()}`, client: oauthName.trim(), redirect: oauthCb.trim() }]);
              setOauthName('');
              setOauthCb('');
              showMessage('客户端已创建（Mock）', 'success');
            }}
          >
            注册客户端
          </button>
        </div>
        <div className={cardClass(theme)}>
          {oauth.map((o) => (
            <div key={o.id} className={`p-4 border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>
              <div className="font-medium">{o.client}</div>
              <div className="text-xs text-slate-500 break-all">{o.redirect}</div>
            </div>
          ))}
        </div>
      </UserAppShell>
    );
  }

  if (activeSubItem === 'SDK 与密钥') {
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="SDK 与密钥" subtitle="发布端 SDK 配置包">
        <div className={`${cardClass(theme)} p-4 max-w-xl space-y-3`}>
          <div className="font-mono text-sm break-all">{sdkKey}</div>
          <button type="button" className={btnGhostClass(theme)} onClick={() => showMessage('已复制', 'success')}>
            复制 Publishable Key
          </button>
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              setSdkKey(`sdk_publish_${Math.random().toString(36).slice(2, 10)}`);
              showMessage('已轮换密钥', 'success');
            }}
          >
            轮换密钥
          </button>
        </div>
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};
