import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { notificationService } from '../services/notification.service.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user notifications with pagination
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const skip = parseInt(req.query.skip) || 0;
        const take = parseInt(req.query.take) || 20;
        const unreadOnly = req.query.unreadOnly === 'true';

        const result = await notificationService.getUserNotifications(userId, {
            skip,
            take,
            unreadOnly,
        });

        res.json(result);
    } catch (err) {
        next(err);
    }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res, next) => {
    try {
        const notification = await notificationService.markAsRead(req.params.id);
        res.json(notification);
    } catch (err) {
        next(err);
    }
});

// Mark all notifications as read
router.put('/read-all', authMiddleware, async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        next(err);
    }
});

// Get notification preferences
router.get('/preferences', authMiddleware, async (req, res, next) => {
    try {
        const prefs = await notificationService.getPreferences(req.user.id);
        res.json(prefs);
    } catch (err) {
        next(err);
    }
});

// Update notification preferences
router.put('/preferences', authMiddleware, async (req, res, next) => {
    try {
        const prefs = await notificationService.updatePreferences(req.user.id, req.body);
        res.json(prefs);
    } catch (err) {
        next(err);
    }
});

// Get unread count (for notification bell)
router.get('/unread-count', authMiddleware, async (req, res, next) => {
    try {
        const count = await prisma.notification.count({
            where: {
                userId: req.user.id,
                isRead: false,
            },
        });
        res.json({ count });
    } catch (err) {
        next(err);
    }
});

export default router;
