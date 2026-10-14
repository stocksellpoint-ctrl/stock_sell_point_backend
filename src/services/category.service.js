import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const categoryService = {
  /**
   * Returns categories as a flat list with parentId, plus a nested tree.
   */
  async list({ parentId } = {}) {
    const where = {};
    if (parentId === 'null') where.parentId = null;
    else if (parentId) where.parentId = parentId;

    const items = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return { items };
  },

  async tree() {
    const all = await prisma.category.findMany({
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

  async getById(id) {
    const c = await prisma.category.findUnique({ where: { id } });
    if (!c) throw ApiError.notFound('Category not found', 'CATEGORY_NOT_FOUND');
    return c;
  },

  async create({ name, description, parentId }) {
    const slug = slugify(name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw ApiError.conflict(
        'Category already exists',
        'CATEGORY_EXISTS'
      );
    }

    // Validate parent
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw ApiError.badRequest(
          'Parent category not found',
          'PARENT_NOT_FOUND'
        );
      }
    }

    return prisma.category.create({
      data: { name, slug, description, parentId: parentId || null },
    });
  },

  async update(id, data) {
    await categoryService.getById(id);
    return prisma.category.update({ where: { id }, data });
  },

  async delete(id) {
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