import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User, Mail, Moon, Sun,
  History, Camera, Building2, Clock, Monitor,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useMessage } from '../../components/common/Message';
import { authService } from '../../api/services/auth.service';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { MultiAvatar } from '../../components/common/MultiAvatar';
import type { SessionItem } from '../../types/dto/explore';
import {
  canvasBodyBg, textPrimary, textSecondary, textMuted,
  mainScrollPadBottom,
  mgmtTableActionDanger,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { Pagination } from '../../components/common/Pagination';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import type { PlatformRoleCode } from '../../types/dto/auth';
import { PLATFORM_ROLE_LABELS } from '../../constants/platformRoles';
import { normalizeRole } from '../../context/UserRoleContext';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

interface UserProfileProps { theme: Theme; fontSize: FontSize; }

interface LoginHistoryRow {
  id: number;
  loginTime: string;
  ip: string;
  loginType: string;
  result: string;
  location: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  userAgent: string;
}

function parseUA(ua: string): { os: string; browser: string } {
  let os = '未知';
  let browser = '未知';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';

  if (/Chrome\/[\d.]+/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Edg\/[\d.]+/.test(ua)) browser = 'Edge';
  else if (/Firefox\/[\d.]+/.test(ua)) browser = 'Firefox';
  else if (/Safari\/[\d.]+/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  return { os, browser };
}

export const UserProfile: React.FC<UserProfileProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const user = useAuthStore((s) => s.user);
  const displayName = user?.nickname || user?.username || 'User Name';
  const displayEmail = user?.email || 'user@nexus-ai.edu.cn';
  const platformRole: PlatformRoleCode = normalizeRole(user?.role);
  const displayRole = PLATFORM_ROLE_LABELS[platformRole] ?? PLATFORM_ROLE_LABELS.user;
  const displayDept = user?.department || '未设置';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showMessage } = useMessage();
  const historyPageSize = 10;
  const sessionPageSize = 10;
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRow[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  useScrollPaginatedContentToTop(historyPage);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionPage, setSessionPage] = useState(1);
  useScrollPaginatedContentToTop(sessionPage);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const loadLoginHistory = useCallback((page: number = 1) => {
    setHistoryLoading(true);
    setHistoryError(null);
    authService.getLoginHistory({ page, pageSize: historyPageSize })
      .then((res) => {
        const list = res?.list ?? (Array.isArray(res) ? res as any[] : []);
        setHistoryPage(res.page ?? page);
        setHistoryTotal(res.total ?? list.length);
        setLoginHistory(list.map((r: any) => ({
          id: r.id,
          loginTime: r.loginTime || r.createTime || '',
          ip: r.ip || '',
          loginType: r.loginType || r.loginMethod || '',
          result: r.result || '',
          location: r.location || null,
          device: r.device || null,
          os: r.os || null,
          browser: r.browser || null,
          userAgent: r.userAgent || '',
        })));
      })
      .catch((err) => { setHistoryError(err instanceof Error ? err.message : '登录记录加载失败'); })
      .finally(() => setHistoryLoading(false));
  }, [historyPageSize]);

  const loadSessions = useCallback((page: number = 1) => {
    setSessionsLoading(true);
    setSessionsError(null);
    authService.listSessions({ page, pageSize: sessionPageSize })
      .then((res) => {
        setSessionPage(res.page ?? page);
        setSessionTotal(res.total ?? res.list.length);
        setSessions(res.list);
      })
      .catch((err) => { setSessionsError(err instanceof Error ? err.message : '会话加载失败'); })
      .finally(() => setSessionsLoading(false));
  }, [sessionPageSize]);

  useEffect(() => {
    loadLoginHistory(1);
    loadSessions(1);
  }, [loadLoginHistory, loadSessions]);

  const handleRevokeSession = async (session: SessionItem) => {
    if (session.current || revokingSessionId) return;
    setRevokingSessionId(session.id);
    try {
      await authService.revokeSession(session.id);
      showMessage('会话已撤销', 'success');
      await loadSessions(sessionPage);
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '撤销会话失败，请重试', 'error');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const thCls = `text-left text-xs font-semibold uppercase tracking-wider py-2.5 px-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;
  const tdCls = `py-2.5 px-3 text-sm ${textSecondary(theme)}`;
  const trCls = `border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`;
  const infoRowCls = `flex items-center justify-between py-2.5 px-1`;

  return (
    <div className={`flex-1 overflow-y-auto transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className={`w-full min-h-0 ${mainScrollPadBottom}`}>

        {/* Top: avatar card + account info side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <aside className="lg:col-span-3 min-w-0">
            <GlassPanel theme={theme} padding="lg" className="h-full">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-2 border-white/20 overflow-hidden shadow-sm">
                    <MultiAvatar
                      seed={`${user?.id ?? 'user'}-${displayName}`}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                    title="更换头像"
                  >
                    <Camera size={20} className="text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    if (e.target.files?.length) {
                      try {
                        const { fileUploadService } = await import('../../api/services/file-upload.service');
                        const uploadResult = await fileUploadService.upload(e.target.files[0], 'avatar');
                        await authService.updateProfile({ avatar: uploadResult.url });
                        showMessage('头像已更新', 'success');
                      } catch (err) {
                        showMessage(err instanceof Error ? err.message : '头像更新失败', 'error');
                      }
                      e.target.value = '';
                    }
                  }} />
                </div>
                <div className="min-w-0 w-full">
                  <h1 className={`text-xl font-bold tracking-tight mb-0.5 ${textPrimary(theme)}`}>{displayName}</h1>
                  <p className={`text-xs break-all ${textMuted(theme)}`}>{displayEmail}</p>
                  <p className={`text-xs mt-1.5 ${textSecondary(theme)}`}>
                    <Building2 size={11} className="inline mr-1 align-[-0.1em] opacity-70" />
                    {displayDept}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-900'}`}>
                      {displayRole}
                    </span>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                      {user?.status === 'active' || !user ? '已认证' : '未激活'}
                    </span>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </aside>

          <div className="lg:col-span-9 min-w-0">
            <BentoCard theme={theme} className="h-full">
              <h2 className={`text-base font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
                <User size={18} /> 账号信息
              </h2>
              <div className="space-y-0.5">
                <div className={infoRowCls}>
                  <span className={`flex items-center gap-2 text-sm ${textSecondary(theme)}`}><Mail size={15} className="text-slate-400" />邮箱地址</span>
                  <span className={`text-sm ${textMuted(theme)}`}>{displayEmail}</span>
                </div>
                <div className={infoRowCls}>
                  <span className={`flex items-center gap-2 text-sm ${textSecondary(theme)}`}><Building2 size={15} className="text-slate-400" />所属部门</span>
                  <span className={`text-sm ${textMuted(theme)}`}>{displayDept}</span>
                </div>
                <div className={infoRowCls}>
                  <span className={`flex items-center gap-2 text-sm ${textSecondary(theme)}`}>
                    {theme === 'light' ? <Sun size={15} className="text-slate-400" /> : <Moon size={15} className="text-slate-400" />}
                    深色模式
                  </span>
                  <span className={`text-sm ${textMuted(theme)}`}>{theme === 'light' ? '已关闭' : '已开启'}</span>
                </div>
                <div className={infoRowCls}>
                  <span className={`flex items-center gap-2 text-sm ${textSecondary(theme)}`}><Clock size={15} className="text-slate-400" />注册时间</span>
                  <span className={`text-sm ${textMuted(theme)}`}>{formatDateTime(user?.createdAt, '—')}</span>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>

        {/* Login History Table */}
        <BentoCard theme={theme} className="mb-4">
          <h2 className={`text-base font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
            <History size={18} /> 最近登录记录
          </h2>
          {historyError ? (
            <div className={`rounded-xl p-3 border ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
              <p className="text-xs text-rose-500">{historyError}</p>
              <button type="button" onClick={() => loadLoginHistory(historyPage)} className="mt-2 text-xs text-neutral-800 hover:text-neutral-900">重试</button>
            </div>
          ) : historyLoading ? (
            <PageSkeleton type="table" rows={4} />
          ) : loginHistory.length === 0 ? (
            <p className={`text-xs py-4 text-center ${textMuted(theme)}`}>暂无登录记录</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200/70'}`}>
                    <th className={thCls}>登录时间</th>
                    <th className={thCls}>设备 / 浏览器</th>
                    <th className={thCls}>IP</th>
                    <th className={thCls}>地区</th>
                    <th className={thCls}>方式</th>
                    <th className={thCls}>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((row) => {
                    const parsed = (!row.os && !row.browser && row.userAgent) ? parseUA(row.userAgent) : null;
                    const os = row.os || parsed?.os || '—';
                    const browser = row.browser || parsed?.browser || '—';
                    const isSuccess = row.result === 'success';
                    return (
                      <tr key={row.id} className={trCls}>
                        <td className={`${tdCls} whitespace-nowrap`}>{formatDateTime(row.loginTime)}</td>
                        <td className={tdCls}>{os} / {browser}</td>
                        <td className={`${tdCls} font-mono text-xs`}>{row.ip || '—'}</td>
                        <td className={tdCls}>{row.location || '—'}</td>
                        <td className={tdCls}>{row.loginType || '—'}</td>
                        <td className={tdCls}>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isSuccess
                              ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                              : (isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600')
                          }`}>
                            {isSuccess ? '成功' : '失败'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!historyError && !historyLoading && (
            <Pagination
              theme={theme}
              page={historyPage}
              pageSize={historyPageSize}
              total={historyTotal}
              onChange={(p) => loadLoginHistory(p)}
            />
          )}
        </BentoCard>

        {/* Sessions Table */}
        <BentoCard theme={theme}>
          <h2 className={`text-base font-bold mb-3 flex items-center gap-2 ${textPrimary(theme)}`}>
            <Monitor size={18} /> 登录设备与会话
          </h2>
          {sessionsError ? (
            <div className={`rounded-xl p-3 border ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
              <p className="text-xs text-rose-500">{sessionsError}</p>
              <button type="button" onClick={() => loadSessions(sessionPage)} className="mt-2 text-xs text-neutral-800 hover:text-neutral-900">重试</button>
            </div>
          ) : sessionsLoading ? (
            <PageSkeleton type="table" rows={4} />
          ) : sessions.length === 0 ? (
            <p className={`text-xs py-4 text-center ${textMuted(theme)}`}>暂无活跃会话</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200/70'}`}>
                    <th className={thCls}>设备</th>
                    <th className={thCls}>系统 / 浏览器</th>
                    <th className={thCls}>IP</th>
                    <th className={thCls}>地区</th>
                    <th className={thCls}>登录时间</th>
                    <th className={thCls}>最后活跃</th>
                    <th className={`${thCls} text-right`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className={trCls}>
                      <td className={tdCls}>
                        <span className="flex items-center gap-1.5">
                          {s.device || '—'}
                          {s.current && <span className="ml-1 inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500">当前</span>}
                        </span>
                      </td>
                      <td className={tdCls}>{s.os || '—'} / {s.browser || '—'}</td>
                      <td className={`${tdCls} font-mono text-xs`}>{s.ip || '—'}</td>
                      <td className={tdCls}>{s.location || '—'}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>{formatDateTime(s.loginAt)}</td>
                      <td className={`${tdCls} whitespace-nowrap`}>{formatDateTime(s.lastActiveAt)}</td>
                      <td className={`${tdCls} text-right`}>
                        {s.current ? (
                          <span className={`text-xs ${textMuted(theme)}`}>—</span>
                        ) : (
                          <button
                            type="button"
                            disabled={revokingSessionId !== null}
                            onClick={() => handleRevokeSession(s)}
                            className={`${mgmtTableActionDanger} disabled:opacity-50 disabled:pointer-events-none`}
                          >
                            {revokingSessionId === s.id ? '撤销中…' : '撤销'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!sessionsError && !sessionsLoading && (
            <Pagination
              theme={theme}
              page={sessionPage}
              pageSize={sessionPageSize}
              total={sessionTotal}
              onChange={(p) => loadSessions(p)}
            />
          )}
        </BentoCard>
      </div>
    </div>
  );
};
