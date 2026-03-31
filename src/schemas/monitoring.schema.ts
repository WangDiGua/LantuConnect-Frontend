import { z } from 'zod';

export const createAlertRuleSchema = z.object({
  name: z.string().min(1, '请输入规则名称').max(64, '名称不能超过64个字符'),
  metric: z.string().min(1, '请选择指标'),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq'], { message: '请选择比较运算符' }),
  threshold: z.number({ message: '请输入有效数值' }),
  severity: z.enum(['critical', 'warning', 'info'], { message: '请选择严重级别' }),
  notifyChannels: z.array(z.string()),
});

export type CreateAlertRuleFormValues = z.infer<typeof createAlertRuleSchema>;
