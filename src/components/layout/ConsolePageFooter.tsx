import React from 'react';
import { Link } from 'react-router-dom';
import type { Theme } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';

/** 与界面主品牌一致（顶栏 / 探索 Hero） */
const PRODUCT_NAME = 'Nexus';

const linkClass = (isDark: boolean) =>
  `text-[11px] font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 rounded-sm ${
    isDark
      ? 'text-slate-400 hover:text-slate-200 focus-visible:ring-offset-transparent'
      : 'text-slate-500 hover:text-slate-900 focus-visible:ring-offset-transparent'
  }`;

export interface ConsolePageFooterProps {
  theme: Theme;
  /** 与主内容区一致的横向 padding，通常为 `mainScrollPadX` */
  className?: string;
}

export const ConsolePageFooter: React.FC<ConsolePageFooterProps> = ({ theme, className = '' }) => {
  const isDark = theme === 'dark';
  const year = new Date().getFullYear();
  const muted = isDark ? 'text-slate-500' : 'text-slate-500';
  const dot = <span className={`select-none px-0.5 ${isDark ? 'text-slate-600' : 'text-slate-200'}`} aria-hidden>·</span>;

  return (
    <footer
      role="contentinfo"
      aria-label="页面页脚"
      className={`w-full max-w-none shrink-0 border-t border-solid py-2 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'} ${className}`}
    >
      <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-1">
        <div className="min-w-0">
          <span className={`text-xs font-semibold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {PRODUCT_NAME}
          </span>
          <span className={`text-[11px] leading-snug ${muted}`}>
            {' '}
            © {year} {PRODUCT_NAME}。保留所有权利。校园数字化能力与资产门户 · 授权访问与合规使用
          </span>
        </div>

        <nav aria-label="页脚导航" className="flex min-w-0 flex-col gap-0.5 md:flex-row md:flex-wrap md:items-center md:justify-end">
          <div className="flex flex-wrap items-center gap-y-0.5">
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
        </nav>
      </div>
      <p className={`mt-1 max-w-4xl text-[10px] leading-snug md:text-right md:ml-auto ${muted}`}>
        用户协议与隐私政策以学校及平台公示为准；技术支持与合规咨询请联系学校信息化管理部门。
      </p>
    </footer>
  );
};

ConsolePageFooter.displayName = 'ConsolePageFooter';
