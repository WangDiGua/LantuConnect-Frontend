export interface DatabaseItem {
  id: string;
  name: string;
  description: string;
  creationMethod: string;
  updatedAt: string;
  createdAt: string;
}

export type DatabaseSubView = 'list' | 'create';
