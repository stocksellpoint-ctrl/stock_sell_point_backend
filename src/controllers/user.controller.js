import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { userService } from '../services/user.service.js';

export const userController = {
  list: asyncHandler(async (req, res) => {
    const data = await userService.list(req.query);
    return ApiResponse.ok(res, data);
  }),

  getById: asyncHandler(async (req, res) => {
    const user = await userService.getById(req.params.id);
    return ApiResponse.ok(res, user);
  }),

  create: asyncHandler(async (req, res) => {
    const user = await userService.create(req.body);
    return ApiResponse.created(res, user, 'User created');
  }),

  update: asyncHandler(async (req, res) => {
    const user = await userService.update(req.params.id, req.body);
    return ApiResponse.ok(res, user, 'User updated');
  }),

  delete: asyncHandler(async (req, res) => {
    if (req.user.sub === req.params.id) {
      throw ApiError.badRequest(
        'You cannot delete your own account',
        'CANNOT_DELETE_SELF'
      );
    }
    await userService.delete(req.params.id);
    return ApiResponse.noContent(res);
  }),
};