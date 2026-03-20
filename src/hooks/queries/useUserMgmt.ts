import { useQuery } from '@tanstack/react-query';
import { userMgmtService } from '../../api/services/user-mgmt.service';

export const userMgmtKeys = {
  orgTree: ['userMgmt', 'orgTree'] as const,
};

export function useOrgTree() {
  return useQuery({ queryKey: userMgmtKeys.orgTree, queryFn: () => userMgmtService.getOrgTree() });
}
