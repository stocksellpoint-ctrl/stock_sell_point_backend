
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadService } from './upload.service.js';

// Build the ownership clause shared by every read/write op
function ownerWhere(ownerId, isAdmin) {
  return isAdmin ? {} : { ownerId };
}

// Normalize an optional SKU: '' or undefined → null, otherwise uppercase trim.
function normalizeSku(sku) {
  if (sku === undefined || sku === null) return null;
  const trimmed = String(sku).trim();
  return trimmed ? trimmed.toUpperCase() : null;
}


// Here everyone can see everything
// export const productService = {
//   // ═══════════════════════════════════════════════════════════
//   // List products (scoped by ownerId)
//   // ═══════════════════════════════════════════════════════════
//   async list({
//     search,
//     categoryId,
//     subCategoryId,
//     page = 1,
//     limit = 50,
    
//   } = {}) {
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

//   // ═══════════════════════════════════════════════════════════
//   // Get one product (scoped by ownerId)
//   // ═══════════════════════════════════════════════════════════
//   async getById(id, ownerId) {
//     const product = await prisma.product.findFirst({
//       where: {
//         id,
//         ...(ownerId ? { ownerId } : {}),
//       },
//       include: { category: true },
//     });
//     if (!product) {
//       throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
//     }
//     return product;
//   },

//   // ═══════════════════════════════════════════════════════════
//   // Create product (ownerId required)
//   // ═══════════════════════════════════════════════════════════
//   async create(data, imageBuffer) {
//     // ── Validation ────────────────────────────────────────────
//     if (!data.ownerId) {
//       throw ApiError.badRequest(
//         'ownerId is required (authenticated user)',
//         'OWNER_ID_REQUIRED'
//       );
//     }
//     if (!data.name || !data.sku || !data.categoryId) {
//       throw ApiError.badRequest(
//         'name, sku and categoryId are required',
//         'MISSING_FIELDS'
//       );
//     }

//     const sku = String(data.sku).trim().toUpperCase();

//     const qty = parseInt(data.quantity ?? '0', 10);
//     if (Number.isNaN(qty) || qty < 0) {
//       throw ApiError.badRequest(
//         'quantity must be a non-negative number',
//         'INVALID_QUANTITY'
//       );
//     }

//     const costPrice = parseFloat(data.costPrice ?? '0');
//     if (Number.isNaN(costPrice) || costPrice < 0) {
//       throw ApiError.badRequest(
//         'costPrice must be a non-negative number',
//         'INVALID_COST_PRICE'
//       );
//     }

//     const lowStockThreshold = parseInt(data.lowStockThreshold ?? '10', 10);

//     // ── Duplicate SKU check ───────────────────────────────────
//     const exists = await prisma.product.findUnique({ where: { sku } });
//     if (exists) {
//       throw ApiError.conflict('SKU already exists', 'DUPLICATE_SKU');
//     }

//     // ── Validate category ─────────────────────────────────────
//     const category = await prisma.category.findUnique({
//       where: { id: data.categoryId },
//     });
//     if (!category) {
//       throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
//     }

//     // ── Upload image if provided ──────────────────────────────
//     let imageUrl = null;
//     let imagePublicId = null;
//     if (imageBuffer) {
//       const uploaded = await uploadService.uploadImage(imageBuffer);
//       imageUrl = uploaded?.url;
//       imagePublicId = uploaded?.publicId;
//     }

//     // ── Transaction: create product + initial stock movement ──
//     return prisma.$transaction(async (tx) => {
//       const product = await tx.product.create({
//         data: {
//           name: data.name,
//           sku,
//           categoryId: data.categoryId,
//           costPrice,
//           quantity: qty,
//           lowStockThreshold: Number.isNaN(lowStockThreshold)
//             ? 10
//             : lowStockThreshold,
//           description: data.description || null,
//           ownerId: data.ownerId, // ★ from req.user.sub
//           imageUrl,
//           imagePublicId,
//         },
//         include: { category: true },
//       });

//       // Log initial stock — inherit ownerId from the product
//       if (product.quantity > 0) {
//         await tx.stockMovement.create({
//           data: {
//             productId: product.id,
//             quantity: product.quantity,
//             type: 'initial',
//             unitCost: product.costPrice,
//             unitPrice: 0,
//             notes: 'Initial stock',
//             ownerId: product.ownerId, // ★ inherit
//           },
//         });
//       }

//       return product;
//     });
//   },

//   // ═══════════════════════════════════════════════════════════
//   // Update product (scoped by ownerId)
//   // ═══════════════════════════════════════════════════════════
//   async update(id, data, imageBuffer) {
//     const existing = await prisma.product.findUnique({
//       where:{id},
//       include:{category:true},
//     }) // throws if not found

//     if (data.sku) data.sku = String(data.sku).trim().toUpperCase();

//     if (data.categoryId) {
//       const cat = await prisma.category.findUnique({
//         where: { id: data.categoryId },
//       });
//       if (!cat) {
//         throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
//       }
//     }

//     // ── Handle image ──────────────────────────────────────────
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

//     // ── Build update payload ──────────────────────────────────
//     const updateData = {};
//     if (data.name !== undefined) updateData.name = data.name;
//     if (data.sku !== undefined) updateData.sku = data.sku;
//     if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
//     if (data.costPrice !== undefined) {
//       const cp = parseFloat(data.costPrice);
//       if (Number.isNaN(cp) || cp < 0) {
//         throw ApiError.badRequest(
//           'costPrice must be a non-negative number',
//           'INVALID_COST_PRICE'
//         );
//       }
//       updateData.costPrice = cp;
//     }
//     if (data.quantity !== undefined) {
//       const q = parseInt(data.quantity, 10);
//       if (Number.isNaN(q) || q < 0) {
//         throw ApiError.badRequest(
//           'quantity must be a non-negative number',
//           'INVALID_QUANTITY'
//         );
//       }
//       updateData.quantity = q;
//     }
//     if (data.lowStockThreshold !== undefined) {
//       updateData.lowStockThreshold = parseInt(data.lowStockThreshold, 10);
//     }
//     if (data.description !== undefined) {
//       updateData.description = data.description;
//     }
//     if (imageUrl) {
//       updateData.imageUrl = imageUrl;
//       updateData.imagePublicId = imagePublicId;
//     }

//     // ── Transaction: update product + log stock change ────────
//     return prisma.$transaction(async (tx) => {
//       const newQty =
//         data.quantity !== undefined
//           ? parseInt(data.quantity, 10)
//           : existing.quantity;

//       const qtyDiff = newQty - existing.quantity;

//       if (qtyDiff !== 0) {
//         await tx.stockMovement.create({
//           data: {
//             productId: id,
//             quantity: qtyDiff,
//             type: qtyDiff > 0 ? 'purchase' : 'adjustment',
//             unitCost:
//               data.costPrice !== undefined
//                 ? parseFloat(data.costPrice)
//                 : existing.costPrice,
//             unitPrice: 0,
//             notes: 'Manual stock update via product edit',
//             ownerId: existing.ownerId, // ★ FIXED — inherit from product
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

//   // ═══════════════════════════════════════════════════════════
//   // Delete product (scoped by ownerId)
//   // ═══════════════════════════════════════════════════════════
//   async delete(id) {
//     const product = await prisma.product.findUnique({where:{id}}); // throws if not found / not owned

//     if (!product) {
//       throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
//     }

//     if (product.imagePublicId) {
//       await uploadService.deleteImage(product.imagePublicId);
//     }

//     return prisma.product.delete({ where: { id } });
//   },
// };


// Here only owner or admin can see products or delete
export const productService = {
  // ═══════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════
  async list({
    search, categoryId, subCategoryId,
    page = 1, limit = 50,
    ownerId, isAdmin = false,
  } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = { ...ownerWhere(ownerId, isAdmin) };

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
  // GET ONE
  // ═══════════════════════════════════════════════════════════
  async getById(id, ownerId, isAdmin = false) {
    const product = await prisma.product.findFirst({
      where: { id, ...ownerWhere(ownerId, isAdmin) },
      include: { category: true },
    });
    if (!product) {
      throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
    }
    return product;
  },

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════
  async create(data, imageBuffer) {
    if (!data.ownerId) {
      throw ApiError.badRequest(
        'ownerId is required (authenticated user)',
        'OWNER_ID_REQUIRED'
      );
    }
    if (!data.name || !data.categoryId) {
      throw ApiError.badRequest(
        'name and categoryId are required',
        'MISSING_FIELDS'
      );
    }

    const sku = normalizeSku(data.sku);

    const qty = parseInt(data.quantity ?? '0', 10);
    if (Number.isNaN(qty) || qty < 0) {
      throw ApiError.badRequest('quantity must be a non-negative number', 'INVALID_QUANTITY');
    }

    const costPrice = parseFloat(data.costPrice ?? '0');
    if (Number.isNaN(costPrice) || costPrice < 0) {
      throw ApiError.badRequest('costPrice must be a non-negative number', 'INVALID_COST_PRICE');
    }

    const lowStockThreshold = parseInt(data.lowStockThreshold ?? '10', 10);

    // // SKU must be unique per-owner (not globally — two tenants can share SKUs)
    // const exists = await prisma.product.findFirst({
    //   where: { sku, ownerId: data.ownerId },
    // });
    // if (exists) {
    //   throw ApiError.conflict('SKU already exists', 'DUPLICATE_SKU');
    // }

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, ownerId:data.ownerId },
    });
    if (!category) {
      throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
    }

    let imageUrl = null;
    let imagePublicId = null;
    if (imageBuffer) {
      const uploaded = await uploadService.uploadImage(imageBuffer);
      imageUrl = uploaded?.url;
      imagePublicId = uploaded?.publicId;
    }

    return prisma.$transaction(async (tx) => {

      const product = await tx.product.create({
        data: {
          name: data.name,
          sku,              // may be null
          categoryId: data.categoryId,
          costPrice,
          quantity: qty,
          lowStockThreshold: Number.isNaN(lowStockThreshold) ? 10 : lowStockThreshold,
          description: data.description || null,
          ownerId: data.ownerId,
          imageUrl,
          imagePublicId,
        },
        include: { category: true },
      });

      if (product.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: product.quantity,
            type: 'initial',
            unitCost: product.costPrice,
            unitPrice: 0,
            notes: 'Initial stock',
            ownerId: product.ownerId,
          },
        });
      }
      return product;
    });
  },

  // ═══════════════════════════════════════════════════════════
  // UPDATE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async update(id, data, imageBuffer, ownerId, isAdmin = false) {
    const existing = await productService.getById(id, ownerId, isAdmin);

    if (data.sku !== undefined){
      data.sku = normalizeSku(data.sku);
    } 

    if (data.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: data.categoryId , ownerId:existing.ownerId},
      });
      if (!cat) {
        throw ApiError.badRequest('Category not found', 'CATEGORY_NOT_FOUND');
      }
    }

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

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.costPrice !== undefined) {
      const cp = parseFloat(data.costPrice);
      if (Number.isNaN(cp) || cp < 0) {
        throw ApiError.badRequest('costPrice must be a non-negative number', 'INVALID_COST_PRICE');
      }
      updateData.costPrice = cp;
    }
    if (data.quantity !== undefined) {
      const q = parseInt(data.quantity, 10);
      if (Number.isNaN(q) || q < 0) {
        throw ApiError.badRequest('quantity must be a non-negative number', 'INVALID_QUANTITY');
      }
      updateData.quantity = q;
    }
    if (data.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = parseInt(data.lowStockThreshold, 10);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
      updateData.imagePublicId = imagePublicId;
    }

    return prisma.$transaction(async (tx) => {
      const newQty = data.quantity !== undefined
        ? parseInt(data.quantity, 10)
        : existing.quantity;
      const qtyDiff = newQty - existing.quantity;

      if (qtyDiff !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            quantity: qtyDiff,
            type: qtyDiff > 0 ? 'purchase' : 'adjustment',
            unitCost: data.costPrice !== undefined
              ? parseFloat(data.costPrice)
              : existing.costPrice,
            unitPrice: 0,
            notes: 'Manual stock update via product edit',
            ownerId: existing.ownerId,
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
  // DELETE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async delete(id, ownerId, isAdmin = false) {
    const product = await productService.getById(id, ownerId, isAdmin);

    if (product.imagePublicId) {
      await uploadService.deleteImage(product.imagePublicId);
    }

    return prisma.product.delete({ where: { id } });
  },
};