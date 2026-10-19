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
};