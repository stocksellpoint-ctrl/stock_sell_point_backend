import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js'
import { requireAdmin } from '../middlewares/auth.middleware.js';

export const reportRoutes = Router();

reportRoutes.use(requireAdmin);

reportRoutes.get('/inventory', reportController.inventoryReport);
reportRoutes.get('/profit', reportController.profitReport);

