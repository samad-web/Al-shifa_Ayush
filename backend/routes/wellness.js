import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Get patient wellness stats and points
router.get('/stats', authMiddleware, roleMiddleware(['PATIENT']), async (req, res, next) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { userId: req.user.id },
            include: {
                dailyCheckIns: {
                    orderBy: { createdAt: 'desc' },
                    take: 7
                }
            }
        });

        if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

        res.json({
            zenPoints: patient.zenPoints,
            dailyCheckIns: patient.dailyCheckIns,
            // Derived level logic
            level: patient.zenPoints >= 1000 ? 'Zen Master' : patient.zenPoints >= 500 ? 'Peaceful Soul' : 'Mindful Beginner'
        });
    } catch (err) {
        next(err);
    }
});

// Submit daily check-in
const checkInSchema = z.object({
    painLevel: z.number().min(0).max(10),
    sleepHours: z.number().min(0),
    mood: z.string(),
    notes: z.string().optional(),
});

router.post('/check-in', authMiddleware, roleMiddleware(['PATIENT']), async (req, res, next) => {
    try {
        const data = checkInSchema.parse(req.body);
        const patient = await prisma.patient.findUnique({
            where: { userId: req.user.id }
        });

        if (!patient) return res.status(404).json({ error: 'Patient profile not found. Please complete onboarding.' });

        // Check if already checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingCheckIn = await prisma.dailyCheckIn.findFirst({
            where: {
                patientId: patient.id,
                createdAt: { gte: today }
            }
        });

        if (existingCheckIn) {
            return res.status(400).json({ error: 'You have already checked in today.' });
        }

        const checkIn = await prisma.dailyCheckIn.create({
            data: {
                ...data,
                patientId: patient.id
            }
        });

        // Award Zen Points (10 pts for daily check-in)
        await prisma.patient.update({
            where: { id: patient.id },
            data: { zenPoints: { increment: 10 } }
        });

        res.json({ message: 'Check-in successful (+10 Zen Points)', checkIn });
    } catch (err) {
        next(err);
    }
});

// Exercise Library Logic
router.get('/videos', authMiddleware, async (req, res, next) => {
    try {
        const videos = await prisma.exerciseVideo.findMany();
        res.json(videos);
    } catch (err) {
        next(err);
    }
});

router.get('/my-prescriptions', authMiddleware, roleMiddleware(['PATIENT']), async (req, res, next) => {
    try {
        const patient = await prisma.patient.findUnique({
            where: { userId: req.user.id }
        });
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const prescriptions = await prisma.videoPrescription.findMany({
            where: { patientId: patient.id },
            include: { video: true, doctor: true, therapist: true }
        });
        res.json(prescriptions);
    } catch (err) {
        next(err);
    }
});

// Prescribe a video (Doctor/Therapist only)
const prescribeSchema = z.object({
    patientId: z.string(),
    videoId: z.string(),
    notes: z.string().optional(),
});

router.post('/prescribe', authMiddleware, roleMiddleware(['DOCTOR', 'THERAPIST', 'ADMIN_DOCTOR', 'ADMIN']), async (req, res, next) => {
    try {
        const { patientId, videoId, notes } = prescribeSchema.parse(req.body);

        // Determine prescriber field
        const prescriber = {};
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { doctor: true, therapist: true }
        });

        if (user.doctor) prescriber.doctorId = user.doctor.id;
        else if (user.therapist) prescriber.therapistId = user.therapist.id;

        const prescription = await prisma.videoPrescription.create({
            data: {
                patientId,
                videoId,
                notes,
                ...prescriber
            }
        });

        res.json({ message: 'Video prescribed successfully', prescription });
    } catch (err) {
        next(err);
    }
});

export default router;
