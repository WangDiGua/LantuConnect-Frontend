import React, { useState, useMemo } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_PUBLISH_LIST, PublishApplication } from '../../constants/tools';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { Pagination } from '../../components/common/Pagination';

interface PublishMcpServerPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAGE_SIZE = 20;

const statusStyle = (s: PublishApplication['status'], isDark: boolean) => {
  switch (s) {
    case '已上架':
      return isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
    case '审核中':
      return isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-700';
    case '已驳回':
      return isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-700';
    default:
      return isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-600';
  }
};

export const PublishMcpServerPage: React.FC<PublishMcpServerPageProps> = ({
  theme,
  fontSize,
  showMessage,
}) => {
  const isDark = theme === 'dark';
  const [list, setList] = useState<PublishApplication[]>(() => [...MOCK_PUBLISH_LIST]);
  const [name, setName] = useState('');
  const [transport, setTransport] = useState('stdio');
  const [readme, setReadme] = useState('');
  const [page, setPage] = useState(1);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showMessage('请填写服务名称', 'error');
      return;
    }
    const id = `p-${Date.now()}`;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setList((prev) => [
      {
        id,
        serverName: name.trim(),
        transport,
        submittedAt: now,
        status: '审核中',
      },
      ...prev,
    ]);
    setName('');
    setReadme('');
    showMessage('上架申请已提交，等待审核（演示）', 'success');
  };

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, page]);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['工具广场', '上架 MCP Server']}
      titleIcon={UploadCloud}
      description="提交 MCP Server 元数据与说明，审核通过后将出现在工具发现（演示流程）"
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1 space-y-8">
        <form
          onSubmit={submit}
          className={`rounded-2xl border p-5 sm:p-6 max-w-2xl ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200/80 bg-slate-50/50'}`}
        >
          <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FileText size={18} className="text-blue-500" />
            新建上架申请
          </h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                服务标识名
              </label>
              <input
                className={nativeInputClass(theme)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如 campus-bus-mcp"
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                传输方式
              </label>
              <select className={nativeSelectClass(theme)} value={transport} onChange={(e) => setTransport(e.target.value)}>
                <option value="stdio">stdio</option>
                <option value="sse">SSE</option>
                <option value="streamable-http">Streamable HTTP</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                说明 / README 摘要
              </label>
              <textarea
                className={`${nativeInputClass(theme)} min-h-[100px]`}
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                placeholder="工具能力、依赖与安全注意事项…"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              提交审核
            </button>
          </div>
        </form>

        <div>
          <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>申请记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <th className="py-2.5 text-left font-semibold">服务名</th>
                  <th className="py-2.5 text-left font-semibold">传输</th>
                  <th className="py-2.5 text-left font-semibold">提交时间</th>
                  <th className="py-2.5 text-left font-semibold">状态</th>
                  <th className="py-2.5 text-left font-semibold">备注</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id} className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <td className="py-3 font-medium">{p.serverName}</td>
                    <td className="py-3 font-mono text-xs">{p.transport}</td>
                    <td className="py-3 text-slate-500">{p.submittedAt}</td>
                    <td className="py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${statusStyle(p.status, isDark)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 text-xs max-w-[200px] truncate" title={p.remark}>
                      {p.remark ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length > 0 && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={list.length} onChange={setPage} />
          )}
        </div>
      </div>
    </MgmtPageShell>
  );
};
