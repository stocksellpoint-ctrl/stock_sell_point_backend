import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { categoryService } from '../services/category.service.js';

export const categoryController = {
  list: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await categoryService.list(req.query))
  ),
  tree: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await categoryService.tree())
  ),
  getById: asyncHandler(async (req, res) =>
    ApiResponse.ok(res, await categoryService.getById(req.params.id))
  ),
  create: asyncHandler(async (req, res) =>
    ApiResponse.created(
      res,
      await categoryService.create(req.body),
      'Category created'
    )
  ),
  update: asyncHandler(async (req, res) =>
    ApiResponse.ok(
      res,
      await categoryService.update(req.params.id, req.body),
      'Category updated'
    )
  ),
  delete: asyncHandler(async (req, res) => {
    await categoryService.delete(req.params.id);
    return ApiResponse.noContent(res);
  }),
};