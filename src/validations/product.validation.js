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


// import { z } from 'zod';

// // Multipart fields come as strings — coerce them to numbers.
// const productBody = z.object({
//   name: z.string().trim().min(1).max(200),
//   sku: z.string().trim().min(2).max(40),
//   categoryId: z.string().min(1),                    // ObjectId string
//   costPrice: z.coerce.number().nonnegative(),
//   quantity: z.coerce.number().int().nonnegative(),
//   lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
//   description: z.string().max(1000).optional(),
//   // image is validated/handled by multer, not zod
// });

// export const createProductSchema = z.object({ body: productBody });
// export const updateProductSchema = z.object({ body: productBody.partial() });