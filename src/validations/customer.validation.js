import { z } from 'zod';

const customerBody = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(5).max(30),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

export const createCustomerSchema = z.object({ body: customerBody });
export const updateCustomerSchema = z.object({ body: customerBody.partial() });