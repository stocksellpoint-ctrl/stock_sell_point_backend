import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';


// Shared owner-scope helper
function ownerWhere(ownerId, isAdmin) {
  return isAdmin ? {} : { ownerId };
}

// Here everyone can see everything
// export const customerService = {
//   async list({ search, page = 1, limit = 50 } = {}) {
//     page = parseInt(page, 10) || 1;
//     limit = parseInt(limit, 10) || 50;

//     const where = {};
//     if (search) {
//       where.OR = [
//         { name: { contains: search, mode: 'insensitive' } },
//         { phone: { contains: search } },
//         { email: { contains: search, mode: 'insensitive' } },
//       ];
//     }

//     const [items, total] = await Promise.all([
//       prisma.customer.findMany({
//         where,
//         orderBy: { createdAt: 'desc' },
//         skip: (page - 1) * limit,
//         take: limit,
//       }),
//       prisma.customer.count({ where }),
//     ]);

//     return { items, total, page, limit };
//   },

//   async getById(id) {
//     const c = await prisma.customer.findUnique({ where: { id } });
//     if (!c) throw ApiError.notFound('Customer not found');
//     return c;
//   },

//   async create(data) {
//     return prisma.customer.create({ data });
//   },

//   async update(id, data) {
//     await customerService.getById(id);
//     return prisma.customer.update({ where: { id }, data });
//   },

//   async delete(id) {
//     await customerService.getById(id);
//     return prisma.customer.delete({ where: { id } });
//   },
// };



// Here only owner or admin can see product or delete
export const customerService = {
  // ═══════════════════════════════════════════════════════════
  // LIST
  // ═══════════════════════════════════════════════════════════
  async list({ search, page = 1, limit = 50, ownerId, isAdmin = false } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 50;

    const where = { ...ownerWhere(ownerId, isAdmin) };

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

  // ═══════════════════════════════════════════════════════════
  // GET ONE
  // ═══════════════════════════════════════════════════════════
  async getById(id, ownerId, isAdmin = false) {
    const c = await prisma.customer.findFirst({
      where: { id, ...ownerWhere(ownerId, isAdmin) },
    });
    if (!c) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
    return c;
  },

  // ═══════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════
  async create(data) {
    if (!data.ownerId) {
      throw ApiError.badRequest(
        'ownerId is required (authenticated user)',
        'OWNER_ID_REQUIRED'
      );
    }

    if (!data.name || !String(data.name).trim()) {
      throw ApiError.badRequest('Customer name is required', 'MISSING_NAME');
    }
    if (!data.phone || !String(data.phone).trim()) {
      throw ApiError.badRequest('Customer phone is required', 'MISSING_PHONE');
    }

    return prisma.customer.create({
      data: {
        name: String(data.name).trim(),
        phone: String(data.phone).trim(),
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes || null,
        ownerId: data.ownerId,
      },
    });
  },

  // ═══════════════════════════════════════════════════════════
  // UPDATE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async update(id, data, ownerId, isAdmin = false) {
    await customerService.getById(id, ownerId, isAdmin);

    const updateData = {};
    if (data.name !== undefined) {
      if (!String(data.name).trim()) {
        throw ApiError.badRequest('Name cannot be empty', 'INVALID_NAME');
      }
      updateData.name = String(data.name).trim();
    }
    if (data.phone !== undefined) {
      if (!String(data.phone).trim()) {
        throw ApiError.badRequest('Phone cannot be empty', 'INVALID_PHONE');
      }
      updateData.phone = String(data.phone).trim();
    }
    if (data.email !== undefined) {
      updateData.email = data.email?.trim() || null;
    }
    if (data.address !== undefined) {
      updateData.address = data.address?.trim() || null;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes || null;
    }

    // Never allow ownerId to be changed via update
    return prisma.customer.update({
      where: { id },
      data: updateData,
    });
  },

  // ═══════════════════════════════════════════════════════════
  // DELETE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async delete(id, ownerId, isAdmin = false) {
    await customerService.getById(id, ownerId, isAdmin);
    return prisma.customer.delete({ where: { id } });
  },
};