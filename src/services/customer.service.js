import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

export const customerService = {
  async list({ search, page = 1, limit = 50 } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getById(id) {
    const c = await prisma.customer.findUnique({ where: { id } });
    if (!c) throw ApiError.notFound('Customer not found');
    return c;
  },

  async create(data) {
    return prisma.customer.create({ data });
  },

  async update(id, data) {
    await customerService.getById(id);
    return prisma.customer.update({ where: { id }, data });
  },

  async delete(id) {
    await customerService.getById(id);
    return prisma.customer.delete({ where: { id } });
  },
};