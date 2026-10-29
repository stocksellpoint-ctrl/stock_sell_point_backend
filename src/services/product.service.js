
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';
import { getUniqueSku } from '../utils/GenerateSku.js';
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
    // --- Validation ---
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

    

    const qty = parseInt(data.quantity ?? '0', 10);
    if (Number.isNaN(qty) || qty < 0) {
      throw ApiError.badRequest('quantity must be a non-negative number', 'INVALID_QUANTITY');
    }

    const costPrice = parseFloat(data.costPrice ?? '0');
    if (Number.isNaN(costPrice) || costPrice < 0) {
      throw ApiError.badRequest('costPrice must be a non-negative number', 'INVALID_COST_PRICE');
    }

    const lowStockThreshold = parseInt(data.lowStockThreshold ?? '10', 10);

    // --- SKU Logic ---
    const userProvidedSku = normalizeSku(data.sku); 
    // This will auto-generate if null, or check & append suffix if taken
    const sku = await getUniqueSku(userProvidedSku, data.ownerId);
    // const sku = normalizeSku(data.sku);

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
        try {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              quantity: product.quantity,
              type: 'initial',
              unitCost: product.costPrice ?? 0,   // ← fallback for null
              unitPrice: 0,
              notes: 'Initial stock',
              ownerId: product.ownerId,
            },
          });
        } catch (stockErr) {
          console.error('STOCK MOVEMENT FAILED:', stockErr);
          throw stockErr; // re-throw so transaction rolls back
        }
      }
      return product;
    });
  },

  // ═══════════════════════════════════════════════════════════
  // UPDATE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async update(id, data, imageBuffer, ownerId, isAdmin = false) {
    const existing = await productService.getById(id, ownerId, isAdmin);

     // --- SKU Logic ---
    let skuToUpdate = existing.sku; // Keep existing by default

    if (data.sku !== undefined) {
      const userProvidedSku = normalizeSku(data.sku);

      if (!userProvidedSku) {
        // If user cleared the SKU field, generate an auto-SKU
        skuToUpdate = await getUniqueSku(null, existing.ownerId, id);
      } else if (userProvidedSku !== existing.sku) {
        // If user typed a new SKU, ensure it's unique (append suffix if taken)
        skuToUpdate = await getUniqueSku(userProvidedSku, existing.ownerId, id);
      }
    } 

    // --- Category Validation ---
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
    if (data.sku !== undefined) updateData.sku = skuToUpdate; // Apply the processed SKU
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

    // --- Database Transaction ---
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