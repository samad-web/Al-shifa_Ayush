import { PrismaClient } from '@prisma/client';
import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import bcrypt from 'bcrypt';

const router = express.Router();
const prisma = new PrismaClient();

// List all therapists (admin only)
router.get('/list-therapists', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const therapists = await prisma.therapist.findMany({ include: { user: true } });
    // Return enriched profile data
    const enriched = therapists.map((ther) => ({
      id: ther.id,
      fullName: ther.fullName,
      specialization: ther.specialization,
      profilePhoto: ther.profilePhoto,
      yearsExperience: ther.yearsExperience,
      qualification: ther.qualification,
      clinic: ther.clinic,
      email: ther.user?.email,
    }));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Doctor gamification stats (all doctors, visible to doctors)
router.get('/doctor-gamification', authMiddleware, roleMiddleware(['DOCTOR', 'ADMIN_DOCTOR', 'ADMIN']), async (req, res, next) => {
  try {
    // Get all doctors and their appointment counts
    const doctors = await prisma.doctor.findMany({
      include: {
        user: true,
        appointments: true,
      },
    });
    // Map to gamification stats with enriched profile
    const stats = doctors.map((doc) => ({
      id: doc.id,
      fullName: doc.fullName,
      specialization: doc.specialization,
      profilePhoto: doc.profilePhoto,
      yearsExperience: doc.yearsExperience,
      qualification: doc.qualification,
      clinic: doc.clinic,
      email: doc.user?.email,
      appointmentCount: doc.appointments.length,
    }));
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// List all doctors (admin/doctor-admin only)
router.get('/list-doctors', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const doctors = await prisma.doctor.findMany({ include: { user: true } });
    // Return enriched profile data
    const enriched = doctors.map((doc) => ({
      id: doc.id,
      fullName: doc.fullName,
      specialization: doc.specialization,
      profilePhoto: doc.profilePhoto,
      yearsExperience: doc.yearsExperience,
      qualification: doc.qualification,
      clinic: doc.clinic,
      email: doc.user?.email,
    }));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// List all patients (admin/doctor-admin only)
router.get('/list-patients', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const patients = await prisma.patient.findMany({ include: { user: true } });
    // Return enriched profile data
    const enriched = patients.map((pat) => ({
      id: pat.id,
      fullName: pat.fullName,
      dob: pat.dob,
      age: pat.age,
      gender: pat.gender,
      phoneNumber: pat.phoneNumber,
      patientId: pat.patientId,
      therapyType: pat.therapyType,
      email: pat.user?.email,
    }));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        doctor: true,
        therapist: true,
        patient: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      doctor: user.doctor,
      therapist: user.therapist,
      patient: user.patient,
    });
  } catch (err) {
    next(err);
  }
});

// Admin create user endpoint
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST', 'PATIENT'])
});

router.post('/create', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { email, password, role } = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);

    // Create user and related profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, password: hashed, role }
      });

      if (role === 'DOCTOR' || role === 'ADMIN_DOCTOR') {
        await tx.doctor.create({ data: { userId: newUser.id } });
      } else if (role === 'THERAPIST') {
        await tx.therapist.create({ data: { userId: newUser.id } });
      } else if (role === 'PATIENT') {
        await tx.patient.create({ data: { userId: newUser.id } });
      }

      return newUser;
    });

    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
});

// Assign patient to doctor (admin/doctor-admin only)
router.post('/assign-patient', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { patientId, doctorId } = req.body;
    // Find patient and doctor
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!patient || !doctor) return res.status(404).json({ error: 'Patient or Doctor not found' });
    // Assign patient to doctor by creating an appointment (or update patient-doctor relation if needed)
    // Here, we just create a dummy appointment for assignment
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        date: new Date(),
        status: 'ASSIGNED',
      },
    });
    res.json({ message: 'Patient assigned to doctor successfully' });
  } catch (err) {
    next(err);
  }
});

// Get patient details (admin/doctor-admin only)
router.get('/patient/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        appointments: {
          include: {
            doctor: { include: { user: true } },
            therapist: { include: { user: true } },
          },
        },
      },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    next(err);
  }
});

export default router;