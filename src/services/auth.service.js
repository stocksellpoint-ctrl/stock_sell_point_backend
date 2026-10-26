import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function sanitize(user) {
  const { password, ...rest } = user;
  return rest;
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export const authService = {
  async register({ name, email, password }) {

    const cleanName = String(name ?? '').trim(); 
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = String(password ?? '');

    // ====== Validation ==========
    if(!cleanName) {
      throw ApiError.badRequest('Name is required', 'NAME_REQUIRED');
    }

    if(!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)){
      throw ApiError.badRequest('A valid email is required','EMAIL_INVALID');
    }

    if(cleanPassword.length < 6){
      throw ApiError.badRequest(
        'Password must be at least 6 characters',
        'PASSWORD_TOO_SHORT'
      )
    }

    // ---- Duplicate check ( case - insensitive ) because we normalized ----
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict(
      'Email already registered',
      'EMAIL_ALREADY_REGISTERED'
    );

    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name:cleanName, email:cleanEmail, password: hash },
    });

    return { user: sanitize(user), token: signToken(user) };
  },

  async login({ email, password }) {
    const cleanEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({ where: { email:cleanEmail } });

    if (!user) throw ApiError.notFound('No Account found with this email', 'USER_NOT_FOUND');

    if(!user.isActive){
      throw ApiError.forbidden('Account is disabled', 'ACCOUNT_DISABLED');
    }

    const ok = await bcrypt.compare(String(password ?? ''), user.password);
    if (!ok) throw ApiError.invalidCredential('Invalid credentials', 'INVALID_CREDENTIALS');

    return { user: sanitize(user), token: signToken(user) };
  },

  async me(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found','USER_NOT_FOUND');
    return sanitize(user);
  },

  // ═══════════════════════════════════════════════════════════
  // CHANGE PASSWORD — verifies current, hashes new, updates DB
  // ═══════════════════════════════════════════════════════════
  async changePassword(userId, { currentPassword, newPassword }) {
    // Basic shape checks (defence-in-depth — Zod validates before this)
    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest(
        'currentPassword and newPassword are required',
        'MISSING_FIELDS'
      );
    }
    if (newPassword.length < 6) {
      throw ApiError.badRequest(
        'New password must be at least 6 characters',
        'WEAK_PASSWORD'
      );
    }
    if (currentPassword === newPassword) {
      throw ApiError.badRequest(
        'New password must be different from the current one',
        'SAME_PASSWORD'
      );
    }

    // Load the user with the hashed password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
    }

    // Verify the current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw ApiError.unauthorized(
        'Current password is incorrect',
        'INVALID_CURRENT_PASSWORD'
      );
    }

    // Hash and persist the new one
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return { success: true };
  },

  async updateProfile(userId, { name, email }) {
    const data = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        throw ApiError.badRequest('Name cannot be empty', 'INVALID_NAME');
      }
      data.name = trimmed;
    }

    if (email !== undefined) {
      const normalized = String(email).toLowerCase().trim();
      if (!normalized) {
        throw ApiError.badRequest('Email cannot be empty', 'INVALID_EMAIL');
      }
      // Only check for duplicates if the email is actually changing
      const current = await prisma.user.findUnique({ where: { id: userId } });
      if (current && current.email !== normalized) {
        const conflict = await prisma.user.findUnique({
          where: { email: normalized },
        });
        if (conflict) {
          throw ApiError.conflict(
            'A user with this email already exists',
            'EMAIL_IN_USE'
          );
        }
      }
      data.email = normalized;
    }

    if (Object.keys(data).length === 0) {
      throw ApiError.badRequest('Nothing to update', 'NO_CHANGES');
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      });
      return updated;
    } catch (err) {
      if (err.code === 'P2002') {
        throw ApiError.conflict(
          'A user with this email already exists',
          'EMAIL_IN_USE'
        );
      }
      throw err;
    }
  },
};