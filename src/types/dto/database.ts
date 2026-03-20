export interface DatabaseInstance {
  id: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'redis';
  host: string;
  port: number;
  database: string;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
  tableCount: number;
  sizeMb: number;
  version?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseTable {
  name: string;
  rowCount: number;
  sizeMb: number;
  columns: DatabaseColumn[];
  indexes: string[];
  comment?: string;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface CreateDatabasePayload {
  name: string;
  type: DatabaseInstance['type'];
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}
