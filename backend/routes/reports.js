import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { analyticsService } from '../services/analytics.service.js';
import { exportService } from '../services/export.service.js';
import { createReadStream, unlink } from 'fs';

const router = express.Router();

// Get patient progress report
router.get(
    '/patient-progress',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR']),
    async (req, res, next) => {
        try {
            const { startDate, endDate, doctorId, status } = req.query;

            const data = await analyticsService.getPatientProgress({
                startDate,
                endDate,
                doctorId,
                status,
            });

            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Export patient progress as CSV
router.get(
    '/patient-progress/export/csv',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR']),
    async (req, res, next) => {
        try {
            const { startDate, endDate, doctorId, status } = req.query;

            const data = await analyticsService.getPatientProgress({
                startDate,
                endDate,
                doctorId,
                status,
            });

            const filepath = await exportService.exportPatientProgress(data);

            // Stream file to client
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="patient_progress.csv"`
            );

            const fileStream = createReadStream(filepath);
            fileStream.pipe(res);

            // Clean up file after sending
            fileStream.on('end', () => {
                unlink(filepath, (err) => {
                    if (err) console.error('Failed to delete temp file:', err);
                });
            });
        } catch (err) {
            next(err);
        }
    }
);

// Get doctor performance report
router.get(
    '/doctor-performance',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']),
    async (req, res, next) => {
        try {
            const { startDate, endDate } = req.query;

            const data = await analyticsService.getDoctorPerformance({
                startDate,
                endDate,
            });

            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Export doctor performance as PDF
router.get(
    '/doctor-performance/export/pdf',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']),
    async (req, res, next) => {
        try {
            const { startDate, endDate } = req.query;

            const data = await analyticsService.getDoctorPerformance({
                startDate,
                endDate,
            });

            const filepath = await exportService.exportDoctorPerformance(data, {
                generatedAt: new Date(),
                dateRange: startDate && endDate
                    ? `${startDate} to ${endDate}`
                    : 'All time',
            });

            // Stream file to client
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="doctor_performance.pdf"`
            );

            const fileStream = createReadStream(filepath);
            fileStream.pipe(res);

            // Clean up file after sending
            fileStream.on('end', () => {
                unlink(filepath, (err) => {
                    if (err) console.error('Failed to delete temp file:', err);
                });
            });
        } catch (err) {
            next(err);
        }
    }
);

// Get appointment analytics
router.get(
    '/appointments',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST']),
    async (req, res, next) => {
        try {
            const { startDate, endDate, status, doctorId, therapistId } = req.query;

            const data = await analyticsService.getAppointmentAnalytics({
                startDate,
                endDate,
                status,
                doctorId,
                therapistId,
            });

            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Export appointments as CSV
router.get(
    '/appointments/export/csv',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST']),
    async (req, res, next) => {
        try {
            const { startDate, endDate, status, doctorId, therapistId } = req.query;

            const result = await analyticsService.getAppointmentAnalytics({
                startDate,
                endDate,
                status,
                doctorId,
                therapistId,
            });

            const filepath = await exportService.exportAppointments(result.appointments);

            // Stream file to client
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="appointments.csv"`
            );

            const fileStream = createReadStream(filepath);
            fileStream.pipe(res);

            // Clean up file after sending
            fileStream.on('end', () => {
                unlink(filepath, (err) => {
                    if (err) console.error('Failed to delete temp file:', err);
                });
            });
        } catch (err) {
            next(err);
        }
    }
);

// Get prescription analytics
router.get(
    '/prescriptions',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR', 'DOCTOR', 'THERAPIST']),
    async (req, res, next) => {
        try {
            const { startDate, endDate, doctorId, patientId } = req.query;

            const data = await analyticsService.getPrescriptionAnalytics({
                startDate,
                endDate,
                doctorId,
                patientId,
            });

            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }
);

// Get dashboard statistics
router.get(
    '/dashboard-stats',
    authMiddleware,
    async (req, res, next) => {
        try {
            const stats = await analyticsService.getDashboardStats(
                req.user.role,
                req.user.id
            );

            res.json({ success: true, data: stats });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
