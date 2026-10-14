import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadService } from './upload.service.js';

export const productService = {
  async list({ search, categoryId, subCategoryId, page = 1, limit = 50 } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if(subCategoryId) where.subCategoryId = subCategoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include:{category:true},
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getById(id) {
    const product = await prisma.product.findUnique({ 
      where: { id },
      include: {category: true},
    });
    if (!product) throw ApiError.notFound(
      'Product not found',
      'PRODUCT_NOT_FOUND'
    );
    return product;
  },

  async create(data,imageBuffer) {
    const sku = data.sku.toUpperCase();
    const exists = await prisma.product.findUnique({ where: { sku } });
    if (exists) throw ApiError.conflict(
      'SKU already exists',
      'DUPLICATE_SKU'
    );

    // Validate category
    const category = await prisma.category.findUnique({
       where:{id: data.categoryId}, 
    });
    if(!category) throw ApiError.badRequest(
      'Category not found',
      'CATEGORY_NOT_FOUND'
    )

    // Upload image if provided 
    let imageUrl = null;
    let imagePublicId = null; 
    if(imageBuffer) {
      const uploaded = await uploadService.uploadImage(imageBuffer);
      imageUrl = uploaded?.url;
      imagePublicId = uploaded?.publicId;
    }
    return prisma.product.create({
      data: { 
        name:data.name,
        sku, 
        categoryId:data.categoryId,
        price: parseFloat(data.price),
        quantity: parseInt(data.quantity, 10),
        lowStockThreshold: parseInt(data.lowStockThreshold || '10', 10),
        description:data.description || null, 
        imageUrl,
        imagePublicId
       },
       include: {category:true},
    });
  },

  async update(id, data, imageBuffer) {
    const existing = await productService.getById(id); // throws if not found

    if (data.sku) data.sku = data.sku.toUpperCase();

    if(data.categoryId){
      const cat = await prisma.category.findUnique({
        where:{id:data.categoryId},
      });
      if(!cat){
        throw ApiError.badRequest('Category not found','CATEGORY_NOT_FOUND');
      }
    }

    // handle image
    let imageUrl = existing.imageUrl;
    let imagePublicId= existing.imagePublicId;

    if(imageBuffer){
      // Delete old image
      if(existing.imagePublicId){
        await uploadService.deleteImage(existing.imagePublicId);
      }
      const uploaded = await uploadService.uploadImage(imageBuffer);
      imageUrl = uploaded?.url;
      imagePublicId = uploaded?.publicId;
    }

    // Build update payload (convert numeric fields)
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.quantity !== undefined) updateData.quantity = parseInt(data.quantity, 10);
    if (data.lowStockThreshold !== undefined)
      updateData.lowStockThreshold = parseInt(data.lowStockThreshold, 10);
    if (data.description !== undefined) updateData.description = data.description;
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
      updateData.imagePublicId = imagePublicId;
    }

    return prisma.product.update({ 
      where: { id }, 
      data: updateData,
      include: {category:true}, 
    });
  },

  async delete(id) {
    const product = await productService.getById(id);
    if(product.imagePublicId){
      await uploadService.deleteImage(product.imagePublicId);
    }
    return prisma.product.delete({ where: { id } });
  },
};









