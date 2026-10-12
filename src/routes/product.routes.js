import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createProductSchema, updateProductSchema } from '../validations/product.validation.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const productRoutes = Router();
productRoutes.use(requireAuth);

productRoutes.get('/', productController.list);
productRoutes.post('/', validate(createProductSchema), productController.create);
productRoutes.get('/:id', productController.getById);
productRoutes.put('/:id', validate(updateProductSchema), productController.update);
productRoutes.delete('/:id', productController.delete);