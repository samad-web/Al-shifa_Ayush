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

    const includeDetails = {
      doctor: { include: { user: { select: { email: true } } } },
      therapist: { include: { user: { select: { email: true } } } },
      patient: { include: { user: { select: { email: true } } } },
    };

    if (role === 'PATIENT') {
      // Fetch patient record to get patient ID
      const patientRecord = await prisma.patient.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });

      if (!patientRecord) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }

      appointments = await prisma.appointment.findMany({
        where: { patientId: patientRecord.id },
        include: includeDetails,
        orderBy: { date: 'desc' }
      });
    } else if (role === 'DOCTOR' || role === 'ADMIN_DOCTOR') {
      // Fetch doctor record to get doctor ID
      const doctorRecord = await prisma.doctor.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });

      if (!doctorRecord) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      appointments = await prisma.appointment.findMany({
        where: { doctorId: doctorRecord.id },
        include: includeDetails,
        orderBy: { date: 'desc' }
      });
    } else if (role === 'THERAPIST') {
      // Fetch therapist record to get therapist ID
      const therapistRecord = await prisma.therapist.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });

      if (!therapistRecord) {
        return res.status(404).json({ error: 'Therapist profile not found' });
      }

      appointments = await prisma.appointment.findMany({
        where: { therapistId: therapistRecord.id },
        include: includeDetails,
        orderBy: { date: 'desc' }
      });
    } else if (role === 'ADMIN') {
      // Admin can see all appointments
      appointments = await prisma.appointment.findMany({
        include: includeDetails,
        orderBy: { date: 'desc' }
      });
    }

    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

// Create appointment (PATIENT, ADMIN, ADMIN_DOCTOR)
router.post('/', authMiddleware, roleMiddleware(['PATIENT', 'ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    console.log('[CREATE APPOINTMENT] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[CREATE APPOINTMENT] User:', { id: req.user.id, role: req.user.role });

    const { patientId, doctorId, therapistId, date, status, notes, contactDetails } = req.body;

    // Determine the actual patient ID
    let actualPatientId;
    if (req.user.role === 'PATIENT') {
      // Patients can only create appointments for themselves
      // Fetch the patient record to get the patient ID
      const patientRecord = await prisma.patient.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });

      if (!patientRecord) {
        return res.status(404).json({ error: 'Patient profile not found. Please contact support.' });
      }

      actualPatientId = patientRecord.id;
    } else if (['ADMIN', 'ADMIN_DOCTOR'].includes(req.user.role)) {
      // Admin can create appointments for any patient
      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required for admin' });
      }
      actualPatientId = patientId;
    }

    console.log('[CREATE APPOINTMENT] actualPatientId:', actualPatientId);
    console.log('[CREATE APPOINTMENT] doctorId:', doctorId);
    console.log('[CREATE APPOINTMENT] therapistId:', therapistId);

    // Validate and store contact details if provided
    if (contactDetails) {
      if (!contactDetails.fullName || contactDetails.fullName.trim().length < 2) {
        return res.status(400).json({ error: 'Valid full name is required (minimum 2 characters)' });
      }

      const phoneRegex = /^[\+]?[0-9]{10,15}$/;
      const cleanPhone = contactDetails.phoneNumber?.replace(/[\s\-]/g, '');
      if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ error: 'Valid phone number is required (10-15 digits)' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!contactDetails.email || !emailRegex.test(contactDetails.email)) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }

      // Update patient record with contact details
      await prisma.patient.update({
        where: { id: actualPatientId },
        data: {
          fullName: contactDetails.fullName,
          phoneNumber: cleanPhone,
        },
      });

      // Update user email if different
      const patient = await prisma.patient.findUnique({
        where: { id: actualPatientId },
        include: { user: true },
      });

      console.log('[CREATE APPOINTMENT] Patient record:', patient ? { id: patient.id, userId: patient.userId, hasUser: !!patient.user } : 'null');

      if (patient && patient.user && patient.user.email !== contactDetails.email) {
        console.log('[CREATE APPOINTMENT] Updating user email from', patient.user.email, 'to', contactDetails.email);
        await prisma.user.update({
          where: { id: patient.userId },
          data: { email: contactDetails.email },
        });
      }
    }

    console.log('[CREATE APPOINTMENT] Creating appointment with data:', {
      patientId: actualPatientId,
      doctorId,
      therapistId,
      date: new Date(date),
      status: req.user.role === 'PATIENT' ? 'PENDING' : (status || 'CONFIRMED'),
    });

    const appointment = await prisma.appointment.create({
      data: {
        patientId: actualPatientId,
        doctorId,
        therapistId,
        date: new Date(date),
        status: req.user.role === 'PATIENT' ? 'PENDING' : (status || 'CONFIRMED'),
        notes,
      },
      include: {
        doctor: { include: { user: { select: { email: true } } } },
        therapist: { include: { user: { select: { email: true } } } },
        patient: { include: { user: { select: { email: true } } } },
      }
    });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

// Get available doctors and therapists for booking
router.get('/available-staff', authMiddleware, async (req, res, next) => {
  try {
    const [doctors, therapists] = await Promise.all([
      prisma.doctor.findMany({
        include: {
          user: {
            select: {
              email: true,
              role: true
            }
          }
        },
        orderBy: { fullName: 'asc' }
      }),
      prisma.therapist.findMany({
        include: {
          user: {
            select: {
              email: true,
              role: true
            }
          }
        },
        orderBy: { fullName: 'asc' }
      })
    ]);

    res.json({ doctors, therapists });
  } catch (err) {
    next(err);
  }
});

// Update appointment (ADMIN, ADMIN_DOCTOR, or involved party)
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, status, notes } = req.body;

    // Check if appointment exists
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, doctor: true, therapist: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Permission check
    const isAdmin = ['ADMIN', 'ADMIN_DOCTOR'].includes(req.user.role);
    const isPatient = req.user.role === 'PATIENT' && req.user.patient?.id === existing.patientId;
    const isDoctor = (req.user.role === 'DOCTOR' || req.user.role === 'ADMIN_DOCTOR') && req.user.doctor?.id === existing.doctorId;
    const isTherapist = req.user.role === 'THERAPIST' && req.user.therapist?.id === existing.therapistId;

    if (!isAdmin && !isPatient && !isDoctor && !isTherapist) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(date && { date: new Date(date) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        doctor: { include: { user: { select: { email: true } } } },
        therapist: { include: { user: { select: { email: true } } } },
        patient: { include: { user: { select: { email: true } } } },
      }
    });

    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

// Cancel/Delete appointment (ADMIN, ADMIN_DOCTOR, or patient who created it)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Permission check
    const isAdmin = ['ADMIN', 'ADMIN_DOCTOR'].includes(req.user.role);
    const isPatient = req.user.role === 'PATIENT' && req.user.patient?.id === existing.patientId;

    if (!isAdmin && !isPatient) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update status to CANCELLED instead of hard delete
    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

// Approve appointment (DOCTOR, ADMIN, ADMIN_DOCTOR)
router.put('/:id/approve', authMiddleware, roleMiddleware(['DOCTOR', 'ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get the appointment first to check status
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only PENDING appointments can be approved' });
    }

    // Update status to CONFIRMED
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: {
        doctor: { include: { user: { select: { email: true } } } },
        therapist: { include: { user: { select: { email: true } } } },
        patient: { include: { user: { select: { email: true } } } },
      },
    });

    res.json(updatedAppointment);
  } catch (err) {
    next(err);
  }
});

// Reject appointment (DOCTOR, ADMIN, ADMIN_DOCTOR)
router.put('/:id/reject', authMiddleware, roleMiddleware(['DOCTOR', 'ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get the appointment first to check status
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only PENDING appointments can be rejected' });
    }

    // Update status to CANCELLED with optional reason
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Rejected: ${reason}` : appointment.notes
      },
      include: {
        doctor: { include: { user: { select: { email: true } } } },
        therapist: { include: { user: { select: { email: true } } } },
        patient: { include: { user: { select: { email: true } } } },
      },
    });

    res.json(updatedAppointment);
  } catch (err) {
    next(err);
  }
});

export default router;
