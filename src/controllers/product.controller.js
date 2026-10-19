import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { productService } from '../services/product.service.js';

export const productController = {
  list: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await productService.list(req.query))
  ),
  getById: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await productService.getById(req.params.id))
  ),

  create: asyncHandler(async (req, res) => {
    const {
      name, sku, categoryId, costPrice, quantity,
      lowStockThreshold, description,
    } = req.body;

    const validationErrors = [];
    if (!name) validationErrors.push({ field: 'name', message: 'Name required' });
    if (!sku) validationErrors.push({ field: 'sku', message: 'SKU required' });
    if (!categoryId) validationErrors.push({ field: 'categoryId', message: 'Category required' });
    
    const costNum = parseFloat(costPrice);
    if (isNaN(costNum) || costNum < 0) {
      validationErrors.push({ field: 'costPrice', message: 'Valid cost price required' });
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      validationErrors.push({ field: 'quantity', message: 'Valid quantity required' });
    }

    if (validationErrors.length > 0) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', validationErrors);
    }

    const product = await productService.create(
      {
        name: name.trim(),
        sku: sku.toUpperCase().trim(),
        categoryId,
        costPrice: costNum,
        quantity: qtyNum,
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : 10,
        description: description || null,
      },
      req.file?.buffer
    );

    return ApiResponse.created(res, product, 'Product created');
  }),

  update: asyncHandler(async (req, res) => {
    const product = await productService.update(
      req.params.id,
      req.body,
      req.file?.buffer
    );
    return ApiResponse.ok(res, product, 'Product updated');
  }),

  delete: asyncHandler(async (req, res) => {
    await productService.delete(req.params.id);
    return ApiResponse.noContent(res);
  }),
};