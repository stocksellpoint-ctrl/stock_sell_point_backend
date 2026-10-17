import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  discountType: z.enum(['none', 'amount', 'percent']).optional(),
  discountValue: z.number().nonnegative().optional(),
});

const orderBody = z.object({
  customerId: z.string().min(1),
  customerName: z.string().min(1).optional(),
  items: z
    .array(
      // z.object({
      //   productId: z.string().min(1),
      //   productName: z.string().min(1),
      //   quantity: z.number().int().positive(),
      //   price: z.number().nonnegative(),
      // })
      orderItemSchema
    )
    .min(1),
  total: z.number().nonnegative(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
});

export const createOrderSchema = z.object({ body: orderBody });
export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
  }),
});