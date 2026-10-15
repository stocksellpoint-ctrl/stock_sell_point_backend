export function sanitizeProduct(product, user) {
  if (!product) return product;
  if (user?.role === 'admin') return product;

  const { costPrice, imagePublicId, ownerId, ...safe } = product;
  return safe;
}

export function sanitizeProducts(products, user) {
  return products.map((p) => sanitizeProduct(p, user));
}

export function sanitizeOrder(order, user) {
  if (!order) return order;
  if (user?.role === 'admin') return order;

  // Strip costPrice from every item
  const safeItems = order.items.map((i) => {
    const { costPrice, ...rest } = i;
    return rest;
  });
  return { ...order, items: safeItems };
}