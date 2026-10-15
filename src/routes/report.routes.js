import { Router } from 'express';

export const reportRoutes = Router();


reportRoutes.get('/inventoryReport', reportController.inventoryReport);
reportRoutes.get('/profitReport', reportController.profitReport);

