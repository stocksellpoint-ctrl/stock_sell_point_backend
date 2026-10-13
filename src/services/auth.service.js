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

export const authService = {
  async register({ name, email, password }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('Email already registered','EMAIL_ALREADY_REGISTERED');

    const hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, password: hash },
    });

    return { user: sanitize(user), token: signToken(user) };
  },

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) throw ApiError.notFound('No Account found with this email', 'USER_NOT_FOUND');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw ApiError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');

    return { user: sanitize(user), token: signToken(user) };
  },

  async me(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found','USER_NOT_FOUND');
    return sanitize(user);
  },
};