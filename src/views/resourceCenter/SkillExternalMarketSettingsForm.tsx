import React, { useCallback, useEffect, useState } from 'react';
import type { Theme, FontSize } from '../../types';
import type {
  SkillExternalCatalogEntry,
  SkillExternalCatalogHttpSource,
  SkillExternalCatalogProperties,
} from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { LantuSelect } from '../../components/common/LantuSelect';
import { lantuRadioPrimaryClass, nativeInputClass } from '../../utils/formFieldClasses';
import { btnGhost, btnPrimary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onSaved?: () => void;
}

type SettingsTab = 'source' | 'skillhub' | 'skillsmp' | 'mirror' | 'static';

const TAB_DEF: { id: SettingsTab; label: string }[] = [
  { id: 'source', label: '生效方式' },
  { id: 'skillhub', label: 'SkillHub 搜索' },
  { id: 'skillsmp', label: 'SkillsMP' },
  { id: 'mirror', label: 'JSON / HTTP 镜像' },
  { id: 'static', label: '静态条目' },
];

/** 与后端 SkillsMpCatalogClient 默认 sortBy 及 stars→recent 重试一致 */
const SKILLSMP_SORT_BY_OPTIONS: { value: string; label: string }[] = [
  { value: 'stars', label: 'stars（按 Star，默认）' },
  { value: 'recent', label: 'recent（最近，备选请求）' },
];

const REMOTE_CATALOG_MODES: { value: string; label: string; hint: string }[] = [
  {
    value: 'MERGED',
    label: '多源合并',
    hint: 'SkillHub、SkillsMP、下方配置的 JSON/HTTP 镜像全部拉取后去重合并（默认，适合尽量多收录）',
  },
  {
    value: 'SKILLHUB_ONLY',
    label: '仅 SkillHub',
    hint:
      '只使用公开搜索 API（默认站点根 https://agentskillhub.dev，客户端会请求 /api/v1/search）。勿将 skillhub.tencent.com 官网根当作 API 地址。',
  },
  {
    value: 'SKILLSMP_ONLY',
    label: '仅 SkillsMP',
    hint: '只使用 SkillsMP；需 API Key，并在「SkillsMP」页开启',
  },
  {
    value: 'MIRROR_ONLY',
    label: '仅 JSON / HTTP 镜像',
    hint: '只使用镜像 URL 与 HTTP 目录源（skill0、自建 CDN 等）；不请求 SkillHub / SkillsMP',
  },
];

const PROVIDERS = [
  { value: 'skillsmp', label: 'skillsmp（远程目录 + 可同步到本地）' },
  { value: 'static', label: 'static（仅下方静态条目，无远程拉取）' },
  { value: 'merge', label: 'merge（静态条目 ∪ 远程目录）' },
];

const CATALOG_SOURCE_FORMATS = [
  { value: 'AUTO', label: 'AUTO' },
  { value: 'SKILL0', label: 'SKILL0' },
];

const ZIP_MIRROR_MODES = [
  { value: 'none', label: 'none' },
  { value: 'prefix-encoded', label: 'prefix-encoded' },
  { value: 'prefix-raw', label: 'prefix-raw' },
];

function emptyEntry(): SkillExternalCatalogEntry {
  return { id: '', name: '', summary: '', packUrl: '', licenseNote: '', sourceUrl: '' };
}

function emptyHttpSource(): SkillExternalCatalogHttpSource {
  return { url: '', format: 'AUTO' };
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
  const [mirrorUrlsText, setMirrorUrlsText] = useState('');
  const [skillHubQueriesText, setSkillHubQueriesText] = useState('');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('source');

  const load = useCallback(
    async (opts?: { keepVisible?: boolean }) => {
      const keepVisible = opts?.keepVisible === true;
      if (!keepVisible) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await resourceCenterService.getSkillExternalCatalogSettings();
        const cfg = res.config;
        setDraft({
          ...cfg,
          skillhub: cfg.skillhub ? { ...cfg.skillhub } : undefined,
          skillsmp: cfg.skillsmp ? { ...cfg.skillsmp } : undefined,
          outboundHttpProxy: cfg.outboundHttpProxy ? { ...cfg.outboundHttpProxy } : undefined,
          githubZipMirror: cfg.githubZipMirror ? { ...cfg.githubZipMirror } : undefined,
          entries: cfg.entries ? cfg.entries.map((e) => ({ ...e })) : undefined,
          catalogHttpSources: cfg.catalogHttpSources ? cfg.catalogHttpSources.map((s) => ({ ...s })) : undefined,
          mirrorCatalogUrls: cfg.mirrorCatalogUrls ? [...cfg.mirrorCatalogUrls] : undefined,
        });
        setKeyConfigured(res.skillsmpApiKeyConfigured);
        const q = cfg.skillsmp?.discoveryQueries ?? [];
        setQueriesText(q.join('\n'));
        setMirrorUrlsText((cfg.mirrorCatalogUrls ?? []).join('\n'));
        setSkillHubQueriesText((cfg.skillhub?.discoveryQueries ?? []).join('\n'));
      } catch (e) {
        const err = e instanceof Error ? e : new Error('加载配置失败');
        setError(err);
        setDraft(null);
        showMessage(err.message, 'error');
      } finally {
        if (!keepVisible) {
          setLoading(false);
        }
      }
    },
    [showMessage],
  );

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
    const mirrorCatalogUrls = mirrorUrlsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const catalogHttpSources = (draft.catalogHttpSources ?? []).filter((s) => (s.url ?? '').trim().length > 0);
    const skillHubQueryLines = skillHubQueriesText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 2);
    const payload: SkillExternalCatalogProperties = {
      ...draft,
      remoteCatalogMode: draft.remoteCatalogMode ?? 'MERGED',
      entries,
      mirrorCatalogUrls,
      catalogHttpSources,
      skillhub: {
        ...draft.skillhub,
        discoveryQueries: skillHubQueryLines,
      },
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
      await load({ keepVisible: true });
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
  const sh = draft.skillhub ?? {};
  const rcm = (draft.remoteCatalogMode ?? 'MERGED').toUpperCase();

  const tabBtn = (id: SettingsTab) => {
    const active = settingsTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setSettingsTab(id)}
        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? isDark
              ? 'bg-white/15 text-white'
              : 'bg-slate-900 text-white'
            : `${textMuted(theme)} hover:opacity-90`
        }`}
      >
        {TAB_DEF.find((t) => t.id === id)?.label}
      </button>
    );
  };

  return (
    <div className={`space-y-6 px-3 py-4 sm:px-4 ${densityClass}`}>
      <form className="contents" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
      <p className={`text-sm ${textMuted(theme)}`}>
        按标签页分市场配置；<strong>「生效方式」</strong>决定列表<strong>实际使用哪一类远程源</strong>（单选 SkillHub / SkillsMP / 镜像 / 或全部合并）。静态条目仅在
        provider 为 merge 或 static 时参与展示。配置写入数据库后覆盖{' '}
        <code className="text-xs opacity-90">application.yml</code> 中的 <code className="text-xs opacity-90">lantu.skill-external-catalog</code>。SkillsMP Key 留空保留原值。
        {keyConfigured ? (
          <span className={`ml-1 font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>（已配置 Key）</span>
        ) : (
          <span className={`ml-1 ${textMuted(theme)}`}>（未配置 Key）</span>
        )}
      </p>

      <div
        className={`flex flex-wrap gap-2 border-b pb-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}
      >
        {TAB_DEF.map((t) => tabBtn(t.id))}
      </div>

      {settingsTab === 'source' && (
        <section className="space-y-6">
          <div>
            <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>远程目录用哪个源</h3>
            <div className="grid gap-3">
              {REMOTE_CATALOG_MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
                    isDark ? 'border-white/[0.1] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <input
                    type="radio"
                    className={`mt-1 ${lantuRadioPrimaryClass}`}
                    name="remoteCatalogMode"
                    checked={rcm === m.value}
                    onChange={() => updateDraft({ remoteCatalogMode: m.value })}
                  />
                  <div>
                    <div className={`font-medium ${textPrimary(theme)}`}>{m.label}</div>
                    <p className={`mt-1 text-xs leading-relaxed ${textMuted(theme)}`}>{m.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
            <h4 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>provider（与同步策略）</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={`${labelCls} mb-1.5 block`}>provider</label>
                <LantuSelect
                  theme={theme}
                  value={draft.provider ?? 'skillsmp'}
                  onChange={(v) => updateDraft({ provider: v })}
                  options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
                />
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
              <label className={`flex items-center gap-2 self-end sm:col-span-2 ${labelCls}`}>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={draft.persistenceEnabled !== false}
                  onChange={(e) => updateDraft({ persistenceEnabled: e.target.checked })}
                />
                将远程结果同步为本地镜像
              </label>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
            <h4 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>出站 HTTP 代理（各远程源共用）</h4>
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
          </div>
        </section>
      )}

      {settingsTab === 'skillhub' && (
        <section>
          <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>SkillHub（公开搜索 API）</h3>
          <p className={`mb-4 text-sm ${textMuted(theme)}`}>
            与 Agent Skill Hub 协议兼容（无需 Key）。仅当「生效方式」为「多源合并」或「仅 SkillHub」时参与列表。
            <span className="block mt-1">
              站点根请用可返回 JSON 的地址（默认 <code className="text-xs opacity-90">https://agentskillhub.dev</code>
              ）；<strong className="font-medium">不要填 skillhub.tencent.com 官网根</strong>
              ，否则 Request 只会拿到 HTML。
            </span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`flex items-center gap-2 sm:col-span-2 ${labelCls}`}>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={sh.enabled !== false}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, skillhub: { ...prev.skillhub, enabled: e.target.checked } } : prev,
                  )
                }
              />
              启用 SkillHub（/api/v1/search，单请求最多 10 条）
            </label>
            <div className="sm:col-span-2">
              <label className={`${labelCls} mb-1.5 block`}>站点根 URL（将拼接 /api/v1/search）</label>
              <input
                className={inputCls}
                value={sh.baseUrl ?? 'https://agentskillhub.dev'}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, skillhub: { ...prev.skillhub, baseUrl: e.target.value } } : prev,
                  )
                }
                placeholder="https://agentskillhub.dev"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`${labelCls} mb-1.5 block`}>备用站点根（可选）</label>
              <input
                className={inputCls}
                value={sh.fallbackBaseUrl ?? ''}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, skillhub: { ...prev.skillhub, fallbackBaseUrl: e.target.value } } : prev,
                  )
                }
                placeholder="https://agentskillhub.dev"
              />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>每词上限（≤10）</label>
              <input
                type="number"
                min={1}
                max={10}
                className={inputCls}
                value={sh.limitPerQuery ?? 10}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? { ...prev, skillhub: { ...prev.skillhub, limitPerQuery: Number(e.target.value) || 10 } }
                      : prev,
                  )
                }
              />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>最多搜索词数</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={sh.maxQueriesPerRequest ?? 12}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          skillhub: { ...prev.skillhub, maxQueriesPerRequest: Number(e.target.value) || 12 },
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`${labelCls} mb-1.5 block`}>GitHub ZIP 直链推导用分支</label>
              <input
                className={inputCls}
                value={sh.githubDefaultBranch ?? 'main'}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? { ...prev, skillhub: { ...prev.skillhub, githubDefaultBranch: e.target.value } }
                      : prev,
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`${labelCls} mb-1.5 block`}>发现关键词（每行，≥2 字符；留空则服务端内置）</label>
              <AutoHeightTextarea
                minRows={10}
                maxRows={32}
                className={`${inputCls} font-mono text-xs resize-none`}
                value={skillHubQueriesText}
                onChange={(e) => setSkillHubQueriesText(e.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      {settingsTab === 'skillsmp' && (
        <section>
          <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>SkillsMP</h3>
          <p className={`mb-4 text-sm ${textMuted(theme)}`}>
            仅当「生效方式」为「多源合并」或「仅 SkillsMP」时参与列表；需有效 API Key。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`flex items-center gap-2 sm:col-span-2 ${labelCls}`}>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={sm.enabled === true}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, skillsmp: { ...prev.skillsmp, enabled: e.target.checked } } : prev,
                  )
                }
              />
              启用 SkillsMP
            </label>
            <div className="sm:col-span-2">
              <label className={`${labelCls} mb-1.5 block`}>API Key（留空不改）</label>
              <input
                type="password"
                className={inputCls}
                value={sm.apiKey ?? ''}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, skillsmp: { ...prev.skillsmp, apiKey: e.target.value } } : prev,
                  )
                }
                placeholder={keyConfigured ? '••••••••（留空保留已保存的 Key）' : '粘贴 SkillsMP API Key'}
                autoComplete="off"
              />
              {keyConfigured ? (
                <p className={`mt-1.5 text-xs leading-relaxed ${textMuted(theme)}`}>
                  当前已在服务端保存 Key（GET 接口为安全不回显明文，故 JSON 里 <code className="font-mono">apiKey</code>{' '}
                  为空属正常）。更换时请直接粘贴新 Key 并保存；留空再保存表示继续沿用已保存的 Key。
                </p>
              ) : (
                <p className={`mt-1.5 text-xs leading-relaxed ${textMuted(theme)}`}>
                  首次保存或更换 Key 时请在此粘贴完整 SkillsMP API Key；保存后由服务端安全存储，刷新或下次打开本页即可继续沿用。
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={`${labelCls} mb-1.5 block`}>baseUrl</label>
              <input
                className={inputCls}
                value={sm.baseUrl ?? ''}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, skillsmp: { ...prev.skillsmp, baseUrl: e.target.value } } : prev,
                  )
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`${labelCls} mb-1.5 block`}>排序（sortBy）</label>
              <LantuSelect
                theme={theme}
                triggerClassName={INPUT_FOCUS}
                value={(sm.sortBy ?? 'stars').trim() || 'stars'}
                onChange={(v) =>
                  setDraft((prev) => (prev ? { ...prev, skillsmp: { ...prev.skillsmp, sortBy: v } } : prev))
                }
                options={(() => {
                  const cur = (sm.sortBy ?? 'stars').trim() || 'stars';
                  const preset = [...SKILLSMP_SORT_BY_OPTIONS];
                  if (cur && !preset.some((o) => o.value === cur)) {
                    return [{ value: cur, label: `${cur}（当前配置，自定义）` }, ...preset];
                  }
                  return preset;
                })()}
              />
              <p className={`mt-1.5 text-xs ${textMuted(theme)}`}>
                与网关 SkillsMP 客户端约定一致；其它值会原样作为查询参数发送（仅当库里已是自定义值时会出现首项）。
              </p>
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>默认分支</label>
              <input
                className={inputCls}
                value={sm.githubDefaultBranch ?? 'main'}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? { ...prev, skillsmp: { ...prev.skillsmp, githubDefaultBranch: e.target.value } }
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
                      ? { ...prev, skillsmp: { ...prev.skillsmp, limitPerQuery: Number(e.target.value) || 100 } }
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
              <AutoHeightTextarea
                minRows={10}
                maxRows={32}
                className={`${inputCls} font-mono text-xs resize-none`}
                value={queriesText}
                onChange={(e) => setQueriesText(e.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      {settingsTab === 'mirror' && (
        <section className="space-y-8">
          <div>
            <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>JSON / HTTP 镜像</h3>
            <p className={`mb-4 text-sm ${textMuted(theme)}`}>
              仅当「多源合并」或「仅 JSON / HTTP 镜像」时参与列表。支持 skill0、自建 CDN 等可 GET 的 JSON。
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={`${labelCls} mb-1.5 block`}>镜像目录 URL（单个）</label>
                <input
                  className={inputCls}
                  value={draft.mirrorCatalogUrl ?? ''}
                  onChange={(e) => updateDraft({ mirrorCatalogUrl: e.target.value })}
                  placeholder="https://…/skills.json"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={`${labelCls} mb-1.5 block`}>附加 URL（每行一个）</label>
                <AutoHeightTextarea
                  minRows={6}
                  maxRows={24}
                  className={`${inputCls} font-mono text-xs resize-none`}
                  value={mirrorUrlsText}
                  onChange={(e) => setMirrorUrlsText(e.target.value)}
                  placeholder="https://skill0.atypica.ai/api/skills"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className={`text-sm font-semibold ${textPrimary(theme)}`}>HTTP 目录源（URL + format）</h4>
              <button
                type="button"
                className={btnGhost(theme)}
                onClick={() =>
                  setDraft((prev) =>
                    prev ? { ...prev, catalogHttpSources: [...(prev.catalogHttpSources ?? []), emptyHttpSource()] } : prev,
                  )
                }
              >
                <Plus size={14} />
                添加
              </button>
            </div>
            <div className="space-y-3">
              {(draft.catalogHttpSources ?? []).length === 0 ? (
                <p className={`text-sm ${textMuted(theme)}`}>无显式源时可仅用上方多行 URL。</p>
              ) : (
                (draft.catalogHttpSources ?? []).map((row, idx) => (
                  <div
                    key={idx}
                    className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto] ${
                      isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <input
                      className={inputCls}
                      placeholder="https://…"
                      value={row.url ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((prev) => {
                          if (!prev) return prev;
                          const next = [...(prev.catalogHttpSources ?? [])];
                          next[idx] = { ...next[idx], url: v };
                          return { ...prev, catalogHttpSources: next };
                        });
                      }}
                    />
                    <LantuSelect
                      theme={theme}
                      className="min-w-[6.5rem] sm:min-w-[7rem]"
                      value={(row.format ?? 'AUTO').toUpperCase()}
                      onChange={(v) => {
                        setDraft((prev) => {
                          if (!prev) return prev;
                          const next = [...(prev.catalogHttpSources ?? [])];
                          next[idx] = { ...next[idx], format: v };
                          return { ...prev, catalogHttpSources: next };
                        });
                      }}
                      options={CATALOG_SOURCE_FORMATS.map((f) => ({ value: f.value, label: f.label }))}
                      chevronSize={14}
                    />
                    <div className="flex justify-end sm:justify-center">
                      <button
                        type="button"
                        className={btnGhost(theme)}
                        onClick={() =>
                          setDraft((prev) => {
                            if (!prev) return prev;
                            const next = [...(prev.catalogHttpSources ?? [])];
                            next.splice(idx, 1);
                            return { ...prev, catalogHttpSources: next };
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>GitHub ZIP 镜像前缀</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={`${labelCls} mb-1.5 block`}>mode</label>
                <LantuSelect
                  theme={theme}
                  value={draft.githubZipMirror?.mode ?? 'none'}
                  onChange={(v) =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            githubZipMirror: {
                              ...prev.githubZipMirror,
                              mode: v,
                              prefix: prev.githubZipMirror?.prefix ?? '',
                            },
                          }
                        : prev,
                    )
                  }
                  options={ZIP_MIRROR_MODES.map((m) => ({ value: m.value, label: m.label }))}
                />
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
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {settingsTab === 'static' && (
        <section>
          <h3 className={`mb-3 text-sm font-semibold ${textPrimary(theme)}`}>静态条目 entries</h3>
          <p className={`mb-4 text-sm ${textMuted(theme)}`}>在 provider=static 或 merge 时与远程列表合并（远程由「生效方式」决定）。</p>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              className={btnGhost(theme)}
              onClick={() =>
                setDraft((prev) => (prev ? { ...prev, entries: [...(prev.entries ?? []), emptyEntry()] } : prev))
              }
            >
              <Plus size={14} />
              添加一行
            </button>
          </div>
          <div className="space-y-3">
            {(draft.entries ?? []).length === 0 ? (
              <p className={`text-sm ${textMuted(theme)}`}>暂无条目</p>
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
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
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
      </form>
    </div>
  );
};
