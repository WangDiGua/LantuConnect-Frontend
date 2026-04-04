import { useState, useEffect } from 'react';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { UseMarketTagsOptions, UseMarketTagsReturn } from './types';

export function useMarketTags(options: UseMarketTagsOptions): UseMarketTagsReturn {
  const { resourceType, autoLoad = true } = options;

  const [tags, setTags] = useState<Array<{ id: string | number; name: string; usageCount?: number }>>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (!autoLoad) return;

    let cancelled = false;
    setLoading(true);

    tagService
      .list()
      .then((list) => {
        if (!cancelled) {
          const filtered = filterTagsForResourceType(list, resourceType);
          setTags(filtered);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTags([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resourceType, autoLoad]);

  return {
    tags,
    loading,
    activeTag,
    setActiveTag,
  };
}
