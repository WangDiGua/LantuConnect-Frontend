import React from 'react';
import type { Theme, FontSize } from '../../types';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';

export interface AgentReviewsProps {
  agentId: number;
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AgentReviews: React.FC<AgentReviewsProps> = ({ agentId, theme, showMessage }) => {
  return <ResourceReviewsSection targetType="agent" targetId={agentId} theme={theme} showMessage={showMessage} />;
};
