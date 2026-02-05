import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import express from 'express';
const router = express.Router();

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST', 'PATIENT'])
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role } = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, role } });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post('/login', async (req, res, next) => {
  try {
    console.log('[LOGIN] Attempt for:', req.body.email, 'Password length:', req.body.password?.length);

    // Validate input
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.log('[LOGIN] Validation error:', parseResult.error.issues);
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    const { email, password } = parseResult.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log('[LOGIN] User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[LOGIN] User found, checking password');
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      console.log('[LOGIN] Password invalid');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[LOGIN] Success! Role:', user.role);
    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.log('[LOGIN] Unexpected error:', err.message);
    next(err);
  }
});

export default router;
