import React from 'react';
import { Link } from 'react-router-dom';
import type { Theme } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';

/** 与界面主品牌一致（顶栏 / 探索 Hero） */
const PRODUCT_NAME = 'Nexus';

const linkClass = (isDark: boolean) =>
  `text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 rounded-sm ${
    isDark
      ? 'text-slate-400 hover:text-slate-200 focus-visible:ring-offset-transparent'
      : 'text-slate-500 hover:text-slate-900 focus-visible:ring-offset-transparent'
  }`;

export interface ConsolePageFooterProps {
  theme: Theme;
  /** 与主内容区一致的横向 padding 容器类名，例如 ExploreHub 的 pageContainer */
  className?: string;
}

export const ConsolePageFooter: React.FC<ConsolePageFooterProps> = ({ theme, className = '' }) => {
  const isDark = theme === 'dark';
  const year = new Date().getFullYear();
  const muted = isDark ? 'text-slate-500' : 'text-slate-500';
  const dot = <span className={`select-none px-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} aria-hidden>·</span>;

  return (
    <footer
      role="contentinfo"
      aria-label="页面页脚"
      className={`mt-14 border-t pt-8 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/90'} ${className}`}
    >
      <div className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className={`text-sm font-semibold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {PRODUCT_NAME}
          </p>
          <p className={`text-xs leading-relaxed ${muted}`}>
            © {year} {PRODUCT_NAME}。保留所有权利。
          </p>
          <p className={`text-[11px] leading-snug ${muted}`}>
            校园数字化能力与资产门户 · 按权访问与合规使用
          </p>
        </div>

        <nav aria-label="页脚导航" className="flex min-w-0 flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-y-2 sm:justify-end">
            <Link to={buildPath('user', 'api-docs')} className={linkClass(isDark)}>
              接入文档
            </Link>
            {dot}
            <Link to={buildPath('user', 'sdk-download')} className={linkClass(isDark)}>
              SDK 下载
            </Link>
            {dot}
            <Link to={buildPath('user', 'api-playground')} className={linkClass(isDark)}>
              API Playground
            </Link>
            {dot}
            <Link to={buildPath('user', 'resource-center')} className={linkClass(isDark)}>
              资源中心
            </Link>
          </div>
          <p className={`max-w-md text-left text-[11px] leading-snug sm:max-w-sm sm:text-right ${muted}`}>
            用户协议与隐私政策以学校及平台公示为准；如需技术支持或合规咨询，请联系学校信息化管理部门。
          </p>
        </nav>
      </div>
    </footer>
  );
};

ConsolePageFooter.displayName = 'ConsolePageFooter';
