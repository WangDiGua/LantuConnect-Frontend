import type MockAdapter from 'axios-mock-adapter';
import type { DatabaseInstance, DatabaseTable } from '../../../types/dto/database';
import { mockOk, paginate } from '../mockAdapter';

function ts(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

const databases: DatabaseInstance[] = [
  { id: 'db01', name: '教务主库', type: 'postgresql', host: '10.0.1.10', port: 5432, database: 'edu_main', username: 'edu_admin', status: 'connected', tableCount: 45, sizeMb: 2400, version: '15.4', createdBy: 'admin', createdAt: ts(180), updatedAt: ts(1) },
  { id: 'db02', name: '知识向量库', type: 'postgresql', host: '10.0.1.11', port: 5432, database: 'kb_vectors', username: 'kb_service', status: 'connected', tableCount: 8, sizeMb: 12800, version: '15.4 (pgvector)', createdBy: 'admin', createdAt: ts(120), updatedAt: ts(2) },
  { id: 'db03', name: '缓存服务', type: 'redis', host: '10.0.1.20', port: 6379, database: '0', username: 'default', status: 'connected', tableCount: 0, sizeMb: 512, version: '7.2', createdBy: 'admin', createdAt: ts(180), updatedAt: ts(0) },
  { id: 'db04', name: '日志存储', type: 'mongodb', host: '10.0.1.30', port: 27017, database: 'logs', username: 'log_writer', status: 'connected', tableCount: 12, sizeMb: 8500, version: '7.0', createdBy: 'admin', createdAt: ts(150), updatedAt: ts(3) },
  { id: 'db05', name: '开发测试库', type: 'mysql', host: '10.0.2.10', port: 3306, database: 'dev_test', username: 'dev', status: 'disconnected', tableCount: 32, sizeMb: 180, version: '8.0', createdBy: 'zhangsan', createdAt: ts(60), updatedAt: ts(15) },
  { id: 'db06', name: '嵌入式分析库', type: 'sqlite', host: 'local', port: 0, database: '/data/analytics.db', username: 'n/a', status: 'connected', tableCount: 6, sizeMb: 45, createdBy: 'lisi', createdAt: ts(30), updatedAt: ts(5) },
];

const tablesMap: Record<string, DatabaseTable[]> = {
  db01: [
    { name: 'students', rowCount: 28500, sizeMb: 120, columns: [{ name: 'id', type: 'bigint', nullable: false, primaryKey: true }, { name: 'name', type: 'varchar(100)', nullable: false, primaryKey: false }, { name: 'student_no', type: 'varchar(20)', nullable: false, primaryKey: false, comment: '学号' }, { name: 'department_id', type: 'int', nullable: false, primaryKey: false }], indexes: ['pk_students', 'idx_student_no'], comment: '学生信息表' },
    { name: 'courses', rowCount: 1200, sizeMb: 8, columns: [{ name: 'id', type: 'bigint', nullable: false, primaryKey: true }, { name: 'name', type: 'varchar(200)', nullable: false, primaryKey: false }, { name: 'credits', type: 'decimal(3,1)', nullable: false, primaryKey: false }], indexes: ['pk_courses'], comment: '课程表' },
    { name: 'enrollments', rowCount: 185000, sizeMb: 450, columns: [{ name: 'id', type: 'bigint', nullable: false, primaryKey: true }, { name: 'student_id', type: 'bigint', nullable: false, primaryKey: false }, { name: 'course_id', type: 'bigint', nullable: false, primaryKey: false }, { name: 'semester', type: 'varchar(20)', nullable: false, primaryKey: false }], indexes: ['pk_enrollments', 'idx_student_course'], comment: '选课记录' },
    { name: 'departments', rowCount: 24, sizeMb: 0.5, columns: [{ name: 'id', type: 'int', nullable: false, primaryKey: true }, { name: 'name', type: 'varchar(100)', nullable: false, primaryKey: false }], indexes: ['pk_departments'], comment: '院系表' },
    { name: 'grades', rowCount: 620000, sizeMb: 850, columns: [{ name: 'id', type: 'bigint', nullable: false, primaryKey: true }, { name: 'enrollment_id', type: 'bigint', nullable: false, primaryKey: false }, { name: 'score', type: 'decimal(5,2)', nullable: true, primaryKey: false }], indexes: ['pk_grades', 'idx_enrollment_id'], comment: '成绩表' },
  ],
};

let nextDbId = 100;

export function registerHandlers(mock: MockAdapter): void {
  mock.onGet('/databases').reply((config) => {
    const p = config.params || {};
    return paginate(databases, Number(p.page) || 1, Number(p.pageSize) || 20);
  });

  mock.onPost('/databases').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const db: DatabaseInstance = {
      id: 'db_' + nextDbId++,
      name: body.name,
      type: body.type,
      host: body.host,
      port: body.port,
      database: body.database,
      username: body.username,
      status: 'connected',
      tableCount: 0,
      sizeMb: 0,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    databases.push(db);
    return mockOk(db);
  });

  mock.onGet(/\/databases\/([^/]+)\/tables$/).reply((config) => {
    const id = config.url!.match(/\/databases\/([^/]+)\/tables/)?.[1];
    return mockOk(tablesMap[id!] || []);
  });

  mock.onGet(/\/databases\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/databases\/([^/]+)$/)?.[1];
    const db = databases.find((d) => d.id === id);
    return db ? mockOk(db) : [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onPut(/\/databases\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/databases\/([^/]+)$/)?.[1];
    const body = JSON.parse(config.data || '{}');
    const idx = databases.findIndex((d) => d.id === id);
    if (idx >= 0) {
      databases[idx] = { ...databases[idx], ...body, updatedAt: new Date().toISOString() };
      return mockOk(databases[idx]);
    }
    return [404, { code: 404, message: 'Not found', timestamp: Date.now() }];
  });

  mock.onDelete(/\/databases\/([^/]+)$/).reply((config) => {
    const id = config.url!.match(/\/databases\/([^/]+)$/)?.[1];
    const idx = databases.findIndex((d) => d.id === id);
    if (idx >= 0) databases.splice(idx, 1);
    return mockOk(null);
  });
}
