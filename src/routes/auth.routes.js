import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, registerSchema } from '../validations/auth.validation.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';

export const authRoutes = Router();

// POST /api/v1/auth/register
authRoutes.post('/register', authLimiter, validate(registerSchema), authController.register);
// POST /api/v1/auth/login
authRoutes.post('/login', authLimiter, validate(loginSchema), authController.login);
// GET /api/v1/auth/me
authRoutes.get('/me', requireAuth, authController.me);
// POST /api/v1/auth/logout
authRoutes.post('/logout', requireAuth, authController.logout);