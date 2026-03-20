import { z } from 'zod';

export const createDatabaseSchema = z.object({
  name: z.string().min(1, '请输入数据库名称').max(80, '名称不能超过 80 个字符'),
  type: z.enum(['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis'], { message: '请选择类型' }),
  host: z.string().min(1, '请输入主机地址'),
  port: z.coerce.number().int().positive('请输入有效端口'),
  database: z.string().min(1, '请输入数据库名'),
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
});

export type CreateDatabaseFormValues = z.infer<typeof createDatabaseSchema>;
