import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { productService } from '../services/product.service.js';

export const productController = {
  list: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await productService.list(req.query))
  ),
  getById: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await productService.getById(req.params.id))
  ),
  create: asyncHandler(async (req, res) =>
    ApiResponse.created(res, await productService.create(req.body), 'Product created')
  ),
  update: asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await productService.update(req.params.id, req.body),
      'Product updated'
    )
  ),
  delete: asyncHandler(async (req, res) => {
    await productService.delete(req.params.id);
    return ApiResponse.noContent(res);
  }),
};