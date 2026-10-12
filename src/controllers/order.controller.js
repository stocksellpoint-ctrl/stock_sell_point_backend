import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { orderService } from '../services/order.service.js';

export const orderController = {
  list: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await orderService.list(req.query))
  ),
  getById: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await orderService.getById(req.params.id))
  ),
  create: asyncHandler(async (req, res) =>
    ApiResponse.created(res, await orderService.create(req.body), 'Order created')
  ),
  updateStatus: asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await orderService.updateStatus(req.params.id, req.body.status),
      'Order status updated'
    )
  ),
  delete: asyncHandler(async (req, res) => {
    await orderService.delete(req.params.id);
    return ApiResponse.noContent(res);
  }),
};