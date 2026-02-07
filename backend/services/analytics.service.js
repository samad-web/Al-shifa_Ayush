import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Analytics service for data aggregation and reporting
 */
class AnalyticsService {
    /**
     * Get patient progress analytics
     * @param {Object} filters - Date range and other filters
     */
    async getPatientProgress(filters = {}) {
        const { startDate, endDate, doctorId, status } = filters;

        const where = {};
        if (startDate || endDate) {
            where.startDate = {};
            if (startDate) where.startDate.gte = new Date(startDate);
            if (endDate) where.startDate.lte = new Date(endDate);
        }
        if (doctorId) where.doctorId = doctorId;
        if (status) where.status = status;

        const journeys = await prisma.journey.findMany({
            where,
            include: {
                patient: { include: { user: true } },
                doctor: { include: { user: true } },
            },
            orderBy: { startDate: 'desc' },
        });

        return journeys.map((journey) => ({
            patientId: journey.patient.patientId,
            patientName: journey.patient.fullName,
            totalSessions: journey.totalSessions,
            completedSessions: journey.completedSessions,
            progress: journey.totalSessions > 0
                ? Math.round((journey.completedSessions / journey.totalSessions) * 100)
                : 0,
            lastSession: journey.updatedAt,
            status: journey.status,
            doctorName: journey.doctor.fullName,
        }));
    }

    /**
     * Get doctor performance analytics
     * @param {Object} filters - Date range and doctor filters
     */
    async getDoctorPerformance(filters = {}) {
        const { startDate, endDate } = filters;

        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const doctors = await prisma.doctor.findMany({
            include: {
                appointments: {
                    where,
                },
                prescriptions: {
                    where,
                },
            },
        });

        return doctors.map((doctor) => {
            const totalAppointments = doctor.appointments.length;
            const completedAppointments = doctor.appointments.filter(
                (a) => a.status === 'COMPLETED'
            ).length;
            const cancelledAppointments = doctor.appointments.filter(
                (a) => a.status === 'CANCELLED'
            ).length;

            return {
                doctorId: doctor.id,
                doctorName: doctor.fullName,
                specialization: doctor.specialization,
                totalAppointments,
                completedAppointments,
                cancelledAppointments,
                completionRate: totalAppointments > 0
                    ? Math.round((completedAppointments / totalAppointments) * 100)
                    : 0,
                totalPrescriptions: doctor.prescriptions.length,
                avgRating: 0, // TODO: Implement rating system
            };
        });
    }

    /**
     * Get appointment analytics
     * @param {Object} filters - Date range and status filters
     */
    async getAppointmentAnalytics(filters = {}) {
        const { startDate, endDate, status, doctorId, therapistId } = filters;

        const where = {};
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }
        if (status) where.status = status;
        if (doctorId) where.doctorId = doctorId;
        if (therapistId) where.therapistId = therapistId;

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                patient: true,
                doctor: true,
                therapist: true,
            },
            orderBy: { date: 'desc' },
        });

        // Group by status
        const statusCounts = appointments.reduce((acc, apt) => {
            acc[apt.status] = (acc[apt.status] || 0) + 1;
            return acc;
        }, {});

        // Group by consultation mode
        const modeCounts = appointments.reduce((acc, apt) => {
            acc[apt.consultationMode] = (acc[apt.consultationMode] || 0) + 1;
            return acc;
        }, {});

        // Daily appointment trend
        const dailyTrend = appointments.reduce((acc, apt) => {
            const date = new Date(apt.date).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        return {
            total: appointments.length,
            byStatus: statusCounts,
            byMode: modeCounts,
            dailyTrend,
            appointments: appointments.map((apt) => ({
                appointmentId: apt.id,
                patientName: apt.patient.fullName,
                doctorName: apt.doctor?.fullName || 'N/A',
                therapistName: apt.therapist?.fullName || 'N/A',
                date: apt.date.toISOString().split('T')[0],
                time: apt.date.toTimeString().split(' ')[0],
                status: apt.status,
                type: apt.consultationMode,
            })),
        };
    }

    /**
     * Get prescription analytics
     */
    async getPrescriptionAnalytics(filters = {}) {
        const { startDate, endDate, doctorId, patientId } = filters;

        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }
        if (doctorId) where.doctorId = doctorId;
        if (patientId) where.patientId = patientId;

        const prescriptions = await prisma.prescription.findMany({
            where,
            include: {
                patient: true,
                doctor: true,
                therapist: true,
            },
        });

        // Top medications
        const medicationCounts = prescriptions.reduce((acc, rx) => {
            acc[rx.medicationName] = (acc[rx.medicationName] || 0) + 1;
            return acc;
        }, {});

        const topMedications = Object.entries(medicationCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ medication: name, count }));

        return {
            total: prescriptions.length,
            topMedications,
            byDoctor: prescriptions.reduce((acc, rx) => {
                const doctor = rx.doctor?.fullName || rx.therapist?.fullName || 'Unknown';
                acc[doctor] = (acc[doctor] || 0) + 1;
                return acc;
            }, {}),
        };
    }

    /**
     * Get dashboard summary statistics
     */
    async getDashboardStats(role, userId) {
        const stats = {};

        if (role === 'ADMIN' || role === 'ADMIN_DOCTOR') {
            const [patients, doctors, appointments, prescriptions] = await Promise.all([
                prisma.patient.count(),
                prisma.doctor.count(),
                prisma.appointment.count(),
                prisma.prescription.count(),
            ]);

            stats.totalPatients = patients;
            stats.totalDoctors = doctors;
            stats.totalAppointments = appointments;
            stats.totalPrescriptions = prescriptions;
        }

        if (role === 'DOCTOR' || role === 'ADMIN_DOCTOR') {
            const doctor = await prisma.doctor.findUnique({
                where: { userId },
                include: {
                    appointments: true,
                    prescriptions: true,
                },
            });

            if (doctor) {
                stats.myAppointments = doctor.appointments.length;
                stats.myPrescriptions = doctor.prescriptions.length;
                stats.todayAppointments = doctor.appointments.filter(
                    (a) => new Date(a.date).toDateString() === new Date().toDateString()
                ).length;
            }
        }

        return stats;
    }
}

export const analyticsService = new AnalyticsService();
