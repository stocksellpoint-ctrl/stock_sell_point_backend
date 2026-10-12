import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

export const orderService = {
  async list({ status, customerId, page = 1, limit = 50 } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getById(id) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw ApiError.notFound('Order not found');
    return order;
  },

  async create(data) {
    // Transactions require MongoDB replica set
    return prisma.$transaction(async (tx) => {
      // Verify and reduce stock for each item
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product)
          throw ApiError.notFound(`Product not found: ${item.productId}`);
        if (product.quantity < item.quantity) {
          throw ApiError.badRequest(
            `Insufficient stock for ${product.name} (have ${product.quantity}, need ${item.quantity})`
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: product.quantity - item.quantity },
        });
      }

      // Verify customer exists
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) throw ApiError.notFound('Customer not found');

      // Create order
      return tx.order.create({
        data: {
          customerId: data.customerId,
          customerName: customer.name,
          items: data.items,
          total: data.total,
          status: data.status || 'pending',
          notes: data.notes,
        },
      });
    });
  },

  async updateStatus(id, status) {
    await orderService.getById(id);
    return prisma.order.update({ where: { id }, data: { status } });
  },

  async delete(id) {
    await orderService.getById(id);
    return prisma.order.delete({ where: { id } });
  },
};