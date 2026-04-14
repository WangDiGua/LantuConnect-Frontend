import type { Skill } from '../types/dto/skill';

/** 与目录 executionMode=context、resolve.invokeType=portal_context 对齐 */
export function isContextSkill(
  skill: Pick<Skill, 'executionMode' | 'specJson' | 'agentType'> | null | undefined,
): boolean {
  if (!skill) return false;
  const at = String(skill.agentType ?? '').trim().toLowerCase();
  if (at === 'context_skill') return true;
  if (skill.executionMode === 'context') return true;
  const spec = skill.specJson;
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    const em = String((spec as Record<string, unknown>).executionMode ?? '').trim().toLowerCase();
    if (em === 'context') return true;
  }
  return false;
}
