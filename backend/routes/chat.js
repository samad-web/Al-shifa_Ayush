import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get or create conversation between patient and doctor
router.post('/conversation', authMiddleware, async (req, res, next) => {
    try {
        const { patientId, doctorId } = req.body;

        let conversation = await prisma.conversation.findUnique({
            where: {
                patientId_doctorId: { patientId, doctorId }
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: { patientId, doctorId }
            });
        }

        res.json(conversation);
    } catch (err) {
        next(err);
    }
});

// List user's conversations
router.get('/conversations', authMiddleware, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                doctor: true,
                patient: true
            }
        });

        let where = {};
        if (user.doctor) where = { doctorId: user.doctor.id };
        else if (user.patient) where = { patientId: user.patient.id };
        else return res.status(403).json({ error: 'Only doctors and patients can chat' });

        const conversations = await prisma.conversation.findMany({
            where,
            include: {
                patient: { select: { fullName: true, userId: true } },
                doctor: { select: { fullName: true, userId: true, profilePhoto: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(conversations);
    } catch (err) {
        next(err);
    }
});

// Get messages for a conversation
router.get('/messages/:conversationId', authMiddleware, async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const messages = await prisma.message.findMany({
            where: { conversationId },
            include: {
                sender: {
                    select: {
                        id: true,
                        role: true,
                        doctor: { select: { fullName: true } },
                        patient: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json(messages);
    } catch (err) {
        next(err);
    }
});

export default router;
