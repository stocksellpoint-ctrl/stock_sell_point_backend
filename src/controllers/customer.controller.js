import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { customerService } from '../services/customer.service.js';

export const customerController = {
  list: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await customerService.list(req.query))
  ),
  getById: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await customerService.getById(req.params.id))
  ),
  create: asyncHandler(async (req, res) =>
    ApiResponse.created(res, await customerService.create(req.body), 'Customer created')
  ),
  update: asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await customerService.update(req.params.id, req.body),
      'Customer updated'
    )
  ),
  delete: asyncHandler(async (req, res) => {
    await customerService.delete(req.params.id);
    return ApiResponse.noContent(res);
  }),
};