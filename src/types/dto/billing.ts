export interface BillingOverview {
  currentBalance: number;
  totalSpent: number;
  monthlySpend: number;
  monthlyBudget: number;
  tokenUsage: { input: number; output: number; total: number };
  apiCalls: number;
  activePlan: string;
  nextBillingDate: string;
  tokensLimit?: number;
  tokensUsed?: number;
  apiCallsToday?: number;
  costThisMonth?: number;
  currentPlan?: string;
}

export interface BillingDetail {
  id: string;
  date: string;
  type: 'api_call' | 'fine_tune' | 'storage' | 'subscription' | 'top_up';
  description: string;
  model?: string;
  tokens: number;
  amount: number;
  balance: number;
  apiCalls?: number;
  tokensUsed?: number;
  cost?: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'unpaid' | 'overdue' | 'cancelled';
  paidAt?: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface Quota {
  id: string;
  resource: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  resetAt?: string;
  threshold?: number;
  currentValue?: number;
  metric?: string;
  enabled?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  limits: Record<string, number>;
  recommended: boolean;
  current: boolean;
  tokensLimit?: number;
}
