export interface AuditItem {
  id: number;
  displayName: string;
  agentName: string;
  description: string;
  agentType: string;
  sourceType: string;
  submitter: string;
  submitTime: string;
  status: 'pending_review' | 'published' | 'rejected';
  rejectReason?: string;
}
