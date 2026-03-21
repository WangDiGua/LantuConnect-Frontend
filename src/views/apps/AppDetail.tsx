import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  Globe,
  FileText,
  Clock,
  Monitor,
  Eye,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SmartApp } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface AppDetailProps {
  appId: string;
  theme: Theme;
  fontSize: FontSize;
  onBack?: () => void;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  published: { label: '已发布', cls: 'badge-success' },
  draft: { label: '草稿', cls: 'badge-ghost' },
  testing: { label: '测试中', cls: 'badge-info' },
  deprecated: { label: '已下架', cls: 'badge-warning' },
};

const EMBED_LABEL: Record<string, string> = {
  iframe: 'iFrame 嵌入',
  micro_frontend: '微前端',
  redirect: '外链跳转',
};

const SOURCE_LABEL: Record<string, string> = {
  internal: '自研',
  partner: '合作伙伴',
  cloud: '云端',
};

export const AppDetail: React.FC<AppDetailProps> = ({ appId, theme, onBack, showMessage }) => {
  const isDark = theme === 'dark';
  const [app, setApp] = useState<SmartApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchApp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await smartAppService.getById(Number(appId));
      setApp(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => { fetchApp(); }, [fetchApp]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await smartAppService.remove(Number(appId));
      showMessage?.('删除成功', 'success');
      setDeleteOpen(false);
      onBack?.();
    } catch {
      showMessage?.('删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageSkeleton type="detail" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error} onRetry={fetchApp} />
      </div>
    );
  }

  const statusInfo = STATUS_MAP[app.status] ?? { label: app.status, cls: 'badge-ghost' };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl text-white shadow-none border border-emerald-500/30 shrink-0">
              {app.icon || '📱'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{app.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`badge badge-sm font-bold text-[10px] ${statusInfo.cls}`}>{statusInfo.label}</div>
                <span className="text-xs text-slate-500">ID: {appId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.open(app.appUrl, '_blank')}
            className="btn btn-ghost btn-sm gap-2"
          >
            <Eye size={16} />
            <span>预览应用</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="btn btn-error btn-sm btn-outline gap-2"
          >
            <Trash2 size={16} />
            <span>删除</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3 grid grid-cols-1 lg:grid-cols-3 gap-6 content-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">显示名称</label>
                  <p className="font-medium">{app.displayName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">应用标识</label>
                  <p className="font-medium font-mono text-sm">{app.appName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">嵌入方式</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                    isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {EMBED_LABEL[app.embedType] ?? app.embedType}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">来源</label>
                  <p className="font-medium">{SOURCE_LABEL[app.sourceType as string] ?? app.sourceType}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">状态</label>
                  <p className="font-medium">{statusInfo.label}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">是否公开</label>
                  <p className="font-medium">{app.isPublic ? '是' : '否'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">描述</label>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {app.description || '暂无描述'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* App Config */}
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Globe size={18} className="text-emerald-500" />
                应用配置
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl shrink-0">
                      <Monitor size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">应用地址</p>
                      <a
                        href={app.appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline break-all"
                      >
                        {app.appUrl}
                        <ExternalLink size={12} className="inline ml-1" />
                      </a>
                    </div>
                  </div>
                </div>

                {app.screenshots && app.screenshots.length > 0 && (
                  <div>
                    <p className="text-sm font-bold mb-2">应用截图</p>
                    <div className="grid grid-cols-2 gap-3">
                      {app.screenshots.map((url, i) => (
                        <img key={i} src={url} alt={`截图${i + 1}`} className="rounded-xl border border-inherit w-full object-cover" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                时间信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">创建时间</span>
                  <span className="font-mono">{app.createTime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">最后更新</span>
                  <span className="font-mono">{app.updateTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="删除应用"
        message={`确定要删除「${app.displayName}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};
