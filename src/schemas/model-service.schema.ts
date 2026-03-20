import { z } from 'zod';

export const createFineTuneSchema = z.object({
  name: z.string().min(1, '请输入任务名称').max(100, '名称不超过 100 个字符'),
  baseModel: z.string().min(1, '请输入基座模型名称'),
  datasetId: z.string().min(1, '请输入或上传数据集'),
});

export type CreateFineTuneFormValues = z.infer<typeof createFineTuneSchema>;
