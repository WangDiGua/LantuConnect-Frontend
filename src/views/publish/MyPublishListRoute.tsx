import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import { MyResourcePublishListPage } from './MyResourcePublishListPage';
import { getMyPublishListConfig } from './myPublishListConfigs';

const PAGE_TO_TYPE: Record<string, ResourceType> = {
  'my-publish-agent': 'agent',
  'my-publish-skill': 'skill',
  'my-publish-mcp': 'mcp',
  'my-publish-app': 'app',
  'my-publish-dataset': 'dataset',
};

interface Props {
  theme: Theme;
  fontSize: FontSize;
  page: string;
}

export const MyPublishListRoute: React.FC<Props> = ({ theme, fontSize, page }) => {
  const navigate = useNavigate();
  const resourceType = PAGE_TO_TYPE[page];
  const config = useMemo(
    () => (resourceType ? getMyPublishListConfig(resourceType, navigate) : null),
    [resourceType, navigate],
  );
  if (!resourceType || !config) return null;
  return <MyResourcePublishListPage theme={theme} fontSize={fontSize} resourceType={resourceType} config={config} />;
};
