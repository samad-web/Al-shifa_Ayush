import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get therapist availability
router.get('/availability', authMiddleware, roleMiddleware(['THERAPIST', 'ADMIN']), async (req, res, next) => {
    try {
        const therapistRecord = await prisma.therapist.findUnique({
            where: { userId: req.user.id }
        });

        if (!therapistRecord && req.user.role === 'THERAPIST') {
            return res.status(404).json({ error: 'Therapist profile not found' });
        }

        const availability = await prisma.availability.findMany({
            where: {
                therapistId: req.user.role === 'ADMIN' ? req.query.therapistId : therapistRecord.id
            },
            orderBy: { dayOfWeek: 'asc' }
        });
        res.json(availability);
    } catch (err) {
        next(err);
    }
});

// Update availability (Requires Admin approval in a real app, here we set isApproved based on role)
router.post('/availability', authMiddleware, roleMiddleware(['THERAPIST', 'ADMIN']), async (req, res, next) => {
    try {
        const { dayOfWeek, startTime, endTime } = req.body;

        const therapistRecord = await prisma.therapist.findUnique({
            where: { userId: req.user.id }
        });

        if (!therapistRecord) {
            return res.status(404).json({ error: 'Therapist profile not found' });
        }

        const availability = await prisma.availability.create({
            data: {
                therapistId: therapistRecord.id,
                dayOfWeek,
                startTime,
                endTime,
                isApproved: req.user.role === 'ADMIN' // Only auto-approved if admin creates it
            }
        });
        res.status(201).json(availability);
    } catch (err) {
        next(err);
    }
});

// Start a session (Generate meeting link if ONLINE)
router.post('/session/:appointmentId/start', authMiddleware, roleMiddleware(['THERAPIST']), async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId }
        });

        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        let updateData = { status: 'IN_PROGRESS' };

        if (appointment.consultationMode === 'ONLINE' && !appointment.meetingLink) {
            // Logic for generating a real meeting link would go here
            // For now, using a placeholder Jitsi/Google Meet link
            updateData.meetingLink = `https://meet.jit.si/Alshifa-${appointment.id}`;
        }

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: updateData
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// Save session notes
router.post('/session/:appointmentId/notes', authMiddleware, roleMiddleware(['THERAPIST']), async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { sessionNotes } = req.body;

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { sessionNotes }
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// Complete a session
router.post('/session/:appointmentId/complete', authMiddleware, roleMiddleware(['THERAPIST']), async (req, res, next) => {
    try {
        const { appointmentId } = req.params;

        const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'COMPLETED' }
        });

        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// Get therapist statistics
router.get('/therapist/stats', authMiddleware, roleMiddleware(['THERAPIST']), async (req, res, next) => {
    try {
        const therapistRecord = await prisma.therapist.findUnique({
            where: { userId: req.user.id }
        });

        if (!therapistRecord) {
            return res.status(404).json({ error: 'Therapist profile not found' });
        }

        const therapistId = therapistRecord.id;

        // Today's sittings count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaySittingsCount = await prisma.appointment.count({
            where: {
                therapistId,
                date: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        // Active cases (unique patients)
        const activePatients = await prisma.appointment.groupBy({
            by: ['patientId'],
            where: {
                therapistId,
                status: { not: 'COMPLETED' }
            }
        });

        // Total completed sittings
        const totalCompleted = await prisma.appointment.count({
            where: {
                therapistId,
                status: 'COMPLETED'
            }
        });

        // Hours delivered (mock calculation: 45 mins per completed sitting)
        const hoursDelivered = (totalCompleted * 0.75).toFixed(1);

        // Simple mock progress rates since we don't have scoring yet
        const recoveryProgress = 75;
        const sessionAdherence = 92;

        res.json({
            todaySittings: todaySittingsCount,
            activeCases: activePatients.length,
            completedSittings: totalCompleted,
            hoursWorked: hoursDelivered,
            recoveryProgress,
            sessionAdherence,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
