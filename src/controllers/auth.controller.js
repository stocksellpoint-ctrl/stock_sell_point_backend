import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { authService } from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';

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

  changePassword: asyncHandler(async (req, res) => {
    if(!req.user?.sub){
      throw ApiError.unauthorized('Authorization required','AUTH_REQUIRED');
    }    

    const {currentPassword, newPassword} = req.body;
    const result = await authService.changePassword(req.user.sub, {
      currentPassword,
      newPassword, 
    });

    return ApiResponse.ok(res, result, 'Password changed');
   
  }),

  updateProfile: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const { name, email } = req.body;

    const updated = await authService.updateProfile(req.user.sub, {
      name,
      email,
    });

    return ApiResponse.ok(res, updated, 'Profile updated');
  }),
};