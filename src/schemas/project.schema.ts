import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, '请输入项目名称'),
  type: z.enum(['agent', 'workflow', 'knowledge', 'general'], { message: '请选择项目类型' }),
  description: z.string().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
