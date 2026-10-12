import { z } from 'zod';

const productBody = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(2).max(40),
  category: z.string().min(1).max(80),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  imagePath: z.string().nullable().optional(),
  description: z.string().max(1000).optional(),
});

export const createProductSchema = z.object({ body: productBody });
export const updateProductSchema = z.object({ body: productBody.partial() });