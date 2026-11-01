export async function generateInvoiceNumber(tx, ownerId) {
    const year = new Date().getFullYear();

    // 1. Get the business prefix
    const business = await tx.businessInfo.findUnique({
        where: { ownerId: ownerId }
    });

    // 2. Robust prefix logic
    let prefix = business?.invoicePrefix?.trim().toUpperCase();
    if (!prefix || prefix.length === 0) {
        prefix = business?.companyName
            ? business.companyName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')
            : 'INV';
        if (prefix.length < 2) prefix = 'INV';
    }

    // 3. Count orders for THIS owner in THIS year
    const startOfYear = new Date(Date.UTC(year, 0, 1)); 
    const count = await tx.order.count({
        where: {
            ownerId: ownerId,
            createdAt: { gte: startOfYear }
        }
    });

    // 4. Create the sequence
    const nextSeq = count + 1;
    const paddedSeq = nextSeq.toString().padStart(5, '0');

    return `${prefix}-${year}-${paddedSeq}`;
}