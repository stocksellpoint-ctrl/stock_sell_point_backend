import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const categoryRoutes = Router();

categoryRoutes.use(requireAuth);

categoryRoutes.get('/', categoryController.list);
categoryRoutes.get('/tree', categoryController.tree);
categoryRoutes.post('/', categoryController.create);
categoryRoutes.get('/:id', categoryController.getById);
categoryRoutes.put('/:id', categoryController.update);
categoryRoutes.delete('/:id', categoryController.delete);