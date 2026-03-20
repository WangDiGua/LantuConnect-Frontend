import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string().min(1, '请输入 Agent 名称').max(50, '名称不能超过 50 个字符'),
  description: z.string().min(1, '请输入 Agent 描述'),
  type: z.enum(['chat', 'task', 'workflow', 'custom'], { message: '请选择类型' }),
  modelId: z.string().min(1, '请选择模型'),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

export type CreateAgentFormValues = z.infer<typeof createAgentSchema>;
