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
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

export default router;
