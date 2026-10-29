/**
 * Generates a unique SKU.
 * 1. If no baseSku is provided, generates an automatic one (PRD-Timestamp).
 * 2. If the baseSku is taken, appends a random 3-letter suffix (e.g., -A1B).
 * 3. Loops up to 5 times to ensure 100% uniqueness.
 */
export async function getUniqueSku(baseSku, ownerId, excludeProductId = null) {
  // Step 1: Fallback if user didn't provide any SKU
  let finalSku = baseSku || `PRD-${Date.now()}`;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 5) {
    // Step 2: Build query to check if SKU exists for this specific owner
    const whereClause = { sku: finalSku, ownerId: ownerId };
    
    // If updating, exclude the current product from the duplicate check
    if (excludeProductId) {
      whereClause.NOT = { id: excludeProductId };
    }

    const existing = await prisma.product.findFirst({ where: whereClause });

    if (!existing) {
      isUnique = true; // SKU is available!
    } else {
      // Step 3: SKU is taken. Append a random 3-char string (e.g., "A1B")
      // Math.random().toString(36) generates something like "0.4fzyo82"
      // We grab 3 chars after the decimal and make them uppercase.
      const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      finalSku = `${baseSku}-${suffix}`;
      attempts++;
    }
  }

  // Failsafe (extremely rare, but prevents infinite loops)
  if (!isUnique) {
    throw ApiError.internal('Failed to generate a unique SKU. Please try again.');
  }

  return finalSku;
}