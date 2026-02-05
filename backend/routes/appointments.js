import { PrismaClient } from '@prisma/client';
import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
const router = express.Router();

const prisma = new PrismaClient();

// Get appointments for current user (role-based)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { id, role } = req.user;
    let appointments = [];
    if (role === 'PATIENT') {
      appointments = await prisma.appointment.findMany({ where: { patientId: id } });
    } else if (role === 'DOCTOR' || role === 'ADMIN_DOCTOR') {
      appointments = await prisma.appointment.findMany({ where: { doctorId: id } });
    } else if (role === 'THERAPIST') {
      appointments = await prisma.appointment.findMany({ where: { therapistId: id } });
    }
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// Create appointment (PATIENT only)
router.post('/', authMiddleware, roleMiddleware(['PATIENT']), async (req, res, next) => {
  try {
    const { doctorId, therapistId, date, status, notes } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        patientId: req.user.id,
        doctorId,
        therapistId,
        date: new Date(date),
        status,
        notes,
      },
    });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

export default router;
