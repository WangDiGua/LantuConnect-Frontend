import { z } from 'zod';

export const createWorkflowSchema = z.object({
  name: z.string().min(1, '请输入工作流名称'),
  description: z.string(),
});

export type CreateWorkflowFormValues = z.infer<typeof createWorkflowSchema>;

export const createScheduleSchema = z.object({
  workflowId: z.string().min(1, '请选择工作流'),
  cron: z.string().min(1, '请输入 Cron 表达式'),
});

export type CreateScheduleFormValues = z.infer<typeof createScheduleSchema>;
