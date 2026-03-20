import { z } from 'zod';

export const createPromptSchema = z.object({
  name: z.string().min(1, '请输入模板名称').max(64, '名称不能超过64个字符'),
  content: z.string().min(1, '请输入模板内容'),
});

export type CreatePromptFormValues = z.infer<typeof createPromptSchema>;

export const createTermSchema = z.object({
  term: z.string().min(1, '请输入术语'),
  definition: z.string().min(1, '请输入释义'),
});

export type CreateTermFormValues = z.infer<typeof createTermSchema>;

export const createSecretSchema = z.object({
  key: z.string().min(1, '请输入变量名').regex(/^[A-Z0-9_]+$/, '仅允许大写字母、数字和下划线'),
  value: z.string().min(1, '请输入值'),
  scope: z.enum(['project', 'global']),
});

export type CreateSecretFormValues = z.infer<typeof createSecretSchema>;
