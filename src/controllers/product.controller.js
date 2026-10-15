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

  // create: asyncHandler(async (req, res) =>
  //   ApiResponse.created(res, await productService.create(req.body), 'Product created')
  // ),
  create:asyncHandler(async(req,res)=>{
    // multipart/form-data -> all fields come in as strings
    const {
      name,sku,categoryId, price, costPrice, quantity, lowStockThreshold, description} = req.body;

    if(!name || !sku || !categoryId || !price || !quantity){
      throw ApiError.badRequest(
        'Missing required fields: name, sku, categoryId, price, quantity',
        'MISSING_FIELDS'
      );
    }

    const costNum = parseFloat(costPrice);
    if (isNaN(costNum) || costNum < 0) {
      validationErrors.push({
        field: 'costPrice',
        message: `Cost price must be a non-negative number, got "${costPrice}"`,
      });
    }

    const product = await productService.create(
      { 
        name, sku, categoryId, price, costPrice:costNum, quantity, lowStockThreshold, description },
      req.file?.buffer
    );

    return ApiResponse.created(res, product, 'Product created');
  }),

  update: asyncHandler(async (req, res) =>{
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