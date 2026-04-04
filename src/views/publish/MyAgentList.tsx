import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { MyResourcePublishListPage } from './MyResourcePublishListPage';
import { getMyPublishListConfig } from './myPublishListConfigs';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

export const MyAgentList: React.FC<Props> = ({ theme, fontSize }) => {
  const navigate = useNavigate();
  const config = useMemo(() => getMyPublishListConfig('agent', navigate), [navigate]);
  return <MyResourcePublishListPage theme={theme} fontSize={fontSize} resourceType="agent" config={config} />;
};
