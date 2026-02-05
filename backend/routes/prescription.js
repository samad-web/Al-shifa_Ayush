import { PrismaClient } from '@prisma/client';
import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();
const prisma = new PrismaClient();

// File upload config (local storage)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/prescriptions/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Get prescriptions for a patient (role-protected)
router.get('/patient/:id', authMiddleware, async (req, res, next) => {
  try {
    // Permission check: Only assigned doctor/therapist or the patient can view
    const patientId = req.params.id;
    const user = req.user;
    let allowed = false;
    if (user.role === 'PATIENT' && user.patient?.id === patientId) allowed = true;
    if (user.role === 'DOCTOR') {
      // Check if doctor is assigned to patient (via appointments)
      const appointment = await prisma.appointment.findFirst({ where: { patientId, doctorId: user.doctor.id } });
      if (appointment) allowed = true;
    }
    if (user.role === 'THERAPIST') {
      const appointment = await prisma.appointment.findFirst({ where: { patientId, therapistId: user.therapist.id } });
      if (appointment) allowed = true;
    }
    if (!allowed && !['ADMIN', 'ADMIN_DOCTOR'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId },
      include: {
        doctor: { include: { user: true } },
        therapist: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(prescriptions);
  } catch (err) {
    next(err);
  }
});

// Add prescription (doctor/therapist only)
router.post('/add', authMiddleware, roleMiddleware(['DOCTOR', 'THERAPIST']), upload.single('file'), async (req, res, next) => {
  try {
    const { patientId, medicationName, dosage, frequency, duration, notes } = req.body;
    const fileUrl = req.file ? `/uploads/prescriptions/${req.file.filename}` : null;
    let doctorId = null, therapistId = null;
    let allowed = false;
    if (req.user.role === 'DOCTOR') {
      doctorId = req.user.doctor.id;
      // Check if doctor is assigned to patient
      const appointment = await prisma.appointment.findFirst({ where: { patientId, doctorId } });
      if (appointment) allowed = true;
    }
    if (req.user.role === 'THERAPIST') {
      therapistId = req.user.therapist.id;
      const appointment = await prisma.appointment.findFirst({ where: { patientId, therapistId } });
      if (appointment) allowed = true;
    }
    if (!allowed) {
      return res.status(403).json({ error: 'You are not assigned to this patient' });
    }
    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId,
        therapistId,
        fileUrl,
        medicationName,
        dosage,
        frequency,
        duration,
        notes,
      }
    });
    res.status(201).json(prescription);
  } catch (err) {
    next(err);
  }
});

export default router;
