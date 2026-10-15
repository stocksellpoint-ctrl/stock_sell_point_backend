import { reportService } from '../services/report.service.js';

export const reportController = {
  inventoryReport: asyncHandler(async (req, res) => {
    const report = await reportService.inventoryReport();
    return ApiResponse.ok(res, report);
  }),

  profitReport: asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
      throw ApiError.badRequest(
        'Query params "from" and "to" are required',
        'MISSING_DATE_RANGE'
      );
    }
    const report = await reportService.profitReport({ from, to });
    return ApiResponse.ok(res, report);
  }),
};