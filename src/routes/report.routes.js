import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js'
export const reportRoutes = Router();


reportRoutes.get('/inventory', reportController.inventoryReport);
reportRoutes.get('/profit', reportController.profitReport);

