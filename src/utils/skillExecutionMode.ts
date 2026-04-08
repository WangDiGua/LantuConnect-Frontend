import type { Skill } from '../types/dto/skill';

/** 与目录 spec.executionMode、列表 executionMode、resolve.invokeType=hosted_llm 对齐 */
export function isHostedSkill(skill: Pick<Skill, 'executionMode' | 'specJson'> | null | undefined): boolean {
  if (!skill) return false;
  if (skill.executionMode === 'hosted') return true;
  const spec = skill.specJson;
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    const em = String((spec as Record<string, unknown>).executionMode ?? '').trim().toLowerCase();
    if (em === 'hosted') return true;
  }
  return false;
}
