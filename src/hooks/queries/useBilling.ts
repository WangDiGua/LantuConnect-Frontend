import { useQuery } from '@tanstack/react-query';
import { billingService } from '../../api/services/billing.service';
import type { PaginationParams } from '../../types/api';

export const billingKeys = {
  overview: ['billing', 'overview'] as const,
  details: (p?: PaginationParams) => ['billing', 'details', p] as const,
  invoices: ['billing', 'invoices'] as const,
  quotas: ['billing', 'quotas'] as const,
  plans: ['billing', 'plans'] as const,
};

export function useBillingOverview() {
  return useQuery({ queryKey: billingKeys.overview, queryFn: () => billingService.getOverview() });
}

export function useBillingDetails(params?: PaginationParams) {
  return useQuery({
    queryKey: billingKeys.details(params),
    queryFn: () => billingService.listDetails(params),
    select: (data) => data.list,
  });
}

export function useInvoices() {
  return useQuery({ queryKey: billingKeys.invoices, queryFn: () => billingService.listInvoices() });
}

export function useQuotas() {
  return useQuery({ queryKey: billingKeys.quotas, queryFn: () => billingService.listQuotas() });
}

export function usePlans() {
  return useQuery({ queryKey: billingKeys.plans, queryFn: () => billingService.listPlans() });
}
