import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

export const productService = {
  async list({ search, category, page = 1, limit = 50 } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = {};
    if (category) where.category = category;
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
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getById(id) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound('Product not found');
    return product;
  },

  async create(data) {
    const sku = data.sku.toUpperCase();
    const exists = await prisma.product.findUnique({ where: { sku } });
    if (exists) throw ApiError.conflict('SKU already exists');

    return prisma.product.create({ data: { ...data, sku } });
  },

  async update(id, data) {
    await productService.getById(id); // throws if not found

    if (data.sku) data.sku = data.sku.toUpperCase();

    return prisma.product.update({ where: { id }, data });
  },

  async delete(id) {
    await productService.getById(id);
    return prisma.product.delete({ where: { id } });
  },
};