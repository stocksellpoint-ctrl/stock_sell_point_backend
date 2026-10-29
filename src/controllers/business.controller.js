import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { businessService } from '../services/business.service.js';

export const businessController = {
  // GET /api/business-info
  get: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const business = await businessService.getOrCreate(ownerId);
    return ApiResponse.ok(res, business);
  }),

  // PUT /api/business-info
  update: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    // req.file.buffer is populated by multer
    const business = await businessService.update(
      ownerId,
      req.body,
      req.file?.buffer
    );

    return ApiResponse.ok(res, business, 'Business information updated');
  }),
};