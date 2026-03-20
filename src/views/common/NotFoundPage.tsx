import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center px-6">
        <h1 className="text-8xl font-bold text-slate-200 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">页面未找到</h2>
        <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
          您访问的页面不存在或已被移除，请检查地址是否正确。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
            返回上一页
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Home size={16} />
            回到首页
          </button>
        </div>
      </div>
    </div>
  );
};
