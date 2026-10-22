import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createUserSchema,
  updateUserSchema,
} from '../validations/user.validation.js';

export const userRoutes = Router();

// All user-management endpoints require both auth and admin role
userRoutes.use(requireAuth, requireAdmin);

userRoutes.get('/', userController.list);
userRoutes.post('/', validate(createUserSchema), userController.create);
userRoutes.get('/:id', userController.getById);
userRoutes.put('/:id', validate(updateUserSchema), userController.update);
userRoutes.delete('/:id', userController.delete);