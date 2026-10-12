import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { authService } from '../services/auth.service.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { user, token } = await authService.register(req.body);
    return ApiResponse.created(res, { user, token }, 'Registered');
  }),

  login: asyncHandler(async (req, res) => {
    const { user, token } = await authService.login(req.body);
    return ApiResponse.ok(res, { user, token }, 'Logged in');
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.me(req.user.id);
    return ApiResponse.ok(res, { user });
  }),

  logout: asyncHandler(async (req, res) => {
    return ApiResponse.ok(res, null, 'Logged out');
  }),
};