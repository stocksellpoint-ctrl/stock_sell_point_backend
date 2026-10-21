// import { z } from 'zod';

// const customerBody = z.object({
//   name: z.string().trim().min(1).max(120),
//   phone: z.string().trim().min(5).max(30),
//   email: z.string().email().optional().or(z.literal('')),
//   address: z.string().max(300).optional(),
//   notes: z.string().max(500).optional(),
// });

// export const createCustomerSchema = z.object({ body: customerBody });
// export const updateCustomerSchema = z.object({ body: customerBody.partial() });




import { z } from 'zod';

const customerBody = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(30),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' || v === undefined ? null : v)),
  address: z
    .string()
    .max(300)
    .optional()
    .transform((v) => v || null),
  notes: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v || null),
});

export const createCustomerSchema = z.object({ body: customerBody });
export const updateCustomerSchema = z.object({ body: customerBody.partial() });