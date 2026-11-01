import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';




export const orderService = {
  // ═══════════════════════════════════════════════════════════
  // LIST — own orders (or all for admins)
  // ═══════════════════════════════════════════════════════════
  async list({ search, status, page = 1, limit = 50, ownerId, isAdmin = false } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = isAdmin ? {} : { ownerId };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true, customer: true },
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  // ═══════════════════════════════════════════════════════════
  // GET ONE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async getById(id, ownerId, isAdmin = false) {
    const order = await prisma.order.findFirst({
      where: { id, ...(isAdmin ? {} : { ownerId }) },
      include: { items: true, customer: true },
    });
    if (!order) {
      throw ApiError.notFound('Order not found', 'ORDER_NOT_FOUND');
    }
    return order;
  },

  // ═══════════════════════════════════════════════════════════
  // CREATE — full validation, stock decrement, movement logging
  //          and ownerId on both Order and StockMovement
  // ═══════════════════════════════════════════════════════════
  async create(data) {
    if (!data.ownerId) {
      throw ApiError.badRequest('ownerId is required', 'OWNER_ID_REQUIRED');
    }
    if (!data.customerId) {
      throw ApiError.badRequest('customerId is required', 'MISSING_CUSTOMER');
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw ApiError.badRequest('items are required', 'MISSING_ITEMS');
    }

    return prisma.$transaction(async (tx) => {
      // ── Customer must belong to the caller ──────────────
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, ownerId: data.ownerId },
      });
      if (!customer) {
        throw ApiError.badRequest('Customer not found for this user', 'CUSTOMER_NOT_FOUND');
      }

      const itemsWithCost = [];
      let subtotal = 0;
      let totalDiscount = 0;

      // ── Validate each line item ─────────────────────────
      for (const item of data.items) {
        // ... (Keep all your existing validation logic exactly as it is)
        const qty = Number(item.quantity);
        const sellingPrice = Number(item.sellingPrice);
        const rawDiscValue = Number(item.discountValue ?? 0);
        const discType = item.discountType || 'none';

        if (!Number.isFinite(qty) || qty <= 0) throw ApiError.badRequest(`Invalid quantity...`, 'INVALID_QUANTITY');
        if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) throw ApiError.badRequest(`Invalid selling price...`, 'INVALID_PRICE');

        const product = await tx.product.findFirst({
          where: { id: item.productId, ownerId: data.ownerId },
        });
        if (!product) throw ApiError.badRequest(`Product not found...`, 'PRODUCT_NOT_FOUND');
        if (product.quantity < qty) throw ApiError.badRequest(`Insufficient stock...`, 'INSUFFICIENT_STOCK');

        let dt = discType;
        let dv = rawDiscValue;
        let unitDiscount = 0;

        if (dt === 'percent') {
          dv = Math.max(0, Math.min(100, dv));
          unitDiscount = (sellingPrice * dv) / 100;
        } else if (dt === 'amount') {
          dv = Math.max(0, Math.min(sellingPrice, dv));
          unitDiscount = dv;
        } else {
          dt = 'none'; dv = 0; unitDiscount = 0;
        }

        unitDiscount = Number(unitDiscount.toFixed(2));
        const lineSubtotal = sellingPrice * qty;
        const lineDiscount = unitDiscount * qty;

        subtotal += lineSubtotal;
        totalDiscount += lineDiscount;

        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: product.quantity - qty },
        });

        itemsWithCost.push({
          productId: String(item.productId),
          productName: String(product.name),
          categoryId: product.categoryId ? String(product.categoryId) : '',
          quantity: qty,
          sellingPrice: sellingPrice,
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

      // ✅ NEW: Generate the invoice number INSIDE the transaction
      const invoiceNumber = await generateInvoiceNumber(tx, data.ownerId);

      // ── Create the order ────────────────────────────────
      const createdOrder = await tx.order.create({
        data: {
          customerId: String(customer.id),
          customerName: customer.name,
          customerPhone: customer.phone ?? '',
          items: itemsWithCost,
          
          // ✅ NEW: Attach the generated invoice number
          invoiceNumber: invoiceNumber,
          
          subtotal,
          discountAmount: totalDiscount,
          total,
          status: data.status || 'pending',
          notes: data.notes ?? null,
          ownerId: data.ownerId,
        },
        include: { items: true, customer: true },
      });

      // ── Stock ledger ────────────────────────────────────
      for (const item of itemsWithCost) {
        await tx.stockMovement.create({
          data: {
            productId: String(item.productId),
            quantity: -item.quantity,
            type: 'sale',
            unitCost: item.costPrice,
            unitPrice: item.sellingPrice,
            referenceId: String(createdOrder.id),
            notes: 'Sale',
            ownerId: data.ownerId,
          },
        });
      }

      return createdOrder;
    });
  },

  // ═══════════════════════════════════════════════════════════
  // UPDATE STATUS — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async updateStatus(id, status, ownerId, isAdmin = false) {
    await orderService.getById(id, ownerId, isAdmin);

    return prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, customer: true },
    });
  },

  // ═══════════════════════════════════════════════════════════
  // DELETE — restore stock then delete the order
  //          (only the owner, or an admin, can do this)
  // ═══════════════════════════════════════════════════════════
  async delete(id, ownerId, isAdmin = false) {
    const existing = await orderService.getById(id, ownerId, isAdmin);

    return prisma.$transaction(async (tx) => {
      // Restore stock + log the reversal
      for (const item of existing.items) {
        try {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: String(item.productId),
              quantity: item.quantity,
              type: 'adjustment',
              unitCost: item.costPrice ?? 0,
              unitPrice: item.sellingPrice ?? 0,
              referenceId: `DELETED-${id}`,
              notes: 'Order cancelled/restored',
              ownerId: existing.ownerId,           // ★ keep same owner
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