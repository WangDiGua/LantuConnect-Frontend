import React, { useCallback, useEffect, useState } from 'react';
import type { Theme, FontSize } from '../../types';
import type {
  SkillExternalCatalogEntry,
  SkillExternalCatalogProperties,
} from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnGhost, btnPrimary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  /** 保存成功后回调（用于刷新市场列表） */
  onSaved?: () => void;
}

const PROVIDERS = [
  { value: 'skillsmp', label: 'skillsmp（SkillsMP + 镜像合并）' },
  { value: 'static', label: 'static（仅 YAML / entries）' },
  { value: 'merge', label: 'merge（YAML + 动态源）' },
];

const ZIP_MIRROR_MODES = [
  { value: 'none', label: 'none（不改写）' },
  { value: 'prefix-encoded', label: 'prefix-encoded' },
  { value: 'prefix-raw', label: 'prefix-raw' },
];

function emptyEntry(): SkillExternalCatalogEntry {
  return { id: '', name: '', summary: '', packUrl: '', licenseNote: '', sourceUrl: '' };
}

export const SkillExternalMarketSettingsForm: React.FC<Props> = ({ theme, fontSize, showMessage, onSaved }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;
  const densityClass = fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [draft, setDraft] = useState<SkillExternalCatalogProperties | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [queriesText, setQueriesText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await resourceCenterService.getSkillExternalCatalogSettings();
      setDraft(res.config);
      setKeyConfigured(res.skillsmpApiKeyConfigured);
      const q = res.config.skillsmp?.discoveryQueries ?? [];
      setQueriesText(q.join('\n'));
    } catch (e) {
      const err = e instanceof Error ? e : new Error('加载配置失败');
      setError(err);
      setDraft(null);
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (patch: Partial<SkillExternalCatalogProperties>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const save = async () => {
    if (!draft) return;
    const lines = queriesText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const entries = (draft.entries ?? []).filter(
      (e) => e.id?.trim() && e.name?.trim() && e.packUrl?.trim(),
    );
    const payload: SkillExternalCatalogProperties = {
      ...draft,
      entries,
      skillsmp: {
        ...draft.skillsmp,
        discoveryQueries: lines,
        apiKey: (draft.skillsmp?.apiKey ?? '').trim(),
      },
    };
    setSaving(true);
    try {
      await resourceCenterService.putSkillExternalCatalogSettings(payload);
      showMessage('市场配置已保存，列表缓存已失效', 'success');
      await load();
      onSaved?.();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`px-3 py-6 sm:px-4 ${densityClass}`}>
        <PageSkeleton type="form" />
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className={`px-3 py-6 sm:px-4 ${densityClass}`}>
        <PageError error={error} onRetry={() => void load()} retryLabel="重试" />
      </div>
    );
  }

  const sm = draft.skillsmp ?? {};

  return (
    <div className={`space-y-8 px-3 py-4 sm:px-4 ${densityClass}`}>
      <p className={`text-sm ${textMuted(theme)}`}>
        配置写入数据库后覆盖 <code className="text-xs opacity-90">skill-external-catalog.yml</code> 默认值；SkillsMP API Key
        留空则保留已保存的 Key。
        {keyConfigured ? (
          <span className={`ml-1 font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>（当前已配置 Key）</span>
        ) : (
          <span className={`ml-1 ${textMuted(theme)}`}>（当前未配置 Key）</span>
        )}
      </p>

      <section>
        <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>来源与缓存</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>provider</label>
            <select
              className={inputCls}
              value={draft.provider ?? 'skillsmp'}
              onChange={(e) => updateDraft({ provider: e.target.value })}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>缓存 TTL（秒）</label>
            <input
              type="number"
              min={60}
              className={inputCls}
              value={draft.cacheTtlSeconds ?? 3600}
              onChange={(e) => updateDraft({ cacheTtlSeconds: Number(e.target.value) || 3600 })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`${labelCls} mb-1.5 block`}>镜像目录 URL（JSON）</label>
            <input
              className={inputCls}
              value={draft.mirrorCatalogUrl ?? ''}
              onChange={(e) => updateDraft({ mirrorCatalogUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>出站 HTTP 代理</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>主机</label>
            <input
              className={inputCls}
              value={draft.outboundHttpProxy?.host ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        outboundHttpProxy: {
                          ...prev.outboundHttpProxy,
                          host: e.target.value,
                          port: prev.outboundHttpProxy?.port ?? 0,
                        },
                      }
                    : prev,
                )
              }
              placeholder="127.0.0.1"
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>端口</label>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.outboundHttpProxy?.port ?? 0}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        outboundHttpProxy: {
                          ...prev.outboundHttpProxy,
                          host: prev.outboundHttpProxy?.host ?? '',
                          port: Number(e.target.value) || 0,
                        },
                      }
                    : prev,
                )
              }
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>GitHub ZIP 镜像</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>mode</label>
            <select
              className={inputCls}
              value={draft.githubZipMirror?.mode ?? 'none'}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        githubZipMirror: { ...prev.githubZipMirror, mode: e.target.value, prefix: prev.githubZipMirror?.prefix ?? '' },
                      }
                    : prev,
                )
              }
            >
              {ZIP_MIRROR_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>prefix</label>
            <input
              className={inputCls}
              value={draft.githubZipMirror?.prefix ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        githubZipMirror: {
                          mode: prev.githubZipMirror?.mode ?? 'none',
                          prefix: e.target.value,
                        },
                      }
                    : prev,
                )
              }
              placeholder="https://…"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>SkillsMP</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`flex items-center gap-2 sm:col-span-2 ${labelCls}`}>
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-sm"
              checked={sm.enabled !== false}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        skillsmp: { ...prev.skillsmp, enabled: e.target.checked },
                      }
                    : prev,
                )
              }
            />
            启用 SkillsMP 拉取
          </label>
          <div className="sm:col-span-2">
            <label className={`${labelCls} mb-1.5 block`}>API Key（留空不改）</label>
            <input
              type="password"
              className={inputCls}
              value={sm.apiKey ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        skillsmp: { ...prev.skillsmp, apiKey: e.target.value },
                      }
                    : prev,
                )
              }
              placeholder={keyConfigured ? '••••••••（留空保留）' : '粘贴 SkillsMP API Key'}
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`${labelCls} mb-1.5 block`}>baseUrl</label>
            <input
              className={inputCls}
              value={sm.baseUrl ?? ''}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        skillsmp: { ...prev.skillsmp, baseUrl: e.target.value },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>sortBy</label>
            <input
              className={inputCls}
              value={sm.sortBy ?? 'stars'}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        skillsmp: { ...prev.skillsmp, sortBy: e.target.value },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>默认分支</label>
            <input
              className={inputCls}
              value={sm.githubDefaultBranch ?? 'main'}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        skillsmp: { ...prev.skillsmp, githubDefaultBranch: e.target.value },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>每词条数上限</label>
            <input
              type="number"
              min={1}
              max={100}
              className={inputCls}
              value={sm.limitPerQuery ?? 100}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        skillsmp: { ...prev.skillsmp, limitPerQuery: Number(e.target.value) || 100 },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>最多查询词数</label>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={sm.maxQueriesPerRequest ?? 12}
              onChange={(e) =>
                setDraft((prev) =>
                  prev
                    ? {
                        ...prev,
                        skillsmp: { ...prev.skillsmp, maxQueriesPerRequest: Number(e.target.value) || 12 },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`${labelCls} mb-1.5 block`}>发现关键词（每行一条）</label>
            <textarea
              className={`${inputCls} min-h-[140px] font-mono text-xs`}
              value={queriesText}
              onChange={(e) => setQueriesText(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-sm font-semibold ${textPrimary(theme)}`}>静态条目 entries</h3>
          <button
            type="button"
            className={btnGhost(theme)}
            onClick={() =>
              setDraft((prev) =>
                prev ? { ...prev, entries: [...(prev.entries ?? []), emptyEntry()] } : prev,
              )
            }
          >
            <Plus size={14} />
            添加一行
          </button>
        </div>
        <div className="space-y-3">
          {(draft.entries ?? []).length === 0 ? (
            <p className={`text-sm ${textMuted(theme)}`}>暂无静态条目；merge/static 模式下可在此维护。</p>
          ) : (
            (draft.entries ?? []).map((row, idx) => (
              <div
                key={idx}
                className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-2 ${
                  isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <input
                  className={inputCls}
                  placeholder="id"
                  value={row.id ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const next = [...(prev.entries ?? [])];
                      next[idx] = { ...next[idx], id: v };
                      return { ...prev, entries: next };
                    });
                  }}
                />
                <input
                  className={inputCls}
                  placeholder="name"
                  value={row.name ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const next = [...(prev.entries ?? [])];
                      next[idx] = { ...next[idx], name: v };
                      return { ...prev, entries: next };
                    });
                  }}
                />
                <input
                  className={`${inputCls} sm:col-span-2`}
                  placeholder="packUrl"
                  value={row.packUrl ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const next = [...(prev.entries ?? [])];
                      next[idx] = { ...next[idx], packUrl: v };
                      return { ...prev, entries: next };
                    });
                  }}
                />
                <input
                  className={`${inputCls} sm:col-span-2`}
                  placeholder="summary（可选）"
                  value={row.summary ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraft((prev) => {
                      if (!prev) return prev;
                      const next = [...(prev.entries ?? [])];
                      next[idx] = { ...next[idx], summary: v };
                      return { ...prev, entries: next };
                    });
                  }}
                />
                <div className="flex justify-end sm:col-span-2">
                  <button
                    type="button"
                    className={btnGhost(theme)}
                    onClick={() =>
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const next = [...(prev.entries ?? [])];
                        next.splice(idx, 1);
                        return { ...prev, entries: next };
                      })
                    }
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              保存中…
            </>
          ) : (
            '保存配置'
          )}
        </button>
        <button type="button" className={btnGhost(theme)} disabled={saving} onClick={() => void load()}>
          重新加载
        </button>
      </div>
    </div>
  );
};
