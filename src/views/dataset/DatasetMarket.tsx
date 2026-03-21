import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Database,
  FileText,
  Table2,
  Image,
  Mic,
  Video,
  Layers,
  HardDrive,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Dataset, DatasetSourceType, DatasetDataType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const SOURCE_TABS: { value: DatasetSourceType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'department', label: '部门数据' },
  { value: 'knowledge', label: '知识库' },
  { value: 'third_party', label: '第三方' },
];

const SOURCE_BADGE: Record<DatasetSourceType, { label: string; cls: string }> = {
  department: { label: '部门数据', cls: 'text-blue-600 bg-blue-500/10' },
  knowledge: { label: '知识库', cls: 'text-emerald-600 bg-emerald-500/10' },
  third_party: { label: '第三方', cls: 'text-amber-600 bg-amber-500/10' },
};

const DATA_TYPE_BADGE: Record<DatasetDataType, { label: string; cls: string }> = {
  document: { label: '文档', cls: 'text-slate-600 bg-slate-500/10' },
  structured: { label: '结构化', cls: 'text-indigo-600 bg-indigo-500/10' },
  image: { label: '图像', cls: 'text-pink-600 bg-pink-500/10' },
  audio: { label: '音频', cls: 'text-orange-600 bg-orange-500/10' },
  video: { label: '视频', cls: 'text-red-600 bg-red-500/10' },
  mixed: { label: '混合', cls: 'text-violet-600 bg-violet-500/10' },
};

const DATA_TYPE_ICON: Record<DatasetDataType, React.ElementType> = {
  document: FileText,
  structured: Table2,
  image: Image,
  audio: Mic,
  video: Video,
  mixed: Layers,
};

const ICON_COLORS: Record<DatasetDataType, string> = {
  document: 'bg-slate-500',
  structured: 'bg-indigo-500',
  image: 'bg-pink-500',
  audio: 'bg-orange-500',
  video: 'bg-red-500',
  mixed: 'bg-violet-500',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}

export const DatasetMarket: React.FC<Props> = ({ theme, fontSize: _fontSize, themeColor: _themeColor, showMessage }) => {
  const dark = theme === 'dark';
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sourceFilter, setSourceFilter] = useState<DatasetSourceType | ''>('');
  const [detailDataset, setDetailDataset] = useState<Dataset | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    datasetService
      .list({ status: 'published', pageSize: 100 })
      .then((res) => { if (!cancelled) setDatasets(res.list); })
      .catch(() => { if (!cancelled) showMessage?.('加载数据集失败', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [showMessage]);

  const filtered = useMemo(() => {
    let list = datasets;
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      list = list.filter(
        (d) =>
          d.displayName.toLowerCase().includes(kw) ||
          d.datasetName.toLowerCase().includes(kw) ||
          d.description.toLowerCase().includes(kw) ||
          d.tags.some((t) => t.toLowerCase().includes(kw))
      );
    }
    if (sourceFilter) {
      list = list.filter((d) => d.sourceType === sourceFilter);
    }
    return list;
  }, [datasets, keyword, sourceFilter]);

  const inputCls = nativeInputClass(theme);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${dark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Database className="text-emerald-500" size={22} />
            <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>数据集广场</h1>
            {datasets.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {datasets.length}
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索数据集…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={`${inputCls} !pl-9`}
            />
          </div>
        </div>

        {/* Source filter tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSourceFilter(tab.value)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                sourceFilter === tab.value
                  ? 'bg-emerald-600 text-white'
                  : dark
                    ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="loading loading-spinner loading-lg text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className={`text-lg font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>暂无匹配的数据集</p>
            <p className={`text-sm mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>尝试调整搜索关键词或分类筛选</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((ds) => {
              const srcBadge = SOURCE_BADGE[ds.sourceType];
              const dtBadge = DATA_TYPE_BADGE[ds.dataType];
              const IconComp = DATA_TYPE_ICON[ds.dataType] ?? FileText;
              const iconColor = ICON_COLORS[ds.dataType] ?? 'bg-slate-500';
              return (
                <div
                  key={ds.id}
                  className={`rounded-2xl border p-5 transition-colors ${
                    dark
                      ? 'bg-[#1C1C1E] border-white/10 hover:bg-[#2C2C2E]'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${iconColor}`}>
                      <IconComp size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-semibold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                        {ds.displayName}
                      </h3>
                    </div>
                  </div>

                  <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {ds.description || '暂无描述'}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${srcBadge.cls}`}>
                      {srcBadge.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${dtBadge.cls}`}>
                      {dtBadge.label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                      dark ? 'text-slate-300 bg-white/5' : 'text-slate-600 bg-slate-100'
                    }`}>
                      {ds.format.toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className={`flex items-center gap-4 text-xs mb-3 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="flex items-center gap-1">
                      <HardDrive size={12} />
                      {formatFileSize(ds.fileSize)}
                    </span>
                    <span>{formatCount(ds.recordCount)} 条记录</span>
                  </div>

                  {/* Tags */}
                  {ds.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ds.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            dark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                      {ds.tags.length > 4 && (
                        <span className={`text-[10px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                          +{ds.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`flex items-center justify-end pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setDetailDataset(ds)}
                      className="btn btn-primary btn-xs rounded-xl shadow-none"
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 数据集详情弹窗 */}
      <Modal
        open={!!detailDataset}
        onClose={() => setDetailDataset(null)}
        title={detailDataset?.displayName ?? ''}
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setDetailDataset(null)}>
              关闭
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => { showMessage?.('申请已提交，等待审批', 'success'); setDetailDataset(null); }}
            >
              申请使用
            </button>
          </>
        }
      >
        {detailDataset && (() => {
          const ds = detailDataset;
          const srcBadge = SOURCE_BADGE[ds.sourceType];
          const dtBadge = DATA_TYPE_BADGE[ds.dataType];
          return (
            <div className="space-y-4">
              <p className={`text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                {ds.description || '暂无描述'}
              </p>

              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${srcBadge.cls}`}>
                  {srcBadge.label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${dtBadge.cls}`}>
                  {dtBadge.label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                  dark ? 'text-slate-300 bg-white/5' : 'text-slate-600 bg-slate-100'
                }`}>
                  {ds.format.toUpperCase()}
                </span>
              </div>

              <div className={`grid grid-cols-2 gap-3 rounded-xl border p-4 ${
                dark ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div>
                  <div className={`text-[11px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>记录数</div>
                  <div className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{formatCount(ds.recordCount)}</div>
                </div>
                <div>
                  <div className={`text-[11px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>文件大小</div>
                  <div className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{formatFileSize(ds.fileSize)}</div>
                </div>
              </div>

              {ds.tags.length > 0 && (
                <div>
                  <div className={`text-xs font-semibold mb-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>标签</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ds.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          dark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
