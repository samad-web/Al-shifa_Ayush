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
    const therapists = await prisma.therapist.findMany({
      where: { user: { deletedAt: null } },
      include: { user: true }
    });
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
    // Get all doctors, their appointments, and their journeys
    const doctors = await prisma.doctor.findMany({
      include: {
        user: true,
        appointments: true,
        journeys: true,
      },
    });

    // Map to enhanced gamification stats
    const stats = doctors.map((doc) => {
      const appointmentCount = doc.appointments.length;
      const journeys = doc.journeys || [];

      // Calculate Recovery Rate: (completed sessions / total expected) across all journeys
      let totalExpectedSessions = 0;
      let totalCompletedSessions = 0;
      journeys.forEach(j => {
        totalExpectedSessions += j.totalSessions || 0;
        totalCompletedSessions += j.completedSessions || 0;
      });

      const recoveryRate = totalExpectedSessions > 0
        ? Math.round((totalCompletedSessions / totalExpectedSessions) * 100)
        : 0;

      // Unique patients treated in journeys
      const uniquePatientsCount = new Set(journeys.map(j => j.patientId)).size;

      // Completed journeys count
      const completedJourneysCount = journeys.filter(j => j.status === 'COMPLETED').length;

      // Calculate Clinical Excellence Score (Weighted)
      // 70% Recovery Rate + 30% Appointment Volume (capped at 100 sittings)
      const volumeScore = Math.min((appointmentCount / 100) * 100, 100);
      const excellenceScore = Math.round((recoveryRate * 0.7) + (volumeScore * 0.3));

      return {
        id: doc.id,
        fullName: doc.fullName,
        specialization: doc.specialization,
        profilePhoto: doc.profilePhoto,
        email: doc.user?.email,
        appointmentCount,
        recoveryRate,
        uniquePatientsCount,
        completedJourneysCount,
        excellenceScore,
      };
    });

    // Sort by excellence score (primary) then volume (secondary)
    stats.sort((a, b) => b.excellenceScore - a.excellenceScore || b.appointmentCount - a.appointmentCount);

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// List all doctors (admin/doctor-admin only)
router.get('/list-doctors', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { user: { deletedAt: null } },
      include: { user: true }
    });
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

// List all pharmacists (admin only)
router.get('/list-pharmacists', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const pharmacists = await prisma.pharmacist.findMany({
      where: { user: { deletedAt: null } },
      include: { user: true }
    });
    const enriched = pharmacists.map((pharma) => ({
      id: pharma.id,
      userId: pharma.userId,
      fullName: pharma.fullName,
      profilePhoto: pharma.profilePhoto,
      yearsExperience: pharma.yearsExperience,
      qualification: pharma.qualification,
      email: pharma.user?.email,
    }));
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// List all patients (admin/doctor/therapist/doctor-admin)
router.get('/list-patients', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST', 'PHARMACIST']), async (req, res, next) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { user: { deletedAt: null } },
      include: { user: true }
    });
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
        pharmacist: true,
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
      pharmacist: user.pharmacist,
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
  role: z.enum(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST', 'PATIENT', 'PHARMACIST'])
});

router.post('/create', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { email, password, role, fullName } = createUserSchema.parse(req.body);
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
      } else if (role === 'PHARMACIST') {
        await tx.pharmacist.create({ data: profileData });
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

    // Fetch all journeys for this doctor
    const journeys = await prisma.journey.findMany({
      where: { doctorId },
      include: {
        patient: true,
        medications: true
      }
    });

    const activeJourneys = journeys.filter(j => j.status === 'ACTIVE' || j.status === 'AT_RISK');
    const atRiskJourneys = journeys.filter(j => j.status === 'AT_RISK');
    const completedJourneys = journeys.filter(j => j.status === 'COMPLETED');

    // Wellness eligible: ACTIVE and > 80% sessions completed
    const wellnessEligibleJourneys = journeys.filter(j =>
      j.status === 'ACTIVE' &&
      j.totalSessions > 0 &&
      (j.completedSessions / j.totalSessions) >= 0.8
    );

    // Calculate Recovery Progress
    let totalProgress = 0;
    journeys.forEach(j => {
      if (j.totalSessions > 0) {
        totalProgress += (j.completedSessions / j.totalSessions) * 100;
      }
    });
    const recoveryProgress = journeys.length > 0 ? Math.round(totalProgress / journeys.length) : 0;

    // Calculate Medication Adherence
    let totalTaken = 0;
    let totalLogs = 0;
    journeys.forEach(j => {
      j.medications.forEach(m => {
        totalLogs++;
        if (m.taken) totalTaken++;
      });
    });
    const medicationAdherence = totalLogs > 0 ? Math.round((totalTaken / totalLogs) * 100) : 0;

    // Prepare lists for dashboard panels
    const patientsNeedingAttention = atRiskJourneys.map(j => ({
      id: j.id,
      name: j.patient.fullName || "Unknown Patient",
      reason: j.progressNotes || "Needs clinical review",
      status: "needs-attention"
    })).slice(0, 5);

    const patientsNearingWellness = wellnessEligibleJourneys.map(j => ({
      id: j.id,
      name: j.patient.fullName || "Unknown Patient",
      sittings: { current: j.completedSessions, total: j.totalSessions },
      status: "on-track"
    })).slice(0, 5);

    res.json({
      activeJourneys: activeJourneys.length,
      atRisk: atRiskJourneys.length,
      wellnessEligible: wellnessEligibleJourneys.length,
      completed: completedJourneys.length,
      recoveryProgress,
      medicationAdherence,
      patientsNeedingAttention,
      patientsNearingWellness
    });
  } catch (err) {
    next(err);
  }
});

// Get aggregate admin statistics
router.get('/admin/stats', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const totalPatients = await prisma.patient.count();

    // Fetch all journeys for global clinical oversight
    const journeys = await prisma.journey.findMany({
      include: {
        patient: true,
        doctor: true
      }
    });

    const activeJourneys = journeys.filter(j => j.status === 'ACTIVE' || j.status === 'AT_RISK');
    const atRiskJourneys = journeys.filter(j => j.status === 'AT_RISK');
    const wellnessEligibleJourneys = journeys.filter(j =>
      j.status === 'ACTIVE' &&
      j.totalSessions > 0 &&
      (j.completedSessions / j.totalSessions) >= 0.8
    );
    const completedJourneys = journeys.filter(j => j.status === 'COMPLETED');

    // Prepare lists for admin dashboard
    const atRiskList = atRiskJourneys.map(j => ({
      id: j.id,
      patientName: j.patient.fullName || "Unknown",
      doctorName: j.doctor?.fullName || "Unassigned",
      reason: j.progressNotes || "Needs clinical review",
      status: "at-risk"
    })).slice(0, 10);

    const wellnessEligibleList = wellnessEligibleJourneys.map(j => ({
      id: j.id,
      patientName: j.patient.fullName || "Unknown",
      sittings: { current: j.completedSessions, total: j.totalSessions },
      status: "on-track"
    })).slice(0, 10);

    // Mock recent alerts (or fetch from an Alerts table if implemented)
    // For now, let's derive some alerts from AT_RISK journeys
    const recentAlerts = atRiskJourneys.map(j => ({
      id: `alert-${j.id}`,
      message: `Critical: ${j.patient.fullName} marked as AT_RISK. Review progress with Dr. ${j.doctor?.fullName || 'Assigned Doctor'}.`,
      priority: 1
    })).slice(0, 5);

    res.json({
      activeJourneys: activeJourneys.length,
      atRisk: atRiskJourneys.length,
      wellnessEligible: wellnessEligibleJourneys.length,
      completed: completedJourneys.length,
      totalPatients,
      atRiskJourneys: atRiskList,
      wellnessEligibleJourneys: wellnessEligibleList,
      recentAlerts
    });
  } catch (err) {
    next(err);
  }
});

// Delete doctor (soft delete)
router.delete('/doctor/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find doctor
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Soft delete the user (which cascades to doctor profile)
    await prisma.user.update({
      where: { id: doctor.userId },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Doctor deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

// Delete therapist (soft delete)
router.delete('/therapist/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find therapist
    const therapist = await prisma.therapist.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!therapist) {
      return res.status(404).json({ error: 'Therapist not found' });
    }

    // Soft delete the user (which cascades to therapist profile)
    await prisma.user.update({
      where: { id: therapist.userId },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Therapist deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

// Delete patient (soft delete)
router.delete('/patient/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find patient
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Soft delete the user (which cascades to patient profile)
    await prisma.user.update({
      where: { id: patient.userId },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Patient deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

// Delete pharmacist (soft delete)
router.delete('/pharmacist/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const pharmacist = await prisma.pharmacist.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!pharmacist) return res.status(404).json({ error: 'Pharmacist not found' });
    await prisma.user.update({
      where: { id: pharmacist.userId },
      data: { deletedAt: new Date() }
    });
    res.json({ message: 'Pharmacist deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

// Update doctor (admin only)
const updateDoctorSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  yearsExperience: z.number().optional(),
  clinic: z.string().optional(),
});

router.put('/doctor/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, ...profileData } = updateDoctorSchema.parse(req.body);

    const doctor = await prisma.doctor.findUnique({ where: { id }, include: { user: true } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    await prisma.$transaction(async (tx) => {
      if (email && email !== doctor.user.email) {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) throw new Error('Email already in use');
        await tx.user.update({ where: { id: doctor.userId }, data: { email } });
      }
      await tx.doctor.update({ where: { id }, data: profileData });
    });

    res.json({ message: 'Doctor updated successfully' });
  } catch (err) {
    if (err.message === 'Email already in use') return res.status(409).json({ error: err.message });
    next(err);
  }
});

// Update therapist (admin only)
const updateTherapistSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  yearsExperience: z.number().optional(),
  clinic: z.string().optional(),
});

router.put('/therapist/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, ...profileData } = updateTherapistSchema.parse(req.body);

    const therapist = await prisma.therapist.findUnique({ where: { id }, include: { user: true } });
    if (!therapist) return res.status(404).json({ error: 'Therapist not found' });

    await prisma.$transaction(async (tx) => {
      if (email && email !== therapist.user.email) {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) throw new Error('Email already in use');
        await tx.user.update({ where: { id: therapist.userId }, data: { email } });
      }
      await tx.therapist.update({ where: { id }, data: profileData });
    });

    res.json({ message: 'Therapist updated successfully' });
  } catch (err) {
    if (err.message === 'Email already in use') return res.status(409).json({ error: err.message });
    next(err);
  }
});

// Update patient (admin/doctor-admin only)
const updatePatientSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  age: z.number().optional(),
  gender: z.string().optional(),
  therapyType: z.string().optional(),
  patientId: z.string().optional(),
});

router.put('/patient/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, ...profileData } = updatePatientSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id }, include: { user: true } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    await prisma.$transaction(async (tx) => {
      if (email && email !== patient.user.email) {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) throw new Error('Email already in use');
        await tx.user.update({ where: { id: patient.userId }, data: { email } });
      }
      await tx.patient.update({ where: { id }, data: profileData });
    });

    res.json({ message: 'Patient updated successfully' });
  } catch (err) {
    if (err.message === 'Email already in use') return res.status(409).json({ error: err.message });
    next(err);
  }
});

// Update pharmacist (admin only)
const updatePharmacistSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().optional(),
  qualification: z.string().optional(),
  yearsExperience: z.number().optional(),
});

router.put('/pharmacist/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, ...profileData } = updatePharmacistSchema.parse(req.body);

    const pharmacist = await prisma.pharmacist.findUnique({ where: { id }, include: { user: true } });
    if (!pharmacist) return res.status(404).json({ error: 'Pharmacist not found' });

    await prisma.$transaction(async (tx) => {
      if (email && email !== pharmacist.user.email) {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) throw new Error('Email already in use');
        await tx.user.update({ where: { id: pharmacist.userId }, data: { email } });
      }
      await tx.pharmacist.update({ where: { id }, data: profileData });
    });

    res.json({ message: 'Pharmacist updated successfully' });
  } catch (err) {
    if (err.message === 'Email already in use') return res.status(409).json({ error: err.message });
    next(err);
  }
});

export default router;