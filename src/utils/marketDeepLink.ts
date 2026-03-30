/** Console `page` slug for user/admin market routes (see `consoleRoutes`). */
const RESOURCE_TYPE_TO_MARKET_PAGE: Record<string, string> = {
  mcp: 'mcp-market',
  agent: 'agent-market',
  skill: 'skill-market',
  app: 'app-market',
  dataset: 'dataset-market',
};

export function marketPageForResourceType(resourceType: string): string | null {
  const key = resourceType.trim().toLowerCase();
  return RESOURCE_TYPE_TO_MARKET_PAGE[key] ?? null;
}
