import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemConfigService, type AuditLogQueryParams } from '../../api/services/system-config.service';
import type { CreateRateLimitDTO, RateLimitRule, SystemParam, SecuritySetting } from '../../types/dto/system-config';

export const sysConfigKeys = {
  rateLimits: ['sysConfig', 'rateLimits'] as const,
  auditLogs: (p?: AuditLogQueryParams) => ['sysConfig', 'auditLogs', p] as const,
  params: ['sysConfig', 'params'] as const,
  security: ['sysConfig', 'security'] as const,
};

export function useRateLimits() { return useQuery({ queryKey: sysConfigKeys.rateLimits, queryFn: () => systemConfigService.listRateLimits() }); }
export function useCreateRateLimit() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreateRateLimitDTO) => systemConfigService.createRateLimit(data), onSuccess: () => qc.invalidateQueries({ queryKey: sysConfigKeys.rateLimits }) }); }
export function useUpdateRateLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRateLimitDTO> & { enabled?: boolean } }) =>
      systemConfigService.updateRateLimit(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sysConfigKeys.rateLimits }),
  });
}
export function useDeleteRateLimit() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => systemConfigService.deleteRateLimit(id), onSuccess: () => qc.invalidateQueries({ queryKey: sysConfigKeys.rateLimits }) }); }
export function useSysAuditLogs(p?: AuditLogQueryParams) {
  return useQuery({ queryKey: sysConfigKeys.auditLogs(p), queryFn: () => systemConfigService.listAuditLogs(p) });
}
export function useSysParams() { return useQuery({ queryKey: sysConfigKeys.params, queryFn: () => systemConfigService.getParams() }); }
export function useUpdateSysParams() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: SystemParam[]) => systemConfigService.updateParams(data), onSuccess: () => qc.invalidateQueries({ queryKey: sysConfigKeys.params }) }); }
export function useSysSecurity() { return useQuery({ queryKey: sysConfigKeys.security, queryFn: () => systemConfigService.getSecurity() }); }
export function useUpdateSysSecurity() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: SecuritySetting[]) => systemConfigService.updateSecurity(data), onSuccess: () => qc.invalidateQueries({ queryKey: sysConfigKeys.security }) }); }
