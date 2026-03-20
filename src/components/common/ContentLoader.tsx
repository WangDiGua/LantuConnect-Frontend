import React from 'react';

interface ContentLoaderProps {
  theme?: 'light' | 'dark';
  loading?: boolean;
  children?: React.ReactNode;
}

export const ContentLoader: React.FC<ContentLoaderProps> = ({ 
  theme = 'light',
  loading = false,
  children 
}) => {
  const isDark = theme === 'dark';
  
  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center min-h-[400px] ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className={`w-8 h-8 border-2 rounded-full ${
              isDark ? 'border-white/20' : 'border-slate-300'
            }`}>
              <div className={`absolute top-0 left-0 w-full h-full border-2 rounded-full border-transparent ${
                isDark ? 'border-t-white/60' : 'border-t-blue-500'
              } animate-spin`} />
            </div>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            加载中...
          </p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};
