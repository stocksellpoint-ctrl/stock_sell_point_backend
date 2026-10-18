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

  

  // async create(data) {

  //   console.log('═══════════════════════════════════════');
  //   console.log('CREATE ORDER — incoming data');
  //   console.log('customerId:', data.customerId);
  //   console.log('items count:', data.items?.length);
  //   console.log('═══════════════════════════════════════');

  //   return prisma.$transaction(async (tx) => {
  //     const itemsWithCost = [];
  //     let subtotal = 0;
  //     let totalDiscount = 0;

  //     for (const item of data.items) {
  //       // ── Force numbers (defensive) ─────────────────────
  //       const qty = Number(item.quantity);
  //       const unitPrice = Number(item.price);
  //       const rawDiscValue = Number(item.discountValue ?? 0);
  //       const discType = item.discountType || 'none';

  //       console.log(
  //         `ITEM: ${item.productName} | qty=${qty} | price=${unitPrice} | ` +
  //           `disc=${discType}/${rawDiscValue}`
  //       );

  //       if (!Number.isFinite(qty) || qty <= 0) {
  //         throw ApiError.badRequest(
  //           `Invalid quantity for ${item.productName}`,
  //           'INVALID_QUANTITY'
  //         );
  //       }
  //       if (!Number.isFinite(unitPrice) || unitPrice < 0) {
  //         throw ApiError.badRequest(
  //           `Invalid price for ${item.productName}`,
  //           'INVALID_PRICE'
  //         );
  //       }

  //       const product = await tx.product.findUnique({
  //         where: { id: item.productId },
  //       });
  //       if (!product) {
  //         throw ApiError.notFound(
  //           `Product not found: ${item.productId}`,
  //           'PRODUCT_NOT_FOUND'
  //         );
  //       }
  //       if (product.quantity < qty) {
  //         throw ApiError.badRequest(
  //           `Insufficient stock for ${product.name} ` +
  //             `(have ${product.quantity}, need ${qty})`,
  //           'INSUFFICIENT_STOCK'
  //         );
  //       }

  //       // ── Per-item discount ─────────────────────────────
  //       let dt = discType;
  //       let dv = rawDiscValue;
  //       let unitDiscount = 0;

  //       if (dt === 'percent') {
  //         dv = Math.max(0, Math.min(100, dv));
  //         unitDiscount = (unitPrice * dv) / 100;
  //       } else if (dt === 'amount') {
  //         dv = Math.max(0, Math.min(unitPrice, dv));
  //         unitDiscount = dv;
  //       } else {
  //         dt = 'none';
  //         dv = 0;
  //         unitDiscount = 0;
  //       }

  //       unitDiscount = Number(unitDiscount.toFixed(2));
  //       const lineSubtotal = unitPrice * qty;
  //       const lineDiscount = unitDiscount * qty;

  //       console.log(
  //         `  → lineSubtotal=${lineSubtotal}, unitDiscount=${unitDiscount}, ` +
  //           `lineDiscount=${lineDiscount}`
  //       );

  //       subtotal += lineSubtotal;
  //       totalDiscount += lineDiscount;

  //       await tx.product.update({
  //         where: { id: item.productId },
  //         data: { quantity: product.quantity - qty },
  //       });

  //       itemsWithCost.push({
  //         productId: item.productId,
  //         productName: product.name,
  //         categoryId:product.categoryId,
  //         quantity: qty,
  //         price: unitPrice,
  //         costPrice: Number(product.costPrice) || 0,
  //         discountType: dt,
  //         discountValue: dv,
  //         discountAmount: unitDiscount,
  //       });
  //     }

  //     const customer = await tx.customer.findUnique({
  //       where: { id: data.customerId },
  //     });
  //     if (!customer) {
  //       throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  //     }

  //     // ── Final totals ────────────────────────────────────
  //     subtotal = Number(subtotal.toFixed(2));
  //     totalDiscount = Number(totalDiscount.toFixed(2));
  //     const total = Number((subtotal - totalDiscount).toFixed(2));

  //     console.log('═══════════════════════════════════════');
  //     console.log('FINAL TOTALS');
  //     console.log('subtotal:', subtotal);
  //     console.log('totalDiscount:', totalDiscount);
  //     console.log('total:', total);
  //     console.log('═══════════════════════════════════════');

  //     // ── Sanity check ────────────────────────────────────
  //     if (!Number.isFinite(total) || total < 0) {
  //       console.error('CRITICAL: Invalid total computed', {
  //         subtotal,
  //         totalDiscount,
  //         total,
  //       });
  //       throw ApiError.internal(
  //         'Could not compute order total',
  //         'TOTAL_COMPUTE_ERROR'
  //       );
  //     }

  //     const orderData = {
  //       customerId: data.customerId,
  //       customerName: customer.name,
  //       items: itemsWithCost,
  //       subtotal,
  //       discountAmount: totalDiscount,
  //       total,
  //       status: data.status || 'pending',
  //       notes: data.notes || null,
  //     };

  //     console.log('SAVING ORDER:', JSON.stringify(orderData, null, 2));

  //     return tx.order.create({
  //       data: orderData,
  //     });
  //   });
  // },


  async create(data) {
    console.log('═══════════════════════════════════════');
    console.log('CREATE ORDER — incoming data');
    console.log('customerId:', data.customerId);
    console.log('items count:', data.items?.length);
    console.log('═══════════════════════════════════════');

    return prisma.$transaction(async (tx) => {
      const itemsWithCost = [];
      let subtotal = 0;
      let totalDiscount = 0;

      // 1. Create the order first so we have the ID for the stock ledger
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
      }

      // We create a temporary order doc, then update it at the end (or we can create it last)
      // To keep it clean, we'll calculate first, then create.

      for (const item of data.items) {
        const qty = Number(item.quantity);
        const unitPrice = Number(item.price);
        const rawDiscValue = Number(item.discountValue ?? 0);
        const discType = item.discountType || 'none';

        if (!Number.isFinite(qty) || qty <= 0) {
          throw ApiError.badRequest(`Invalid quantity for ${item.productName}`, 'INVALID_QUANTITY');
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw ApiError.badRequest(`Invalid price for ${item.productName}`, 'INVALID_PRICE');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw ApiError.notFound(`Product not found: ${item.productId}`, 'PRODUCT_NOT_FOUND');
        }
        if (product.quantity < qty) {
          throw ApiError.badRequest(
            `Insufficient stock for ${product.name} (have ${product.quantity}, need ${qty})`,
            'INSUFFICIENT_STOCK'
          );
        }

        // ── Per-item discount ─────────────────────────────
        let dt = discType;
        let dv = rawDiscValue;
        let unitDiscount = 0;

        if (dt === 'percent') {
          dv = Math.max(0, Math.min(100, dv));
          unitDiscount = (unitPrice * dv) / 100;
        } else if (dt === 'amount') {
          dv = Math.max(0, Math.min(unitPrice, dv));
          unitDiscount = dv;
        } else {
          dt = 'none';
          dv = 0;
          unitDiscount = 0;
        }

        unitDiscount = Number(unitDiscount.toFixed(2));
        const lineSubtotal = unitPrice * qty;
        const lineDiscount = unitDiscount * qty;

        subtotal += lineSubtotal;
        totalDiscount += lineDiscount;

        // ★ Decrement stock
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: product.quantity - qty },
        });

        itemsWithCost.push({
          productId: item.productId,
          productName: product.name,
          categoryId: product.categoryId,
          quantity: qty,
          price: unitPrice,
          costPrice: Number(product.costPrice) || 0,
          discountType: dt,
          discountValue: dv,
          discountAmount: unitDiscount,
        });
      }

      // ── Final totals ────────────────────────────────────
      subtotal = Number(subtotal.toFixed(2));
      totalDiscount = Number(totalDiscount.toFixed(2));
      const total = Number((subtotal - totalDiscount).toFixed(2));

      if (!Number.isFinite(total) || total < 0) {
        throw ApiError.internal('Could not compute order total', 'TOTAL_COMPUTE_ERROR');
      }

      const orderData = {
        customerId: data.customerId,
        customerName: customer.name,
        items: itemsWithCost,
        subtotal,
        discountAmount: totalDiscount,
        total,
        status: data.status || 'pending',
        notes: data.notes || null,
      };

      // ★ Create the Order
      const createdOrder = await tx.order.create({
        data: orderData,
      });

      // ★ Write to the Stock Ledger for every item
      for (const item of itemsWithCost) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity, // Negative for sale
            type: 'sale',
            unitCost: item.costPrice,
            unitPrice: item.price,
            referenceId: createdOrder.id,
          },
        });
      }

      return createdOrder;
    });
  },


  async updateStatus(id, status) {
    await orderService.getById(id);
    return prisma.order.update({ where: { id }, data: { status } });
  },

  // async delete(id) {
  //   return prisma.$transaction(async (tx) => {
  //     // 1. Find the order
  //     const order = await tx.order.findUnique({ where: { id } });
  //     if (!order) {
  //       throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
  //     }

  //     // 2. Restore stock for every item in the order
  //     for (const item of order.items) {
  //       // Increment the product quantity by the amount that was sold
  //       await tx.product.update({
  //         where: { id: item.productId },
  //         data: {
  //           quantity: { increment: item.quantity },
  //         },
  //       }).catch(() => {
  //         // If the product was already deleted, silently ignore
  //       });
  //     }

  //     // 3. Delete the order
  //     return tx.order.delete({ where: { id } });
  //   });
  // },


  async delete(id) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) {
        throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
      }

      // ★ Restore stock AND log the movement
      for (const item of order.items) {
        try {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });

          // Log the restoration (positive adjustment)
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity, // Positive (restoring)
              type: 'adjustment',
              unitCost: item.costPrice ?? 0,
              referenceId: `DELETED-${id}`,
              notes: 'Order cancelled/restored',
            },
          });
        } catch (err) {
          console.warn(
            `Could not restore ${item.productName} (deleted product?)`
          );
        }
      }

      return tx.order.delete({ where: { id } });
    });
  },

};