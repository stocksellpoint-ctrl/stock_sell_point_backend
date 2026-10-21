import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';


// ── Helpers ─────────────────────────────────────────────────
function ownerWhere(ownerId, isAdmin) {
  return isAdmin ? {} : { ownerId };
}


function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}



// Here everyone can see everything
// export const categoryService = {
//   /**
//    * Returns categories as a flat list with parentId, plus a nested tree.
//    */
//   async list({ parentId } = {}) {
//     const where = {};
//     if (parentId === 'null') where.parentId = null;
//     else if (parentId) where.parentId = parentId;

//     const items = await prisma.category.findMany({
//       where,
//       orderBy: { name: 'asc' },
//     });

//     return { items };
//   },

//   async tree() {
//     const all = await prisma.category.findMany({
//       orderBy: { name: 'asc' },
//     });

//     const byId = new Map(all.map((c) => [c.id, { ...c, children: [] }]));
//     const roots = [];

//     for (const c of byId.values()) {
//       if (c.parentId && byId.has(c.parentId)) {
//         byId.get(c.parentId).children.push(c);
//       } else {
//         roots.push(c);
//       }
//     }

//     return { items: roots };
//   },

//   async getById(id) {
//     const c = await prisma.category.findUnique({ where: { id } });
//     if (!c) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
//     return c;
//   },

//   async create({ name, description, parentId }) {
//     const slug = slugify(name);

//     const existing = await prisma.category.findUnique({ where: { slug } });
//     if (existing) {
//       throw ApiError.conflict(
//         'Category already exists',
//         'CATEGORY_EXISTS'
//       );
//     }

//     // Validate parent
//     if (parentId) {
//       const parent = await prisma.category.findUnique({
//         where: { id: parentId },
//       });
//       if (!parent) {
//         throw ApiError.badRequest(
//           'Parent category not found',
//           'PARENT_NOT_FOUND'
//         );
//       }
//     }

//     return prisma.category.create({
//       data: { name, slug, description, parentId: parentId || null },
//     });
//   },

//   async update(id, data) {
//     await categoryService.getById(id);
//     return prisma.category.update({ where: { id }, data });
//   },

//   async delete(id) {
//     const hasProducts = await prisma.product.count({
//       where: { categoryId: id },
//     });
//     if (hasProducts > 0) {
//       throw ApiError.conflict(
//         `Cannot delete — ${hasProducts} product(s) use this category`,
//         'CATEGORY_IN_USE'
//       );
//     }

//     const hasChildren = await prisma.category.count({
//       where: { parentId: id },
//     });
//     if (hasChildren > 0) {
//       throw ApiError.conflict(
//         `Cannot delete — this category has ${hasChildren} sub-category(ies)`,
//         'CATEGORY_HAS_CHILDREN'
//       );
//     }

//     return prisma.category.delete({ where: { id } });
//   },
// };



// Here only owner or admin can see or delete
export const categoryService = {
  // ═══════════════════════════════════════════════════════════
  // LIST — flat list, filtered by owner
  // ═══════════════════════════════════════════════════════════
  async list({ parentId, ownerId, isAdmin = false } = {}) {
    const where = { ...ownerWhere(ownerId, isAdmin) };

    if (parentId === 'null') where.parentId = null;
    else if (parentId) where.parentId = parentId;

    const items = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return { items };
  },

  // ═══════════════════════════════════════════════════════════
  // TREE — nested tree of own categories
  // ═══════════════════════════════════════════════════════════
  async tree({ ownerId, isAdmin = false } = {}) {
    const all = await prisma.category.findMany({
      where: ownerWhere(ownerId, isAdmin),
      orderBy: { name: 'asc' },
    });

    const byId = new Map(all.map((c) => [c.id, { ...c, children: [] }]));
    const roots = [];

    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId).children.push(c);
      } else {
        roots.push(c);
      }
    }

    return { items: roots };
  },

  // ═══════════════════════════════════════════════════════════
  // GET ONE — scoped (404 if not owned)
  // ═══════════════════════════════════════════════════════════
  async getById(id, ownerId, isAdmin = false) {
    const c = await prisma.category.findFirst({
      where: { id, ...ownerWhere(ownerId, isAdmin) },
    });
    if (!c) {
      throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
    }
    return c;
  },

  // ═══════════════════════════════════════════════════════════
  // CREATE — slug unique per owner, parent must belong to owner
  // ═══════════════════════════════════════════════════════════
  async create({ name, description, parentId, ownerId }) {
    if (!ownerId) {
      throw ApiError.badRequest(
        'ownerId is required (authenticated user)',
        'OWNER_ID_REQUIRED'
      );
    }
    if (!name || !String(name).trim()) {
      throw ApiError.badRequest('Category name is required', 'MISSING_NAME');
    }

    const slug = slugify(name);

    // Slug must be unique within the owner's namespace
    const existing = await prisma.category.findFirst({
      where: { ownerId, slug },
    });
    if (existing) {
      throw ApiError.conflict(
        'Category already exists',
        'CATEGORY_EXISTS'
      );
    }

    // Parent category must belong to the same owner
    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: parentId, ownerId },
      });
      if (!parent) {
        throw ApiError.badRequest(
          'Parent category not found for this user',
          'PARENT_NOT_FOUND'
        );
      }
    }

    return prisma.category.create({
      data: {
        name: String(name).trim(),
        slug,
        description: description?.trim() || null,
        parentId: parentId || null,
        ownerId,
      },
    });
  },

  // ═══════════════════════════════════════════════════════════
  // UPDATE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async update(id, data, ownerId, isAdmin = false) {
    await categoryService.getById(id, ownerId, isAdmin);

    const updateData = {};

    if (data.name !== undefined) {
      const trimmed = String(data.name).trim();
      if (!trimmed) {
        throw ApiError.badRequest('Name cannot be empty', 'INVALID_NAME');
      }
      updateData.name = trimmed;
      updateData.slug = slugify(trimmed);

      // If slug changed, check uniqueness within this owner's namespace
      if (updateData.slug !== undefined) {
        const conflict = await prisma.category.findFirst({
          where: {
            ownerId,               // ← always the category's own owner
            slug: updateData.slug,
            id: { not: id },
          },
        });
        if (conflict) {
          throw ApiError.conflict(
            'A category with this name already exists',
            'CATEGORY_EXISTS'
          );
        }
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    // Moving a category to a different parent: enforce same-owner
    if (data.parentId !== undefined) {
      if (data.parentId) {
        // Use the category's existing owner for parent validation
        const current = await prisma.category.findUnique({ where: { id } });
        const parent = await prisma.category.findFirst({
          where: { id: data.parentId, ownerId: current.ownerId },
        });
        if (!parent) {
          throw ApiError.badRequest(
            'Parent category not found for this user',
            'PARENT_NOT_FOUND'
          );
        }
        if (data.parentId === id) {
          throw ApiError.badRequest(
            'A category cannot be its own parent',
            'INVALID_PARENT'
          );
        }
      }
      updateData.parentId = data.parentId || null;
    }

    return prisma.category.update({
      where: { id },
      data: updateData,
    });
  },

  // ═══════════════════════════════════════════════════════════
  // DELETE — owner OR admin
  // ═══════════════════════════════════════════════════════════
  async delete(id, ownerId, isAdmin = false) {
    await categoryService.getById(id, ownerId, isAdmin);

    const hasProducts = await prisma.product.count({
      where: { categoryId: id },
    });
    if (hasProducts > 0) {
      throw ApiError.conflict(
        `Cannot delete — ${hasProducts} product(s) use this category`,
        'CATEGORY_IN_USE'
      );
    }

    const hasChildren = await prisma.category.count({
      where: { parentId: id },
    });
    if (hasChildren > 0) {
      throw ApiError.conflict(
        `Cannot delete — this category has ${hasChildren} sub-category(ies)`,
        'CATEGORY_HAS_CHILDREN'
      );
    }

    return prisma.category.delete({ where: { id } });
  },
};