import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
// import { validate } from '../middlewares/validate.middleware.js';
// import { createProductSchema, updateProductSchema } from '../validations/product.validation.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadImage } from '../middlewares/upload.middleware.js';

export const productRoutes = Router();

productRoutes.use(requireAuth);

productRoutes.get('/', productController.list);
productRoutes.get('/:id', productController.getById);

// Image upload - multer parses the 'image' field
productRoutes.post('/', uploadImage, productController.create);
productRoutes.put('/:id', uploadImage, productController.update);

// productRoutes.post('/',uploadImage, validate(createProductSchema), productController.create);
// productRoutes.put('/:id',uploadImage, validate(updateProductSchema), productController.update);


productRoutes.delete('/:id', productController.delete);