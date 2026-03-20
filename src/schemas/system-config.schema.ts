import { z } from 'zod';

export const createModelConfigSchema = z.object({
  name: z.string().min(1, '请输入名称'),
  provider: z.string().min(1, '请输入供应商'),
  modelId: z.string().min(1, '请输入模型 ID'),
  endpoint: z.string().min(1, '请输入 Base URL').url('请输入有效的 URL'),
  apiKey: z.string().optional(),
});

export type CreateModelConfigFormValues = z.infer<typeof createModelConfigSchema>;
