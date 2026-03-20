import { z } from 'zod';

export const createWebhookSchema = z.object({
  url: z.string().url('请输入有效的 URL'),
  events: z.string().min(1, '请输入至少一个事件'),
});

export type CreateWebhookFormValues = z.infer<typeof createWebhookSchema>;

export const createShareSchema = z.object({
  name: z.string().min(1, '请输入链接名称'),
});

export type CreateShareFormValues = z.infer<typeof createShareSchema>;
