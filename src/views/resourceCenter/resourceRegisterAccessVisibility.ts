export function shouldShowAgentAccessSection(input: {
  resourceId?: number;
  status?: string | null;
}): boolean {
  return typeof input.resourceId === 'number' && input.resourceId > 0 && normalizeStatus(input.status) === 'published';
}

function normalizeStatus(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}
