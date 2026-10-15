import { Router } from 'express';

export const reportRoutes = Router();


reportRoutes.get('/inventory', reportController.inventoryReport);
reportRoutes.get('/profit', reportController.profitReport);

