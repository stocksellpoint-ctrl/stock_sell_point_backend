import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { ApiError } from '../utils/ApiError.js';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const userService = {
  async list({ search, page = 1, limit = 100 } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 100;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: PUBLIC_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async getById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: PUBLIC_SELECT,
    });
    if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    return user;
  },

  async create({ name, email, password, role }) {
    if (!name || !email || !password) {
      throw ApiError.badRequest(
        'name, email and password are required',
        'MISSING_FIELDS'
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw ApiError.conflict(
        'A user with this email already exists',
        'EMAIL_IN_USE'
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    return prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashed,
        role: role === 'admin' ? 'admin' : 'manager',
      },
      select: PUBLIC_SELECT,
    });
  },

  async update(id, { name, email, password, role, isActive }) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

    const data = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        throw ApiError.badRequest('Name cannot be empty', 'INVALID_NAME');
      }
      data.name = String(name).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!normalizedEmail) {
        throw ApiError.badRequest('Email cannot be empty', 'INVALID_EMAIL');
      }
      if (normalizedEmail !== existing.email) {
        const conflict = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (conflict) {
          throw ApiError.conflict(
            'A user with this email already exists',
            'EMAIL_IN_USE'
          );
        }
      }
      data.email = normalizedEmail;
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (role !== undefined) {
      if (!['admin', 'manager', 'user'].includes(role)) {
        throw ApiError.badRequest('Invalid role', 'INVALID_ROLE');
      }
      data.role = role;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    return prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_SELECT,
    });
  },

  async delete(id) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

    return prisma.user.delete({ where: { id } });
  },
};