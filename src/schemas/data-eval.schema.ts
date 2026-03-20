import { z } from 'zod';

export const createDatasetSchema = z.object({
  name: z.string().min(1, '请输入数据集名称').max(128, '名称不能超过128个字符'),
  description: z.string().optional(),
});

export type CreateDatasetFormValues = z.infer<typeof createDatasetSchema>;

export const createEvalSchema = z.object({
  name: z.string().min(1, '请输入评测名称').max(128, '名称不能超过128个字符'),
  datasetId: z.string().min(1, '请选择数据集'),
  modelA: z.string().min(1, '请输入模型 A'),
  modelB: z.string().min(1, '请输入模型 B'),
});

export type CreateEvalFormValues = z.infer<typeof createEvalSchema>;

export const createABTestSchema = z.object({
  name: z.string().min(1, '请输入实验名称').max(128, '名称不能超过128个字符'),
  trafficA: z.number().min(1, '最小 1%').max(99, '最大 99%'),
});

export type CreateABTestFormValues = z.infer<typeof createABTestSchema>;
