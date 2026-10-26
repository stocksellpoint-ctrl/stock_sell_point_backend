import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const changePasswordSchema = z.object({
  body:z.object({
    currentPassword:z.string().min(1, 'Current psssword is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});