import express from 'express';
import multer from 'multer';
import { businessController } from '../controllers/business.controller.js';

// ✅ Correct import: your middleware exports `requireAuth`, not `verifyJWT`
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Apply auth to all business routes
router.use(requireAuth);

router.route('/check')
  .get(businessController.check);

router.route('/')
  .get(businessController.get)
  .put(upload.single('logo'), businessController.upsert);

export default router;