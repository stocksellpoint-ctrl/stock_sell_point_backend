import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { categoryService } from '../services/category.service.js';


// Here everyone can see everything
// export const categoryController = {
//   list: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await categoryService.list(req.query))
//   ),
//   tree: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await categoryService.tree())
//   ),
//   getById: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await categoryService.getById(req.params.id))
//   ),
//   create: asyncHandler(async (req, res) =>
//     ApiResponse.created(
//       res,
//       await categoryService.create(req.body),
//       'Category created'
//     )
//   ),
//   update: asyncHandler(async (req, res) =>
//     ApiResponse.ok(
//       res,
//       await categoryService.update(req.params.id, req.body),
//       'Category updated'
//     )
//   ),
//   delete: asyncHandler(async (req, res) => {
//     await categoryService.delete(req.params.id);
//     return ApiResponse.noContent(res);
//   }),
// };



export const categoryController = {
  // ═══════════════════════════════════════════════════════════
  // LIST — own categories (or all for admin)
  // ═══════════════════════════════════════════════════════════
  list: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const data = await categoryService.list({
      ...req.query,
      ownerId: req.user.sub,
      isAdmin: req.user.role === 'admin',
    });
    return ApiResponse.ok(res, data);
  }),

  // ═══════════════════════════════════════════════════════════
  // TREE — own category tree (or all for admin)
  // ═══════════════════════════════════════════════════════════
  tree: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const data = await categoryService.tree({
      ownerId: req.user.sub,
      isAdmin: req.user.role === 'admin',
    });
    return ApiResponse.ok(res, data);
  }),

  // ═══════════════════════════════════════════════════════════
  // GET ONE — owner OR admin (404 if not owned)
  // ═══════════════════════════════════════════════════════════
  getById: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const category = await categoryService.getById(
      req.params.id,
      req.user.sub,
      req.user.role === 'admin'
    );
    return ApiResponse.ok(res, category);
  }),

  // ═══════════════════════════════════════════════════════════
  // CREATE — ownerId from JWT
  // ═══════════════════════════════════════════════════════════
  create: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const category = await categoryService.create({
      ...req.body,
      ownerId,
    });
    return ApiResponse.created(res, category, 'Category created');
  }),

  // ═══════════════════════════════════════════════════════════
  // UPDATE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  update: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    const category = await categoryService.update(
      req.params.id,
      req.body,
      req.user.sub,
      req.user.role === 'admin'
    );
    return ApiResponse.ok(res, category, 'Category updated');
  }),

  // ═══════════════════════════════════════════════════════════
  // DELETE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  delete: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }
    await categoryService.delete(
      req.params.id,
      req.user.sub,
      req.user.role === 'admin'
    );
    return ApiResponse.noContent(res);
  }),
};