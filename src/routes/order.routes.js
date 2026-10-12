import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from '../validations/order.validation.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

export const orderRoutes = Router();

// All order routes require authentication
orderRoutes.use(requireAuth);

// ────────────────────────────────────────────────────────────
// GET /api/v1/orders
//   Query: ?status=pending&customerId=xxx&page=1&limit=50
//   List orders with optional filters + pagination
// ────────────────────────────────────────────────────────────
orderRoutes.get('/', orderController.list);

// ────────────────────────────────────────────────────────────
// POST /api/v1/orders
//   Body: { customerId, items: [...], total, status?, notes? }
//   Create an order (also decrements product stock atomically)
// ────────────────────────────────────────────────────────────
orderRoutes.post(
  '/',
  validate(createOrderSchema),
  orderController.create
);

// ────────────────────────────────────────────────────────────
// GET /api/v1/orders/:id
//   Fetch a single order by ID
// ────────────────────────────────────────────────────────────
orderRoutes.get('/:id', orderController.getById);

// ────────────────────────────────────────────────────────────
// PATCH /api/v1/orders/:id/status
//   Body: { status: 'pending' | 'processing' | 'completed' | 'cancelled' }
//   Update only the order status
// ────────────────────────────────────────────────────────────
orderRoutes.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  orderController.updateStatus
);

// ────────────────────────────────────────────────────────────
// DELETE /api/v1/orders/:id
//   Delete an order
// ────────────────────────────────────────────────────────────
orderRoutes.delete('/:id', orderController.delete);