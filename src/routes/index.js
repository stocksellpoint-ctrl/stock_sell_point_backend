import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { productRoutes } from './product.routes.js';
import { customerRoutes } from './customer.routes.js';
import { orderRoutes } from './order.routes.js';
import { categoryRoutes } from './category.routes.js';

export const apiRoutes = Router();

// Health check
apiRoutes.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'stock-sell-backend',
    timestamp: new Date().toISOString(),
  });
});

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/products', productRoutes);
apiRoutes.use('/customers', customerRoutes);
apiRoutes.use('/orders', orderRoutes);
apiRoutes.use('/categories',categoryRoutes);