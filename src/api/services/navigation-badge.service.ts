import { developerApplicationService } from './developer-application.service';
import { resourceAuditService } from './resource-audit.service';
import { resourceCenterService } from './resource-center.service';

export type NavigationBadgeCounts = Record<string, number>;

export interface NavigationBadgeQueryOptions {
  includeOwnResourceWorkflow: boolean;
  includeOwnOnboardingWorkflow: boolean;
  includeResourceAudit: boolean;
  includeDeveloperApplicationAudit: boolean;
}

function safeCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function fallbackZero(task: Promise<number>): Promise<number> {
  try {
    return safeCount(await task);
  } catch {
    return 0;
  }
}

export const navigationBadgeService = {
  async getCounts(options: NavigationBadgeQueryOptions): Promise<NavigationBadgeCounts> {
    const counts: NavigationBadgeCounts = {};
    const tasks: Promise<void>[] = [];

    if (options.includeOwnResourceWorkflow) {
      tasks.push((async () => {
        const [pending, rejected] = await Promise.all([
          fallbackZero(resourceCenterService.listMine({ page: 1, pageSize: 1, status: 'pending_review' }).then((p) => p.total)),
          fallbackZero(resourceCenterService.listMine({ page: 1, pageSize: 1, status: 'rejected' }).then((p) => p.total)),
        ]);
        counts['resource-center'] = pending + rejected;
      })());
    }

    if (options.includeOwnOnboardingWorkflow) {
      tasks.push((async () => {
        const mine = await developerApplicationService.getMine().catch(() => null);
        counts['developer-onboarding'] = mine?.status === 'pending' || mine?.status === 'rejected' ? 1 : 0;
      })());
    }

    if (options.includeResourceAudit) {
      tasks.push((async () => {
        counts['resource-audit'] = await fallbackZero(
          resourceAuditService.list({ page: 1, pageSize: 1, status: 'pending_review' }).then((p) => p.total),
        );
      })());
    }

    if (options.includeDeveloperApplicationAudit) {
      tasks.push((async () => {
        counts['developer-applications'] = await fallbackZero(
          developerApplicationService.list({ page: 1, pageSize: 1, status: 'pending' }).then((p) => p.total),
        );
      })());
    }

    await Promise.all(tasks);
    return counts;
  },
};
