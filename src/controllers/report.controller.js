import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { reportService } from '../services/report.service.js';

// Here everyone can see everything
// export const reportController = {
//   inventoryReport: asyncHandler(async (req, res) => {
//     const report = await reportService.inventoryReport();
//     return ApiResponse.ok(res, report);
//   }),

//   profitReport: asyncHandler(async (req, res) => {
//     const { from, to } = req.query;
//     if (!from || !to) {
//       throw ApiError.badRequest(
//         'Query params "from" and "to" are required',
//         'MISSING_DATE_RANGE'
//       );
//     }
//     const report = await reportService.profitReport({ from, to });
//     return ApiResponse.ok(res, report);
//   }),
// };



// Here only owner or admin can see product or delete
export const reportController = {
  // ═══════════════════════════════════════════════════════════
  // INVENTORY REPORT — own products, or all for admins
  // ═══════════════════════════════════════════════════════════
  inventoryReport: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const report = await reportService.inventoryReport({
      ownerId: req.user.sub,
      isAdmin: req.user.role === 'admin',
    });
    return ApiResponse.ok(res, report);
  }),

  // ═══════════════════════════════════════════════════════════
  // PROFIT REPORT — own orders/products, or all for admins
  // ═══════════════════════════════════════════════════════════
  profitReport: asyncHandler(async (req, res) => {
    if (!req.user?.sub) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const { from, to } = req.query;
    if (!from || !to) {
      throw ApiError.badRequest(
        'Query params "from" and "to" are required',
        'MISSING_DATE_RANGE'
      );
    }

    const report = await reportService.profitReport({
      from,
      to,
      ownerId: req.user.sub,
      isAdmin: req.user.role === 'admin',
    });
    return ApiResponse.ok(res, report);
  }),
};