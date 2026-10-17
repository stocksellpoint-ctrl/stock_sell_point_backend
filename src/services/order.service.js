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
    if (!order) throw ApiError.notFound('Order not found','ORDER_NOT_FOUND');
    return order;
  },

  async create(data) {
    // Transactions require MongoDB replica set
    return prisma.$transaction(async (tx) => {

      const itemsWithCost = [];
      let subTotal = 0;
      let totalDiscount = 0;

      // Verify and reduce stock for each item
      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product)
          throw ApiError.notFound(
          `Product not found: ${item.productId}`,
          "PRODUCT_NOT_FOUND"
        );
        if (product.quantity < item.quantity) {
          throw ApiError.badRequest(
            `Insufficient stock for ${product.name} ` + `(have ${product.quantity}, need ${item.quantity})`,
            'INSUFFICIENT_STOCK'
          );
        }

         // ── Per-item discount computation ───────────────
        let dt = item.discountType || 'none';
        let dv = parseFloat(item.discountValue ?? 0);
        let unitDiscount = 0;

        if (dt === 'percent') {
          dv = Math.max(0, Math.min(100, dv));
          unitDiscount = (item.price * dv) / 100;
        } else if (dt === 'amount') {
          dv = Math.max(0, Math.min(item.price, dv));
          unitDiscount = dv;
        } else {
          dt = 'none';
          dv = 0;
          unitDiscount = 0;
        }

        unitDiscount = Number(unitDiscount.toFixed(2));
        const lineSubtotal = item.price * item.quantity;
        const lineDiscount = unitDiscount * item.quantity;

        subTotal += lineSubtotal;
        totalDiscount += lineDiscount;


        // Decrement stock

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: product.quantity - item.quantity },
        });

        itemsWithCost.push({
          productId:item.productId, 
          productName:product.name, 
          quantity: item.quantity, 
          price:item.price, 
          costPrice:product.costPrice ?? 0, 
          discountType:dt, 
          discountValue: dv, 
          discountAmount: unitDiscount,
        });
      }

      // Verify customer exists
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) throw ApiError.notFound('Customer not found','CUSTOMER_NOT_FOUND');

      const total = Number((subTotal - totalDiscount).toFixed(2));

      // Create order
      return tx.order.create({
        data: {
          customerId: data.customerId,
          customerName: customer.name,
          // items: data.items, 
          items:itemsWithCost,
          subtotal:Number(subTotal.toFixed(2)),
          discountAmount:Number(totalDiscount.toFixed(2)),
          total: data.total,
          status: data.status || 'pending',
          notes: data.notes || null,
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