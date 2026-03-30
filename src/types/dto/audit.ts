export interface AuditItem {
  id: number;
  displayName: string;
  agentName: string;
  description: string;
  agentType: string;
  sourceType: string;
  submitter: string;
  submitTime: string;
  status: 'pending_review' | 'testing' | 'published' | 'rejected';
  rejectReason?: string;
}
