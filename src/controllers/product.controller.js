// import { asyncHandler } from '../utils/asyncHandler.js';
// import { ApiResponse } from '../utils/ApiResponse.js';
// import { ApiError } from '../utils/ApiError.js';
// import { productService } from '../services/product.service.js';

// export const productController = {
//   list: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await productService.list(req.query))
//   ),
//   getById: asyncHandler(async (req, res) =>
//     ApiResponse.ok(res, await productService.getById(req.params.id))
//   ),

//   create: asyncHandler(async (req, res) => {
//     const {
//       name, sku, categoryId, costPrice, quantity,
//       lowStockThreshold, description,
//     } = req.body;

//     const validationErrors = [];
//     if (!name) validationErrors.push({ field: 'name', message: 'Name required' });
//     if (!sku) validationErrors.push({ field: 'sku', message: 'SKU required' });
//     if (!categoryId) validationErrors.push({ field: 'categoryId', message: 'Category required' });
    
//     const costNum = parseFloat(costPrice);
//     if (isNaN(costNum) || costNum < 0) {
//       validationErrors.push({ field: 'costPrice', message: 'Valid cost price required' });
//     }

//     const qtyNum = parseInt(quantity, 10);
//     if (isNaN(qtyNum) || qtyNum < 0) {
//       validationErrors.push({ field: 'quantity', message: 'Valid quantity required' });
//     }

//     if (validationErrors.length > 0) {
//       throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', validationErrors);
//     }

//     const product = await productService.create(
//       {
//         name: name.trim(),
//         sku: sku.toUpperCase().trim(),
//         categoryId,
//         costPrice: costNum,
//         quantity: qtyNum,
//         lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : 10,
//         description: description || null,
//       },
//       req.file?.buffer
//     );

//     return ApiResponse.created(res, product, 'Product created');
//   }),

//   update: asyncHandler(async (req, res) => {
//     const product = await productService.update(
//       req.params.id,
//       req.body,
//       req.file?.buffer
//     );
//     return ApiResponse.ok(res, product, 'Product updated');
//   }),

//   delete: asyncHandler(async (req, res) => {
//     await productService.delete(req.params.id);
//     return ApiResponse.noContent(res);
//   }),
// };


import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { productService } from '../services/product.service.js';

export const productController = {
  // ═══════════════════════════════════════════════════════════
  // LIST — scoped to the authenticated user
  // ═══════════════════════════════════════════════════════════
  list: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const data = await productService.list(req.query);

    return ApiResponse.ok(res, data);
  }),

  // ═══════════════════════════════════════════════════════════
  // GET ONE — scoped to the authenticated user
  // ═══════════════════════════════════════════════════════════
  getById: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const product = await productService.getById(req.params.id, ownerId);
    return ApiResponse.ok(res, product);
  }),

  // ═══════════════════════════════════════════════════════════
  // CREATE — ownerId from JWT
  // ═══════════════════════════════════════════════════════════
  create: asyncHandler(async (req, res) => {
    const {
      name,
      sku,
      categoryId,
      costPrice,
      quantity,
      lowStockThreshold,
      description,
    } = req.body;

    const ownerId = req.user?.sub;

    // ── Validation ────────────────────────────────────────────
    const validationErrors = [];

    if (!name || !String(name).trim()) {
      validationErrors.push({ field: 'name', message: 'Name required' });
    }
    if (!sku || !String(sku).trim()) {
      validationErrors.push({ field: 'sku', message: 'SKU required' });
    }
    if (!categoryId) {
      validationErrors.push({
        field: 'categoryId',
        message: 'Category required',
      });
    }

    const costNum = parseFloat(costPrice);
    if (Number.isNaN(costNum) || costNum < 0) {
      validationErrors.push({
        field: 'costPrice',
        message: 'Valid cost price required',
      });
    }

    const qtyNum = parseInt(quantity, 10);
    if (Number.isNaN(qtyNum) || qtyNum < 0) {
      validationErrors.push({
        field: 'quantity',
        message: 'Valid quantity required',
      });
    }

    if (!ownerId) {
      validationErrors.push({
        field: 'ownerId',
        message: 'Authenticated user not found',
      });
    }

    if (validationErrors.length > 0) {
      throw ApiError.badRequest(
        'Validation failed',
        'VALIDATION_ERROR',
        validationErrors
      );
    }

    // ── Create ────────────────────────────────────────────────
    const product = await productService.create(
      {
        name: String(name).trim(),
        sku: String(sku).toUpperCase().trim(),
        categoryId,
        costPrice: costNum,
        quantity: qtyNum,
        lowStockThreshold: lowStockThreshold
          ? parseInt(lowStockThreshold, 10)
          : 10,
        description: description || null,
        ownerId, // ★ from the JWT via auth middleware
      },
      req.file?.buffer
    );

    return ApiResponse.created(res, product, 'Product created');
  }),

  // ═══════════════════════════════════════════════════════════
  // UPDATE — scoped to the authenticated user
  // ═══════════════════════════════════════════════════════════
  update: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const product = await productService.update(
      req.params.id,
      req.body,
      req.file?.buffer,
    
    );

    return ApiResponse.ok(res, product, 'Product updated');
  }),

  // ═══════════════════════════════════════════════════════════
  // DELETE — scoped to the authenticated user
  // ═══════════════════════════════════════════════════════════
  delete: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    // Only admins can delete others' products
    if (req.user.role !== 'admin') {
      // owners can still delete their own
      const product = await productService.getById(req.params.id, req.user.sub);
      await productService.delete(req.params.id);
      return ApiResponse.noContent(res);
    }

    await productService.delete(req.params.id);
    return ApiResponse.noContent(res);
  }),
};