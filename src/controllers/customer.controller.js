import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { customerService } from '../services/customer.service.js';


// Here everyone can see everything
// export const customerController = {
//   list: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await customerService.list(req.query))
//   ),
//   getById: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await customerService.getById(req.params.id))
//   ),
//   create: asyncHandler(async (req, res) =>
//     ApiResponse.created(res, await customerService.create(req.body), 'Customer created')
//   ),
//   update: asyncHandler(async (req, res) =>
//     ApiResponse.ok(
//       res,
//       await customerService.update(req.params.id, req.body),
//       'Customer updated'
//     )
//   ),
//   delete: asyncHandler(async (req, res) => {
//     await customerService.delete(req.params.id);
//     return ApiResponse.noContent(res);
//   }),
// };


// Here only owner or admin can see or delete
export const customerController = {
  // ═══════════════════════════════════════════════════════════
  // LIST — own customers, or all for admins
  // ═══════════════════════════════════════════════════════════
  list: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const data = await customerService.list({
      ...req.query,
      ownerId: req.user.sub,
      isAdmin: req.user.role === 'admin',
    });
    return ApiResponse.ok(res, data);
  }),

  // ═══════════════════════════════════════════════════════════
  // GET ONE
  // ═══════════════════════════════════════════════════════════
  getById: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const customer = await customerService.getById(
      req.params.id,
      req.user.sub,
      req.user.role === 'admin'
    );
    return ApiResponse.ok(res, customer);
  }),

  // ═══════════════════════════════════════════════════════════
  // CREATE — ownerId from JWT
  // ═══════════════════════════════════════════════════════════
  create: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const customer = await customerService.create({
      ...req.body,
      ownerId,
    });
    return ApiResponse.created(res, customer, 'Customer created');
  }),

  // ═══════════════════════════════════════════════════════════
  // UPDATE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  update: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const customer = await customerService.update(
      req.params.id,
      req.body,
      req.user.sub,
      req.user.role === 'admin'
    );
    return ApiResponse.ok(res, customer, 'Customer updated');
  }),

  // ═══════════════════════════════════════════════════════════
  // DELETE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  delete: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    await customerService.delete(
      req.params.id,
      req.user.sub,
      req.user.role === 'admin'
    );
    return ApiResponse.noContent(res);
  }),
};