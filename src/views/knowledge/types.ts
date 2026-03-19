export interface KnowledgeItem {
  id: string;
  name: string;
  description: string;
  fileCount: number;
  hosted: string;
  vectorModel: string;
  cluster: string;
}

export type KnowledgeSubView = 'list' | 'create' | 'batch' | 'developer' | 'hitTest';
