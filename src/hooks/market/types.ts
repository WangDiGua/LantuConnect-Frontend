import type { Theme, FontSize, ThemeColor } from '../../types';

export type ResourceType = 'agent' | 'skill' | 'mcp' | 'app' | 'dataset';

export type MarketSortOption = 'hot' | 'rating' | 'new';

export interface MarketBaseItem {
  id: string | number;
  displayName: string;
  description?: string;
  tags?: string[];
  status?: string;
  callCount?: number;
  qualityScore?: number;
  createTime?: string;
}

export interface MarketListParams {
  status?: string;
  pageSize?: number;
  page?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
}

export interface MarketListResult<T extends MarketBaseItem> {
  list: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface MarketService<T extends MarketBaseItem> {
  list(params: MarketListParams): Promise<MarketListResult<T>>;
  getById?(id: number): Promise<T>;
}

export interface UseMarketListOptions<T extends MarketBaseItem> {
  resourceType: ResourceType;
  service: MarketService<T>;
  pageSize?: number;
  autoLoad?: boolean;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface UseMarketListReturn<T extends MarketBaseItem> {
  items: T[];
  loading: boolean;
  error: Error | null;
  keyword: string;
  setKeyword: (keyword: string) => void;
  page: number;
  setPage: (page: number) => void;
  total: number;
  refresh: () => void;
  hasMore: boolean;
}

export interface UseMarketTagsOptions {
  resourceType: ResourceType;
  autoLoad?: boolean;
}

export interface UseMarketTagsReturn {
  tags: Array<{ id: string | number; name: string; usageCount?: number }>;
  loading: boolean;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
}

export interface UseMarketFavoriteOptions {
  resourceType: ResourceType;
  resourceId: string | number;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface UseMarketFavoriteReturn {
  isFavorited: boolean;
  loading: boolean;
  toggleFavorite: () => Promise<void>;
  checkFavorite: () => Promise<void>;
}

export interface UseMarketDetailOptions<T> {
  items: T[];
  loading: boolean;
  getId: (item: T) => string | number;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface UseMarketDetailReturn<T> {
  detailItem: T | null;
  setDetailItem: (item: T | null) => void;
  openDetailById: (id: string | number) => void;
  closeModal: () => void;
}

export interface MarketThemeProps {
  theme: Theme;
  fontSize?: FontSize;
  themeColor?: ThemeColor;
}

export interface MarketActionConfig {
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}
