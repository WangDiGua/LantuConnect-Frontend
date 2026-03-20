import { z } from 'zod';

export const createKBSchema = z.object({
  name: z.string().min(1, '请输入知识库名称').max(80, '名称不能超过 80 个字符'),
  description: z.string().optional(),
  type: z.enum(['qa', 'document', 'table', 'custom']).default('document'),
  embeddingModel: z.string().min(1, '请选择向量模型'),
  tags: z.array(z.string()).optional(),
});

export type CreateKBFormValues = z.infer<typeof createKBSchema>;
