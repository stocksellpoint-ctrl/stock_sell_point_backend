import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { businessService } from '../services/business.service.js';

export const businessController = {
  // GET /api/business-info/check
  check: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');

    const result = await businessService.checkSetup(ownerId);
    return ApiResponse.ok(res, result); // Returns { isSetup: true/false }
  }),

  // GET /api/business-info
  get: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');

    const business = await businessService.get(ownerId);
    // Returns null if not setup
    return ApiResponse.ok(res, business); 
  }),

  // PUT /api/business-info
  upsert: asyncHandler(async (req, res) => {
    const ownerId = req.user?.sub;
    if (!ownerId) throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');

    const business = await businessService.upsert(ownerId, req.body, req.file?.buffer);
    return ApiResponse.ok(res, business, 'Business info saved');
  }),
};