import express from 'express';
import multer from 'multer';
import { businessController } from '../controllers/business.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Use memory storage so we can pass the buffer to Cloudinary/ImageKit
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Apply auth middleware to all routes
router.use(verifyJWT);

router.route('/')
  .get(businessController.get)
  .put(upload.single('logo'), businessController.update); // 'logo' must match Flutter's FormData key

export default router;