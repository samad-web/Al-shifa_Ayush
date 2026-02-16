import express from 'express';
import { z } from 'zod';
import { AppointmentService } from '../services/appointment.service.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const appointmentSchema = z.object({
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  therapistId: z.string().optional(),
  date: z.string(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  notes: z.string().optional(),
  triageSessionId: z.string().optional(),
  contactDetails: z.object({
    fullName: z.string().min(2),
    phoneNumber: z.string(),
    email: z.string().email()
  }).optional()
});

const updateAppointmentSchema = z.object({
  date: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  notes: z.string().optional()
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const appointments = await AppointmentService.getAppointments(req.user);
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, roleMiddleware(['PATIENT', 'ADMIN', 'ADMIN_DOCTOR']), validate({ body: appointmentSchema }), async (req, res, next) => {
  try {
    const appointment = await AppointmentService.createAppointment(req.user, req.body);
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

router.get('/available-staff', authMiddleware, async (req, res, next) => {
  try {
    const staff = await AppointmentService.getAvailableStaff();
    res.json(staff);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authMiddleware, validate({ body: updateAppointmentSchema }), async (req, res, next) => {
  try {
    const appointment = await AppointmentService.updateAppointment(req.params.id, req.user, req.body);
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    await AppointmentService.cancelAppointment(req.params.id);
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/approve', authMiddleware, roleMiddleware(['DOCTOR', 'ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const appointment = await AppointmentService.updateAppointment(req.params.id, req.user, { status: 'CONFIRMED' });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/reject', authMiddleware, roleMiddleware(['DOCTOR', 'ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const appointment = await AppointmentService.updateAppointment(req.params.id, req.user, {
      status: 'CANCELLED',
      notes: reason ? `Rejected: ${reason}` : undefined
    });
    res.json(appointment);
  } catch (err) {
    next(err);
  }
});

export default router;
