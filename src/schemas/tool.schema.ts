import { z } from 'zod';

export const createMcpServerSchema = z.object({
  name: z.string().min(1, '请填写显示名称').max(80, '名称不能超过 80 个字符'),
  description: z.string().min(1, '请填写描述'),
  transportType: z.enum(['stdio', 'sse', 'streamable-http'], { message: '请选择传输方式' }),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url('请输入有效 URL').optional().or(z.literal('')),
});

export type CreateMcpServerFormValues = z.infer<typeof createMcpServerSchema>;
