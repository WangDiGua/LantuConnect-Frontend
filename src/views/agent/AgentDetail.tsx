import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  Zap, 
  FileText, 
  Play, 
  Edit2, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart3,
  ShieldCheck,
  Code2
} from 'lucide-react';
import { Theme, FontSize } from '../../types';

interface AgentDetailProps {
  agentId: string;
  theme: Theme;
  fontSize: FontSize;
  onBack: () => void;
}

export const AgentDetail: React.FC<AgentDetailProps> = ({ agentId, theme, fontSize, onBack }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (agentId === 'error') {
        setError('无法加载 Agent 详情，请稍后重试。');
      } else {
        setLoading(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [agentId]);

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-slate-500 animate-pulse">正在加载 Agent 详情...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">加载失败</h3>
        <p className="text-slate-500 mb-6 max-w-md">{error}</p>
        <button type="button" onClick={onBack} className="btn btn-primary shadow-lg shadow-blue-500/20">
          返回列表页
        </button>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
      isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
    }`}>
      {/* Header：扁平顶栏，与创建页一致 */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl text-white shadow-none border border-blue-500/30 shrink-0">
              🎓
            </div>
            <div>
              <h2 className="text-xl font-bold">学生办事助手</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="badge badge-success badge-sm font-bold text-[10px]">已发布</div>
                <span className="text-xs text-slate-500">ID: {agentId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="btn btn-ghost btn-sm gap-2">
            <Play size={16} />
            <span>测试</span>
          </button>
          <button type="button" className="btn btn-ghost btn-sm gap-2">
            <Edit2 size={16} />
            <span>编辑</span>
          </button>
          <button type="button" className="btn btn-error btn-sm btn-outline gap-2">
            <Trash2 size={16} />
            <span>删除</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3 grid grid-cols-1 lg:grid-cols-3 gap-6 content-start">
        {/* Left Column: Info & Config */}
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
                  <label className="text-xs text-slate-500 block mb-1">Agent 名称</label>
                  <p className="font-medium">学生办事助手</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">运行角色</label>
                  <p className="font-medium">工具型</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">Agent 描述</label>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    提供学生日常事务咨询与办理引导，包括请假、成绩查询、奖学金申请等教务与生活服务。
                    通过对接教务系统 API，实现实时数据查询与自动化流程处理。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Settings size={18} className="text-purple-500" />
                配置详情
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">REST API 接口</p>
                      <p className="text-xs text-slate-500">https://api.school.edu/v1/student/services</p>
                    </div>
                  </div>
                  <div className="badge badge-outline badge-sm">GET</div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-xl">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">身份验证</p>
                      <p className="text-xs text-slate-500">Bearer Token (已加密)</p>
                    </div>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 rounded-xl">
                      <Code2 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">超时设置</p>
                      <p className="text-xs text-slate-500">连接超时: 5s | 响应超时: 30s</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Meta */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-500" />
                运行统计
              </h3>
              <div className="space-y-6">
                <div className="stats stats-vertical w-full bg-transparent shadow-none">
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">累计调用量</div>
                    <div className="stat-value text-2xl text-blue-600">1.25万</div>
                    <div className="stat-desc">较上周 +12%</div>
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">平均成功率</div>
                    <div className="stat-value text-2xl text-emerald-500">98.5%</div>
                    <progress className="progress progress-success w-full mt-2" value="98.5" max="100"></progress>
                  </div>
                  <div className="stat px-0 py-2">
                    <div className="stat-title text-xs">平均响应时间</div>
                    <div className="stat-value text-2xl text-orange-500">245ms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                时间信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">创建时间</span>
                  <span className="font-mono">2024-03-15 10:30</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">最后更新</span>
                  <span className="font-mono">2024-03-18 14:20</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">最后调用</span>
                  <span className="font-mono">5分钟前</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
