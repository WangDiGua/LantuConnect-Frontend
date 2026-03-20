import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  BillingDetail,
  BillingOverview,
  Invoice,
  Plan,
  Quota,
} from '../../types/dto/billing';

export const billingService = {
  getOverview: () =>
    http.get<BillingOverview>('/billing/overview'),

  listDetails: (params?: PaginationParams) =>
    http.get<PaginatedData<BillingDetail>>('/billing/details', { params }),

  listInvoices: () => http.get<Invoice[]>('/billing/invoices'),

  listQuotas: () => http.get<Quota[]>('/billing/quotas'),

  listPlans: () => http.get<Plan[]>('/billing/plans'),
};
