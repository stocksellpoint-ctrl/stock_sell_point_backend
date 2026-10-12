import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createCustomerSchema, updateCustomerSchema } from '../validations/customer.validation.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const customerRoutes = Router();
customerRoutes.use(requireAuth);

customerRoutes.get('/', customerController.list);
customerRoutes.post('/', validate(createCustomerSchema), customerController.create);
customerRoutes.get('/:id', customerController.getById);
customerRoutes.put('/:id', validate(updateCustomerSchema), customerController.update);
customerRoutes.delete('/:id', customerController.delete);