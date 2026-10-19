import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  categoryId: z.string().optional(),
  quantity: z.number().int().positive(),
  
  // ★ UPDATED: Replaced `price` with `sellingPrice` and `costPrice`
  sellingPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  
  discountType: z.enum(['none', 'amount', 'percent']).optional(),
  discountValue: z.number().nonnegative().optional(),
});

const orderBody = z.object({
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  total: z.number().nonnegative(), // Frontend sends 0, backend computes it anyway
  status: z
    .enum(['pending', 'processing', 'completed', 'cancelled'])
    .optional(),
  notes: z.string().max(500).optional(),
});

export const createOrderSchema = z.object({ body: orderBody });

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  }),
});