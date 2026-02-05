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

// List all patients (admin/doctor/therapist/doctor-admin)
router.get('/list-patients', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST']), async (req, res, next) => {
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
  fullName: z.string().optional(),
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

      const profileData = { userId: newUser.id, fullName };

      if (role === 'DOCTOR' || role === 'ADMIN_DOCTOR') {
        await tx.doctor.create({ data: profileData });
      } else if (role === 'THERAPIST') {
        await tx.therapist.create({ data: profileData });
      } else if (role === 'PATIENT') {
        await tx.patient.create({ data: profileData });
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
router.get('/patient/:id', authMiddleware, async (req, res, next) => {
  try {
    const requestedPatientId = req.params.id;

    // Permission check: Admin can view any patient, patients can only view themselves
    const isAdmin = ['ADMIN', 'ADMIN_DOCTOR'].includes(req.user.role);
    const isOwnProfile = req.user.role === 'PATIENT' && req.user.patient?.id === requestedPatientId;

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: requestedPatientId },
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

    // Return enriched data with email at top level for easier access
    const enrichedPatient = {
      ...patient,
      email: patient.user?.email,
    };

    res.json(enrichedPatient);
  } catch (err) {
    next(err);
  }
});

// Get doctor statistics
router.get('/doctor/stats', authMiddleware, roleMiddleware(['DOCTOR', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const doctorRecord = await prisma.doctor.findUnique({
      where: { userId: req.user.id }
    });

    if (!doctorRecord) {
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    const doctorId = doctorRecord.id;

    // Active journeys (unique patients with non-completed appointments)
    const activePatients = await prisma.appointment.groupBy({
      by: ['patientId'],
      where: {
        doctorId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] }
      }
    });

    // Completed journeys
    const completedAppointments = await prisma.appointment.count({
      where: {
        doctorId,
        status: 'COMPLETED'
      }
    });

    // At risk (mock for now, or based on a specific criteria like custom status)
    const atRiskCount = 0; // In a real app, this would be based on missed sittings or logs

    // Wellness eligible
    const wellnessEligibleCount = 0;

    // Deriving rates for progress rings
    const recoveryProgress = 80; // Placeholder
    const medicationAdherence = 85; // Placeholder

    res.json({
      activeJourneys: activePatients.length,
      atRisk: atRiskCount,
      wellnessEligible: wellnessEligibleCount,
      completed: completedAppointments,
      recoveryProgress,
      medicationAdherence
    });
  } catch (err) {
    next(err);
  }
});

// Get aggregate admin statistics
router.get('/admin/stats', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    // Total patients
    const totalPatients = await prisma.patient.count();

    // Active journeys (all unique patients with non-completed appointments)
    const activePatients = await prisma.appointment.groupBy({
      by: ['patientId'],
      where: {
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] }
      }
    });

    // Completed journeys
    const totalCompleted = await prisma.appointment.count({
      where: {
        status: 'COMPLETED'
      }
    });

    // Mock counts for fields not yet fully implemented in schema
    const atRiskCount = 0;
    const wellnessEligibleCount = 0;

    res.json({
      activeJourneys: activePatients.length,
      atRisk: atRiskCount,
      wellnessEligible: wellnessEligibleCount,
      completed: totalCompleted,
      totalPatients
    });
  } catch (err) {
    next(err);
  }
});

export default router;