
import express from 'express';
import { z } from 'zod';
import { AvailabilityService } from '../services/availability.service.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const createBlockSchema = z.object({
    doctorId: z.string().uuid(),
    date: z.string().optional(), // ISO Date string
    dayOfWeek: z.number().min(0).max(6).optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:mm'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:mm'),
    reason: z.string().optional()
}).refine(data => data.date || data.dayOfWeek !== undefined, {
    message: "Either date or dayOfWeek must be provided"
});

router.post('/block', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), validate({ body: createBlockSchema }), async (req, res, next) => {
    try {
        const block = await AvailabilityService.createBlock(req.body);
        res.status(201).json(block);
    } catch (err) {
        next(err);
    }
});

router.delete('/block/:id', authMiddleware, roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
    try {
        await AvailabilityService.deleteBlock(req.params.id);
        res.json({ message: 'Block removed successfully' });
    } catch (err) {
        next(err);
    }
});

router.get('/:doctorId', authMiddleware, async (req, res, next) => {
    try {
        const blocks = await AvailabilityService.getBlocks(req.params.doctorId);
        res.json(blocks);
    } catch (err) {
        next(err);
    }
});

export default router;
