import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  Camera,
  Building2,
  Clock,
  Monitor,
  Smartphone,
  LogOut,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Laptop,
  ShieldCheck,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Theme, FontSize } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useMessage } from '../../components/common/Message';
import { authService } from '../../api/services/auth.service';
import { MultiAvatar } from '../../components/common/MultiAvatar';
import type { SessionItem } from '../../types/dto/explore';
import { mainScrollPadBottom } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { Pagination } from '../../components/common/Pagination';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import type { PlatformRoleCode } from '../../types/dto/auth';
import { PLATFORM_ROLE_LABELS } from '../../constants/platformRoles';
import { normalizeRole } from '../../context/UserRoleContext';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

interface UserProfileProps {
  theme: Theme;
  fontSize: FontSize;
  /** 打开账号安全相关设置（如修改密码） */
  onOpenSecuritySettings?: () => void;
}

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

function isPrivateLanIp(ip: string): boolean {
  const t = ip.trim();
  if (!t) return false;
  if (t === '127.0.0.1' || t === '::1') return true;
  if (t.startsWith('192.168.') || t.startsWith('10.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(t)) return true;
  return false;
}

function displayLocation(location: string | null | undefined, ip: string): string {
  if (location && String(location).trim()) return String(location).trim();
  return isPrivateLanIp(ip) ? '局域网' : '—';
}

function formatSessionRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const sec = (Date.now() - d.getTime()) / 1000;
  if (sec < 60) return '刚刚';
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN });
}

function sessionLooksMobile(s: SessionItem): boolean {
  const blob = `${s.device} ${s.os} ${s.browser}`.toLowerCase();
  return /iphone|ipad|ipod|android|mobile|phone|平板/.test(blob);
}

const ACTIVITY_FALLBACK = [
  { val: 10 },
  { val: 25 },
  { val: 15 },
  { val: 30 },
  { val: 45 },
  { val: 20 },
  { val: 35 },
];

export const UserProfile: React.FC<UserProfileProps> = ({ theme, onOpenSecuritySettings }) => {
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
  const [activeTab, setActiveTab] = useState<'history' | 'devices'>('history');
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

  const activityData = useMemo(() => {
    const days = 7;
    const counts = Array.from({ length: days }, () => 0);
    const now = Date.now();
    for (const row of loginHistory) {
      const t = new Date(row.loginTime);
      if (Number.isNaN(t.getTime())) continue;
      const diffDay = Math.floor((now - t.getTime()) / 86400000);
      if (diffDay >= 0 && diffDay < days) counts[days - 1 - diffDay] += 1;
    }
    if (counts.every((c) => c === 0)) return ACTIVITY_FALLBACK;
    const max = Math.max(...counts, 1);
    return counts.map((c) => ({ val: Math.max(5, Math.round((c / max) * 45)) }));
  }, [loginHistory]);

  const loadLoginHistory = useCallback(
    (page: number = 1) => {
      setHistoryLoading(true);
      setHistoryError(null);
      authService
        .getLoginHistory({ page, pageSize: historyPageSize })
        .then((res) => {
          const list = res?.list ?? (Array.isArray(res) ? (res as any[]) : []);
          setHistoryPage(res.page ?? page);
          setHistoryTotal(res.total ?? list.length);
          setLoginHistory(
            list.map((r: any) => ({
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
            })),
          );
        })
        .catch((err) => {
          setHistoryError(err instanceof Error ? err.message : '登录记录加载失败');
        })
        .finally(() => setHistoryLoading(false));
    },
    [historyPageSize],
  );

  const loadSessions = useCallback(
    (page: number = 1) => {
      setSessionsLoading(true);
      setSessionsError(null);
      authService
        .listSessions({ page, pageSize: sessionPageSize })
        .then((res) => {
          setSessionPage(res.page ?? page);
          setSessionTotal(res.total ?? res.list.length);
          setSessions(res.list);
        })
        .catch((err) => {
          setSessionsError(err instanceof Error ? err.message : '会话加载失败');
        })
        .finally(() => setSessionsLoading(false));
    },
    [sessionPageSize],
  );

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

  const pageShell = isDark
    ? 'min-h-full bg-slate-950 font-sans text-slate-200 p-6 lg:p-10'
    : 'min-h-full bg-[#f8fafc] font-sans text-slate-700 p-6 lg:p-10';

  const profileCard = isDark
    ? 'bg-slate-900/90 rounded-[2rem] shadow-sm border border-white/10 overflow-hidden flex flex-col md:flex-row'
    : 'bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row';

  const profileLeft = isDark
    ? 'p-8 md:w-2/5 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800/80 to-slate-900 border-r border-white/10'
    : 'p-8 md:w-2/5 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white border-r border-slate-50';

  const bottomCard = isDark
    ? 'bg-slate-900/90 rounded-[2rem] shadow-sm border border-white/10 overflow-hidden'
    : 'bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden';

  const tableHead = isDark ? 'text-slate-400' : 'text-slate-400';
  const tableDivide = isDark ? 'divide-white/[0.06]' : 'divide-slate-50';
  const rowHover = isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50/50';

  return (
    <div className={`flex-1 overflow-y-auto transition-colors duration-300 ${pageShell}`}>
      <div className={`mx-auto max-w-7xl space-y-8 ${mainScrollPadBottom}`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className={profileCard + ' lg:col-span-2'}>
            <div className={profileLeft}>
              <div className="group relative">
                <div
                  className={
                    isDark
                      ? 'absolute -inset-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 opacity-30 blur transition duration-500 group-hover:opacity-45'
                      : 'absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 opacity-25 blur transition duration-500 group-hover:opacity-40'
                  }
                />
                <div
                  className={
                    isDark
                      ? 'relative size-28 overflow-hidden rounded-full border-4 border-slate-800 bg-slate-800 shadow-xl'
                      : 'relative size-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl'
                  }
                >
                  <MultiAvatar
                    seed={`${user?.id ?? 'user'}-${displayName}`}
                    alt={displayName}
                    className="size-full rounded-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                    title="更换头像"
                  >
                    <Camera size={20} className="text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
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
                    }}
                  />
                </div>
                <div
                  className={
                    isDark
                      ? 'absolute bottom-1 right-1 size-6 rounded-full border-4 border-slate-900 bg-emerald-500 shadow-sm'
                      : 'absolute bottom-1 right-1 size-6 rounded-full border-4 border-white bg-green-500 shadow-sm'
                  }
                />
              </div>
              <h1 className={`mt-5 text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {displayName}
              </h1>
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{displayEmail}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span
                  className={
                    isDark
                      ? 'rounded-full bg-sky-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-300'
                      : 'rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600'
                  }
                >
                  {displayRole}
                </span>
                <span
                  className={
                    isDark
                      ? 'rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400'
                      : 'rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600'
                  }
                >
                  {user?.status === 'active' || !user ? '已认证' : '未激活'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-6 p-8 md:w-3/5">
              <InfoItem
                theme={theme}
                icon={<Mail size={16} />}
                label="邮箱地址"
                value={displayEmail}
              />
              <InfoItem theme={theme} icon={<Building2 size={16} />} label="所属部门" value={displayDept} />
              <InfoItem
                theme={theme}
                icon={<Clock size={16} />}
                label="注册时间"
                value={formatDateTime(user?.createdAt, '—')}
              />
              <div className="flex flex-col gap-1">
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                >
                  <ShieldCheck size={14} /> 安全状态
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={`h-1.5 w-24 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}
                  >
                    <div
                      className={`h-full w-4/5 bg-gradient-to-r ${isDark ? 'from-sky-400 to-indigo-400' : 'from-blue-400 to-indigo-500'}`}
                    />
                  </div>
                  <span
                    className={`text-xs font-bold ${isDark ? 'text-sky-400' : 'text-blue-600'}`}
                  >
                    良好
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={
              isDark
                ? 'group relative overflow-hidden rounded-[2rem] bg-indigo-700 p-8 text-white shadow-lg shadow-indigo-950/50'
                : 'group relative overflow-hidden rounded-[2rem] bg-indigo-600 p-8 text-white shadow-lg shadow-indigo-200'
            }
          >
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <h3 className="text-lg font-medium opacity-90">登录活跃度</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{historyTotal}</span>
                  <span className="text-sm opacity-70">累计登录记录</span>
                </div>
              </div>
              <div className="-mb-2 h-16 w-full [&_.recharts-surface]:outline-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <Area
                      type="monotone"
                      dataKey="val"
                      stroke="rgba(255,255,255,0.4)"
                      fill="rgba(255,255,255,0.1)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <button
                type="button"
                onClick={() => onOpenSecuritySettings?.()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-medium backdrop-blur-md transition hover:bg-white/20"
              >
                修改安全设置
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="absolute top-[-20%] right-[-10%] size-48 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-110" />
          </div>
        </div>

        <div className={bottomCard}>
          <div
            className={`flex flex-col gap-4 border-b px-8 pt-8 pb-4 sm:flex-row sm:items-center sm:justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-50'}`}
          >
            <div className="flex gap-8">
              <TabButton
                active={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
                label="最近登录记录"
                icon={<Clock size={18} />}
              />
              <TabButton
                active={activeTab === 'devices'}
                onClick={() => setActiveTab('devices')}
                label="登录设备与会话"
                icon={<Monitor size={18} />}
              />
            </div>
            <div
              className={
                isDark
                  ? 'flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-400'
                  : 'flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs text-slate-400'
              }
            >
              <ShieldAlert size={14} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
              发现异常记录请及时修改密码
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            {activeTab === 'history' ? (
              historyError ? (
                <div
                  className={`rounded-xl border p-3 ${isDark ? 'border-rose-500/25 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}
                >
                  <p className="text-xs text-rose-500">{historyError}</p>
                  <button
                    type="button"
                    onClick={() => loadLoginHistory(historyPage)}
                    className="mt-2 text-xs text-neutral-800 hover:text-neutral-900 dark:text-slate-200"
                  >
                    重试
                  </button>
                </div>
              ) : historyLoading ? (
                <PageSkeleton type="table" rows={4} />
              ) : loginHistory.length === 0 ? (
                <p className={`py-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  暂无登录记录
                </p>
              ) : (
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className={`text-xs font-semibold uppercase tracking-wider ${tableHead}`}>
                      <th className="px-4 py-4">登录时间</th>
                      <th className="px-4 py-4">设备 / 浏览器</th>
                      <th className="px-4 py-4">IP 地址</th>
                      <th className="px-4 py-4">登录地区</th>
                      <th className="px-4 py-4 text-center">结果</th>
                    </tr>
                  </thead>
                  <tbody className={tableDivide + ' divide-y'}>
                    {loginHistory.map((row) => {
                      const parsed =
                        !row.os && !row.browser && row.userAgent ? parseUA(row.userAgent) : null;
                      const os = row.os || parsed?.os || '—';
                      const browser = row.browser || parsed?.browser || '—';
                      const isSuccess = row.result === 'success';
                      const mobileLike = /iphone|ipad|android|mobile|phone/i.test(
                        `${os} ${browser} ${row.device || ''}`,
                      );
                      return (
                        <ScrollRow key={row.id} hover={rowHover}>
                          <td
                            className={`px-4 py-4 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                          >
                            {formatDateTime(row.loginTime)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={
                                  isDark
                                    ? 'rounded-lg bg-white/10 p-2 text-slate-400 transition-all group-hover:bg-white/15 group-hover:shadow-md'
                                    : 'rounded-lg bg-slate-100 p-2 text-slate-500 transition-all group-hover:bg-white group-hover:shadow-sm'
                                }
                              >
                                {mobileLike ? <Smartphone size={16} /> : <Laptop size={16} />}
                              </div>
                              <div className="text-sm">
                                <div
                                  className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                                >
                                  {os}
                                </div>
                                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {browser}
                                  {row.device ? ` · ${row.device}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td
                            className={`px-4 py-4 font-mono text-sm underline decoration-slate-300 ${isDark ? 'text-slate-400 decoration-white/10' : 'text-slate-500'}`}
                          >
                            {row.ip || '—'}
                          </td>
                          <td className={`px-4 py-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={14} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                              {displayLocation(row.location, row.ip)}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center">
                              <span
                                className={
                                  isSuccess
                                    ? isDark
                                      ? 'rounded-lg border border-emerald-500/25 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-400'
                                      : 'rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600'
                                    : isDark
                                      ? 'rounded-lg border border-rose-500/25 bg-rose-500/15 px-3 py-1 text-[10px] font-bold text-rose-400'
                                      : 'rounded-lg border border-rose-100 bg-rose-50 px-3 py-1 text-[10px] font-bold text-rose-600'
                                }
                              >
                                {isSuccess ? '成功' : '失败'}
                              </span>
                            </div>
                          </td>
                        </ScrollRow>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : sessionsError ? (
              <div
                className={`rounded-xl border p-3 ${isDark ? 'border-rose-500/25 bg-rose-500/10' : 'border-rose-200 bg-rose-50'}`}
              >
                <p className="text-xs text-rose-500">{sessionsError}</p>
                <button
                  type="button"
                  onClick={() => loadSessions(sessionPage)}
                  className="mt-2 text-xs text-neutral-800 hover:text-neutral-900 dark:text-slate-200"
                >
                  重试
                </button>
              </div>
            ) : sessionsLoading ? (
              <PageSkeleton type="table" rows={4} />
            ) : sessions.length === 0 ? (
              <p className={`py-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                暂无活跃会话
              </p>
            ) : (
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className={`text-xs font-semibold uppercase tracking-wider ${tableHead}`}>
                    <th className="px-4 py-4">设备</th>
                    <th className="px-4 py-4">IP / 地区</th>
                    <th className="px-4 py-4">最后活跃</th>
                    <th className="px-4 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className={tableDivide + ' divide-y'}>
                  {sessions.map((s) => {
                    const mobile = sessionLooksMobile(s);
                    const rowHighlight = s.current
                      ? isDark
                        ? 'bg-sky-500/10'
                        : 'bg-blue-50/30'
                      : '';
                    return (
                      <tr key={s.id} className={rowHighlight}>
                        <td className="px-4 py-6">
                          <div
                            className={`flex items-center gap-3 ${s.current ? '' : 'opacity-80'}`}
                          >
                            <div
                              className={
                                s.current
                                  ? mobile
                                    ? 'rounded-xl bg-sky-500 p-3 text-white shadow-lg shadow-sky-500/25'
                                    : 'rounded-xl bg-blue-500 p-3 text-white shadow-lg shadow-blue-100'
                                  : isDark
                                    ? 'rounded-xl bg-white/10 p-3 text-slate-400'
                                    : 'rounded-xl bg-slate-100 p-3 text-slate-500'
                              }
                            >
                              {mobile ? <Smartphone size={20} /> : <Monitor size={20} />}
                            </div>
                            <div>
                              <div
                                className={`flex items-center gap-2 font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                              >
                                {s.device || (mobile ? '移动设备' : '桌面设备')}
                                {s.current && (
                                  <span
                                    className={
                                      isDark
                                        ? 'rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] uppercase text-sky-300'
                                        : 'rounded bg-blue-100 px-1.5 py-0.5 text-[9px] uppercase text-blue-600'
                                    }
                                  >
                                    当前
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-xs underline ${isDark ? 'text-slate-500 decoration-sky-500/30' : 'text-slate-400 decoration-blue-100'}`}
                              >
                                {s.os || '—'} / {s.browser || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div
                            className={`font-mono text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            {s.ip || '—'}
                          </div>
                          <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {displayLocation(s.location, s.ip)}
                          </div>
                        </td>
                        <td className={`px-4 py-6 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatSessionRelative(s.lastActiveAt)}
                        </td>
                        <td className="px-4 py-6 text-right">
                          {s.current ? (
                            <span className={`text-xs font-medium ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                              当前会话
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={revokingSessionId !== null}
                              onClick={() => handleRevokeSession(s)}
                              className="ml-auto flex items-center justify-end gap-2 rounded-lg px-4 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-50 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-rose-500/10"
                            >
                              <LogOut size={14} />
                              {revokingSessionId === s.id ? '注销中…' : '强制注销'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'history' && !historyError && !historyLoading && (
              <Pagination
                theme={theme}
                page={historyPage}
                pageSize={historyPageSize}
                total={historyTotal}
                onChange={(p) => loadLoginHistory(p)}
              />
            )}
            {activeTab === 'devices' && !sessionsError && !sessionsLoading && (
              <Pagination
                theme={theme}
                page={sessionPage}
                pageSize={sessionPageSize}
                total={sessionTotal}
                onChange={(p) => loadSessions(p)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function ScrollRow({
  children,
  hover,
}: {
  children: React.ReactNode;
  hover: string;
}) {
  return <tr className={`group transition-colors ${hover}`}>{children}</tr>;
}

function InfoItem({
  theme,
  icon,
  label,
  value,
}: {
  theme: Theme;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const isDark = theme === 'dark';
  return (
    <div className="group flex flex-col gap-1">
      <span
        className={`flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
      >
        <span
          className={`transition-colors ${isDark ? 'text-slate-600 group-hover:text-sky-400' : 'text-slate-300 group-hover:text-blue-400'}`}
        >
          {icon}
        </span>
        {label}
      </span>
      <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 pb-4 text-sm font-bold transition-all ${
        active ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      {icon} {label}
      {active && (
        <div className="absolute bottom-[-1px] left-0 h-[3px] w-full rounded-full bg-blue-600 dark:bg-sky-400" />
      )}
    </button>
  );
}
