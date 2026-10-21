import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { orderService } from '../services/order.service.js';


// Here everyone can see everything
// export const orderController = {
//   list: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await orderService.list(req.query))
//   ),
//   getById: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await orderService.getById(req.params.id))
//   ),
//   create: asyncHandler(async (req, res) =>
//     ApiResponse.created(res, await orderService.create(req.body), 'Order created')
//   ),
//   updateStatus: asyncHandler(async (req, res) =>
//     ApiResponse.ok(
//       res,
//       await orderService.updateStatus(req.params.id, req.body.status),
//       'Order status updated'
//     )
//   ),
//   delete: asyncHandler(async (req, res) => {
//     await orderService.delete(req.params.id);
//     return ApiResponse.noContent(res);
//   }),
// };


// Here only owner or admin can see product or delete
export const orderController = {
  list: asyncHandler(async (req, res) => {
  if (!req.user?.sub) {
    throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }
  const data = await orderService.list({
    ...req.query,
    ownerId: req.user.sub,
    isAdmin: req.user.role === 'admin',
  });
  return ApiResponse.ok(res, data);
}),

create: asyncHandler(async (req, res) => {
  const ownerId = req.user?.sub;
  if (!ownerId) {
    throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }
  const order = await orderService.create({ ...req.body, ownerId });
  return ApiResponse.created(res, order, 'Order created');
}),

getById: asyncHandler(async (req, res) => {
  if (!req.user?.sub) {
    throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }
  const order = await orderService.getById(
    req.params.id,
    req.user.sub,
    req.user.role === 'admin'
  );
  return ApiResponse.ok(res, order);
}),

delete: asyncHandler(async (req, res) => {
  if (!req.user?.sub) {
    throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }
  await orderService.delete(
    req.params.id,
    req.user.sub,
    req.user.role === 'admin'
  );
  return ApiResponse.noContent(res);
}),
};