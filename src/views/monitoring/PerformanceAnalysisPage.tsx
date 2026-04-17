import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { PerformanceAnalysisPanel } from './PerformanceAnalysisPanel';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PerformanceAnalysisPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BarChart3}
      breadcrumbSegments={['监控运维', '性能分析中心']}
      description="性能分析中心聚焦窗口、资源和方法维度的排查闭环：成功率、延迟分位、资源排行、方法排行、质量历史和最近调用都在这里完成。"
      contentScroll="document"
    >
      <div className="px-4 pb-8 sm:px-6">
        <PerformanceAnalysisPanel theme={theme} showMessage={showMessage} />
      </div>
    </MgmtPageShell>
  );
};
