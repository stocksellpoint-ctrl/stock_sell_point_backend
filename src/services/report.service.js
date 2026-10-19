import { prisma } from '../config/database.js';

export const reportService = {
  // ═══════════════════════════════════════════════════════════
  // 1. INVENTORY REPORT (Current Snapshot)
  // ═══════════════════════════════════════════════════════════
  async inventoryReport() {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const totalItems = products.reduce((s, p) => s + p.quantity, 0);
    
    // ★ Only Cost Value is known in inventory now
    const totalCostValue = products.reduce(
      (s, p) => s + (p.costPrice ?? 0) * p.quantity,
      0
    );

    const lowStock = products
      .filter((p) => p.quantity <= p.lowStockThreshold)
      .map((p) => ({
        id: p.id, name: p.name, sku: p.sku,
        quantity: p.quantity, lowStockThreshold: p.lowStockThreshold,
      }));

    const byCategory = {};
    for (const p of products) {
      const catName = p.category?.name ?? 'Uncategorized';
      if (!byCategory[catName]) {
        byCategory[catName] = {
          categoryName: catName, products: 0, quantity: 0, costValue: 0,
        };
      }
      byCategory[catName].products += 1;
      byCategory[catName].quantity += p.quantity;
      byCategory[catName].costValue += (p.costPrice ?? 0) * p.quantity;
    }

    return {
      totals: {
        products: products.length,
        items: totalItems,
        costValue: Number(totalCostValue.toFixed(2)),
        lowStockCount: lowStock.length,
      },
      categories: Object.values(byCategory).sort((a, b) => b.costValue - a.costValue),
      lowStock,
    };
  },

  // ═══════════════════════════════════════════════════════════
  // 2. PROFIT REPORT (Historical)
  // ═══════════════════════════════════════════════════════════
  async profitReport({ from, to }) {
    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalItems = 0;
    let totalDiscount = 0;

    const dailyMap = {}; 
    const productMap = {}; 

    for (const order of orders) {
      const dayKey = order.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = {
          date: dayKey, revenue: 0, cost: 0, profit: 0, orders: 0, items: 0, discount: 0,
        };
      }
      dailyMap[dayKey].revenue += order.total;
      dailyMap[dayKey].orders += 1;
      dailyMap[dayKey].discount += order.discountAmount ?? 0;
      totalDiscount += order.discountAmount ?? 0;

      for (const item of order.items) {
        // ★ Revenue based on Selling Price
        const itemRevenue = item.sellingPrice * item.quantity;
        // ★ Cost based on Cost Price
        const itemCost = (item.costPrice ?? 0) * item.quantity;
        const itemProfit = itemRevenue - itemCost;

        totalRevenue += itemRevenue;
        totalCost += itemCost;
        totalItems += item.quantity;

        dailyMap[dayKey].cost += itemCost;
        dailyMap[dayKey].profit += itemProfit;
        dailyMap[dayKey].items += item.quantity;

        if (!productMap[item.productId]) {
          productMap[item.productId] = {
            productId: item.productId, productName: item.productName,
            quantity: 0, revenue: 0, cost: 0, profit: 0,
          };
        }
        productMap[item.productId].quantity += item.quantity;
        productMap[item.productId].revenue += itemRevenue;
        productMap[item.productId].cost += itemCost;
        productMap[item.productId].profit += itemProfit;
      }
    }

    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // ── Historical Closing Inventory ──────────────
    const products = await prisma.product.findMany();
    const movementsAfter = await prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { createdAt: { gt: endDate } },
      _sum: { quantity: true },
    });

    const movementMap = {};
    for (const m of movementsAfter) {
      movementMap[m.productId] = m._sum.quantity ?? 0;
    }

    let closingStockCostValue = 0;
    let closingTotalItems = 0;

    for (const p of products) {
      const changesAfter = movementMap[p.id] ?? 0;
      const historicalQty = p.quantity - changesAfter;

      if (historicalQty > 0) {
        closingStockCostValue += (p.costPrice ?? 0) * historicalQty;
        closingTotalItems += historicalQty;
      }
    }

    return {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      totals: {
        revenue: Number(totalRevenue.toFixed(2)),
        cost: Number(totalCost.toFixed(2)),
        profit: Number(totalProfit.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        orders: orders.length,
        itemsSold: totalItems,
        totalDiscount: Number(totalDiscount.toFixed(2)),
      },
      closingInventory: {
        stockCostValue: Number(closingStockCostValue.toFixed(2)),
        totalItems: closingTotalItems,
      },
      daily: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
        ...d, revenue: Number(d.revenue.toFixed(2)), cost: Number(d.cost.toFixed(2)),
        profit: Number(d.profit.toFixed(2)), discount: Number(d.discount.toFixed(2)),
      })),
      topProducts: Object.values(productMap).sort((a, b) => b.profit - a.profit).slice(0, 10).map((p) => ({
        ...p, revenue: Number(p.revenue.toFixed(2)), cost: Number(p.cost.toFixed(2)), profit: Number(p.profit.toFixed(2)),
      })),
    };
  },
};