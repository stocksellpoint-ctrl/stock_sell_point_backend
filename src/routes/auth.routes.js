import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from '../validations/auth.validation.js';
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
// PUT /api/v1/auth/change-password
authRoutes.put(
    '/change-password',
    requireAuth,
    validate(changePasswordSchema),
    authController.changePassword   
);
// PUT /api/v1/auth/me/profile
authRoutes.put(
  '/me/profile',
  requireAuth,
  validate(updateProfileSchema),
  authController.updateProfile
);