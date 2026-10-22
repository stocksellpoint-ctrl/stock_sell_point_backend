import { z } from 'zod';

const userBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['admin', 'manager', 'user']).optional(),
});

const updateUserBody = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  role: z.enum(['admin', 'manager', 'user']).optional(),
  isActive: z.boolean().optional(),
});

export const createUserSchema = z.object({ body: userBody });
export const updateUserSchema = z.object({ body: updateUserBody });