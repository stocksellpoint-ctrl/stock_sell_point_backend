import { Router } from 'express';
import multer from 'multer';
import { businessController } from '../controllers/business.controller.js';

// ✅ Correct import: your middleware exports `requireAuth`, not `verifyJWT`
import { requireAuth } from '../middlewares/auth.middleware.js';


export const businessRoutes = Router();



const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Apply auth to all business routes
businessRoutes.use(requireAuth);

businessRoutes.route('/check')
  .get(businessController.check);

businessRoutes.route('/')
  .get(businessController.get)
  .put(upload.single('logo'), businessController.upsert);
