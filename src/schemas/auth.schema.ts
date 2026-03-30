import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, '请输入学工号'),
  password: z
    .string()
    .min(1, '请输入密码')
    .min(6, '密码至少6位')
    .max(64, '密码不能超过64位'),
  captchaCode: z
    .string()
    .trim()
    .min(1, '请输入验证码'),
  remember: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(1, '请输入用户名')
      .min(2, '用户名至少2个字符')
      .max(32, '用户名不能超过32个字符')
      .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文'),
    email: z.string().min(1, '请输入邮箱').email('请输入有效的邮箱地址'),
    password: z
      .string()
      .min(1, '请输入密码')
      .min(8, '密码至少8位')
      .max(64, '密码不能超过64位')
      .regex(/[A-Z]/, '密码需要包含至少一个大写字母')
      .regex(/[0-9]/, '密码需要包含至少一个数字'),
    confirmPassword: z.string().min(1, '请确认密码'),
    orgCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z
      .string()
      .min(8, '新密码至少8位')
      .max(64)
      .regex(/[A-Z]/, '密码需要包含至少一个大写字母')
      .regex(/[0-9]/, '密码需要包含至少一个数字'),
    confirmPassword: z.string().min(1, '请确认新密码'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
