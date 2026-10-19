// import { prisma } from '../config/database.js';
// import { ApiError } from '../utils/ApiError.js';
// import { uploadService } from './upload.service.js';

// export const productService = {
//   async list({ search, categoryId, subCategoryId, page = 1, limit = 50 } = {}) {
//     page = parseInt(page, 10) || 1;
//     limit = parseInt(limit, 10) || 50;

//     const where = {};
//     if (categoryId) where.categoryId = categoryId;
//     if (subCategoryId) where.subCategoryId = subCategoryId;
//     if (search) {
//       where.OR = [
//         { name: { contains: search, mode: 'insensitive' } },
//         { sku: { contains: search, mode: 'insensitive' } },
//       ];
//     }

//     const [items, total] = await Promise.all([
//       prisma.product.findMany({
//         where,
//         orderBy: { createdAt: 'desc' },
//         skip: (page - 1) * limit,
//         take: limit,
//         include: { category: true },
//       }),
//       prisma.product.count({ where }),
//     ]);

//     return { items, total, page, limit };
//   },

//   async getById(id) {
//     const product = await prisma.product.findUnique({
//       where: { id },
//       include: { category: true },
//     });
//     if (!product)
//       throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
//     return product;
//   },

//   async create(data, imageBuffer) {
//     const sku = data.sku.toUpperCase();
//     const exists = await prisma.product.findUnique({ where: { sku } });
//     if (exists)
//       throw ApiError.conflict('SKU already exists', 'DUPLICATE_SKU');

//     // Validate category
//     const category = await prisma.category.findUnique({
//       where: { id: data.categoryId },
//     });
//     if (!category)
//       throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');

//     // Upload image if provided
//     let imageUrl = null;
//     let imagePublicId = null;
//     if (imageBuffer) {
//       const uploaded = await uploadService.uploadImage(imageBuffer);
//       imageUrl = uploaded?.url;
//       imagePublicId = uploaded?.publicId;
//     }

//     // Use a transaction to create product AND log initial stock
//     return prisma.$transaction(async (tx) => {
//       // ★ REMOVED: price
//       const product = await tx.product.create({
//         data: {
//           name: data.name,
//           sku,
//           categoryId: data.categoryId,
//           costPrice: parseFloat(data.costPrice ?? '0'),
//           quantity: parseInt(data.quantity, 10),
//           lowStockThreshold: parseInt(data.lowStockThreshold || '10', 10),
//           description: data.description || null,
//           imageUrl,
//           imagePublicId,
//         },
//         include: { category: true },
//       });

//       // Log initial stock
//       if (product.quantity > 0) {
//         await tx.stockMovement.create({
//           data: {
//             productId: product.id,
//             quantity: product.quantity,
//             type: 'initial',
//             unitCost: product.costPrice,
//             unitPrice: 0, // ★ No selling price known yet
//             notes: 'Initial stock',
//           },
//         });
//       }
//       return product;
//     });
//   },

//   async update(id, data, imageBuffer) {
//     const existing = await productService.getById(id); // throws if not found

//     if (data.sku) data.sku = data.sku.toUpperCase();

//     if (data.categoryId) {
//       const cat = await prisma.category.findUnique({
//         where: { id: data.categoryId },
//       });
//       if (!cat) {
//         throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
//       }
//     }

//     // handle image
//     let imageUrl = existing.imageUrl;
//     let imagePublicId = existing.imagePublicId;

//     if (imageBuffer) {
//       if (existing.imagePublicId) {
//         await uploadService.deleteImage(existing.imagePublicId);
//       }
//       const uploaded = await uploadService.uploadImage(imageBuffer);
//       imageUrl = uploaded?.url;
//       imagePublicId = uploaded?.publicId;
//     }

//     // Build update payload
//     const updateData = {};
//     if (data.name !== undefined) updateData.name = data.name;
//     if (data.sku !== undefined) updateData.sku = data.sku;
//     if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
//     if (data.costPrice !== undefined) updateData.costPrice = parseFloat(data.costPrice);
//     if (data.quantity !== undefined) updateData.quantity = parseInt(data.quantity, 10);
//     if (data.lowStockThreshold !== undefined)
//       updateData.lowStockThreshold = parseInt(data.lowStockThreshold, 10);
//     if (data.description !== undefined) updateData.description = data.description;
//     if (imageUrl) {
//       updateData.imageUrl = imageUrl;
//       updateData.imagePublicId = imagePublicId;
//     }

//     // wrap in a transaction to update product and log stock
//     return prisma.$transaction(async (tx) => {
//       const newQty = data.quantity !== undefined ? parseInt(data.quantity, 10) : existing.quantity;
//       const qtyDiff = newQty - existing.quantity;

//       if (qtyDiff !== 0) {
//         await tx.stockMovement.create({
//           data: {
//             productId: id,
//             quantity: qtyDiff,
//             type: qtyDiff > 0 ? 'purchase' : 'adjustment',
//             unitCost: data.costPrice !== undefined ? parseFloat(data.costPrice) : existing.costPrice,
//             unitPrice: 0, // ★ No selling price here
//             notes: 'Manual stock update via product edit',
//           },
//         });
//       }

//       return tx.product.update({
//         where: { id },
//         data: updateData,
//         include: { category: true },
//       });
//     });
//   },

//   async delete(id) {
//     const product = await productService.getById(id);
//     if (product.imagePublicId) {
//       await uploadService.deleteImage(product.imagePublicId);
//     }
//     return prisma.product.delete({ where: { id } });
//   },
// };


import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadService } from './upload.service.js';

export const productService = {
  // ═══════════════════════════════════════════════════════════
  // List products (scoped by ownerId)
  // ═══════════════════════════════════════════════════════════
  async list({
    search,
    categoryId,
    subCategoryId,
    page = 1,
    limit = 50,
    
  } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = {};

    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;

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
        include: { category: true },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  // ═══════════════════════════════════════════════════════════
  // Get one product (scoped by ownerId)
  // ═══════════════════════════════════════════════════════════
  async getById(id, ownerId) {
    const product = await prisma.product.findFirst({
      where: {
        id,
        ...(ownerId ? { ownerId } : {}),
      },
      include: { category: true },
    });
    if (!product) {
      throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
    }
    return product;
  },

  // ═══════════════════════════════════════════════════════════
  // Create product (ownerId required)
  // ═══════════════════════════════════════════════════════════
  async create(data, imageBuffer) {
    // ── Validation ────────────────────────────────────────────
    if (!data.ownerId) {
      throw ApiError.badRequest(
        'ownerId is required (authenticated user)',
        'OWNER_ID_REQUIRED'
      );
    }
    if (!data.name || !data.sku || !data.categoryId) {
      throw ApiError.badRequest(
        'name, sku and categoryId are required',
        'MISSING_FIELDS'
      );
    }

    const sku = String(data.sku).trim().toUpperCase();

    const qty = parseInt(data.quantity ?? '0', 10);
    if (Number.isNaN(qty) || qty < 0) {
      throw ApiError.badRequest(
        'quantity must be a non-negative number',
        'INVALID_QUANTITY'
      );
    }

    const costPrice = parseFloat(data.costPrice ?? '0');
    if (Number.isNaN(costPrice) || costPrice < 0) {
      throw ApiError.badRequest(
        'costPrice must be a non-negative number',
        'INVALID_COST_PRICE'
      );
    }

    const lowStockThreshold = parseInt(data.lowStockThreshold ?? '10', 10);

    // ── Duplicate SKU check ───────────────────────────────────
    const exists = await prisma.product.findUnique({ where: { sku } });
    if (exists) {
      throw ApiError.conflict('SKU already exists', 'DUPLICATE_SKU');
    }

    // ── Validate category ─────────────────────────────────────
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
    }

    // ── Upload image if provided ──────────────────────────────
    let imageUrl = null;
    let imagePublicId = null;
    if (imageBuffer) {
      const uploaded = await uploadService.uploadImage(imageBuffer);
      imageUrl = uploaded?.url;
      imagePublicId = uploaded?.publicId;
    }

    // ── Transaction: create product + initial stock movement ──
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          sku,
          categoryId: data.categoryId,
          costPrice,
          quantity: qty,
          lowStockThreshold: Number.isNaN(lowStockThreshold)
            ? 10
            : lowStockThreshold,
          description: data.description || null,
          ownerId: data.ownerId, // ★ from req.user.sub
          imageUrl,
          imagePublicId,
        },
        include: { category: true },
      });

      // Log initial stock — inherit ownerId from the product
      if (product.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: product.quantity,
            type: 'initial',
            unitCost: product.costPrice,
            unitPrice: 0,
            notes: 'Initial stock',
            ownerId: product.ownerId, // ★ inherit
          },
        });
      }

      return product;
    });
  },

  // ═══════════════════════════════════════════════════════════
  // Update product (scoped by ownerId)
  // ═══════════════════════════════════════════════════════════
  async update(id, data, imageBuffer, ownerId) {
    const existing = await productService.getById(id, ownerId); // throws if not found

    if (data.sku) data.sku = String(data.sku).trim().toUpperCase();

    if (data.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!cat) {
        throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
      }
    }

    // ── Handle image ──────────────────────────────────────────
    let imageUrl = existing.imageUrl;
    let imagePublicId = existing.imagePublicId;

    if (imageBuffer) {
      if (existing.imagePublicId) {
        await uploadService.deleteImage(existing.imagePublicId);
      }
      const uploaded = await uploadService.uploadImage(imageBuffer);
      imageUrl = uploaded?.url;
      imagePublicId = uploaded?.publicId;
    }

    // ── Build update payload ──────────────────────────────────
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.costPrice !== undefined) {
      const cp = parseFloat(data.costPrice);
      if (Number.isNaN(cp) || cp < 0) {
        throw ApiError.badRequest(
          'costPrice must be a non-negative number',
          'INVALID_COST_PRICE'
        );
      }
      updateData.costPrice = cp;
    }
    if (data.quantity !== undefined) {
      const q = parseInt(data.quantity, 10);
      if (Number.isNaN(q) || q < 0) {
        throw ApiError.badRequest(
          'quantity must be a non-negative number',
          'INVALID_QUANTITY'
        );
      }
      updateData.quantity = q;
    }
    if (data.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = parseInt(data.lowStockThreshold, 10);
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
      updateData.imagePublicId = imagePublicId;
    }

    // ── Transaction: update product + log stock change ────────
    return prisma.$transaction(async (tx) => {
      const newQty =
        data.quantity !== undefined
          ? parseInt(data.quantity, 10)
          : existing.quantity;

      const qtyDiff = newQty - existing.quantity;

      if (qtyDiff !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            quantity: qtyDiff,
            type: qtyDiff > 0 ? 'purchase' : 'adjustment',
            unitCost:
              data.costPrice !== undefined
                ? parseFloat(data.costPrice)
                : existing.costPrice,
            unitPrice: 0,
            notes: 'Manual stock update via product edit',
            ownerId: existing.ownerId, // ★ FIXED — inherit from product
          },
        });
      }

      return tx.product.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });
    });
  },

  // ═══════════════════════════════════════════════════════════
  // Delete product (scoped by ownerId)
  // ═══════════════════════════════════════════════════════════
  async delete(id, ownerId) {
    const product = await productService.getById(id, ownerId); // throws if not found / not owned

    if (product.imagePublicId) {
      await uploadService.deleteImage(product.imagePublicId);
    }

    return prisma.product.delete({ where: { id } });
  },
};