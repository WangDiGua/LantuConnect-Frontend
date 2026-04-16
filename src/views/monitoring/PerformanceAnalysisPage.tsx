import React, { useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PerformanceAnalysisPage: React.FC<Props> = ({ theme, fontSize }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`${buildPath('admin', 'monitoring-overview')}?tab=performance`, { replace: true });
  }, [navigate]);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BarChart3}
      breadcrumbSegments={['监控运维', '性能分析']}
      description="旧入口已合并到监控概览，正在为你跳转到新的性能分析标签。"
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">
        <PageSkeleton type="detail" rows={4} />
      </div>
    </MgmtPageShell>
  );
};
