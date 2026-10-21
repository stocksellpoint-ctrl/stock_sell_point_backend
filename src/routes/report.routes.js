import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js';

export const reportRoutes = Router();

reportRoutes.use(requireAuth);

reportRoutes.get('/inventory', reportController.inventoryReport);
reportRoutes.get('/profit', reportController.profitReport);

