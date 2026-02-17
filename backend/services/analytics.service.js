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
                stats.completedSittings = doctor.appointments.filter(a => a.status === 'COMPLETED').length;
            }
        }

        if (role === 'THERAPIST') {
            const therapist = await prisma.therapist.findUnique({
                where: { userId },
                include: {
                    appointments: true,
                }
            });

            if (therapist) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                stats.todaySittings = therapist.appointments.filter(a =>
                    new Date(a.date) >= today && new Date(a.date) < tomorrow
                ).length;
                stats.completedSittings = therapist.appointments.filter(a => a.status === 'COMPLETED').length;
                stats.activeCases = [...new Set(therapist.appointments.filter(a => a.status !== 'COMPLETED').map(a => a.patientId))].length;
                stats.hoursWorked = (stats.completedSittings * 0.75).toFixed(1);
                stats.recoveryProgress = 75; // Logic placeholder
                stats.sessionAdherence = 92; // Logic placeholder
            }
        }

        return stats;
    }

    /**
     * Get dynamic comparative progress report for a client
     * @param {string} patientId - The patient ID
     */
    async getClientProgressReport(patientId) {
        const patient = await prisma.patient.findUnique({
            where: { id: patientId },
            include: {
                dailyCheckIns: { orderBy: { createdAt: 'desc' } },
                appointments: {
                    where: { status: 'COMPLETED' },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!patient) throw new Error('Patient not found');

        const totalSittings = patient.appointments.length;
        const currentCheckIn = patient.dailyCheckIns[0] || null;
        const historicalCheckIns = patient.dailyCheckIns.slice(1);

        const calculateAverage = (records, key) => {
            if (!records.length) return 0;
            const validRecords = records.filter(r => r[key] !== null && r[key] !== undefined);
            if (!validRecords.length) return 0;
            return validRecords.reduce((sum, r) => sum + r[key], 0) / validRecords.length;
        };

        const prevMetrics = {
            avgPain: calculateAverage(historicalCheckIns, 'painLevel'),
            avgMobility: calculateAverage(historicalCheckIns, 'mobilityScore'),
            avgSleep: calculateAverage(historicalCheckIns, 'sleepHours')
        };

        const currentMetrics = {
            pain: currentCheckIn?.painLevel || 0,
            mobility: currentCheckIn?.mobilityScore || 0,
            sleep: currentCheckIn?.sleepHours || 0,
            date: currentCheckIn?.createdAt
        };

        const calculateChange = (prev, curr, lowerIsBetter = false) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            const change = ((curr - prev) / prev) * 100;
            return lowerIsBetter ? -change : change;
        };

        const analysis = {
            painImprovement: calculateChange(prevMetrics.avgPain, currentMetrics.pain, true),
            mobilityImprovement: calculateChange(prevMetrics.avgMobility, currentMetrics.mobility),
            sleepImprovement: calculateChange(prevMetrics.avgSleep, currentMetrics.sleep),
        };

        return {
            patientName: patient.fullName,
            totalPreviousSittings: totalSittings > 0 ? totalSittings - 1 : 0,
            previousData: {
                averages: prevMetrics,
                recordCount: historicalCheckIns.length,
                breakdown: historicalCheckIns.slice(0, 5).map(h => ({
                    date: h.createdAt,
                    pain: h.painLevel,
                    mobility: h.mobilityScore,
                    sleep: h.sleepHours
                }))
            },
            currentSession: {
                metrics: currentMetrics,
                notes: currentCheckIn?.notes || ''
            },
            progressAnalysis: {
                metrics: [
                    { label: 'Pain Level', change: analysis.painImprovement, current: currentMetrics.pain, previous: prevMetrics.avgPain },
                    { label: 'Mobility Score', change: analysis.mobilityImprovement, current: currentMetrics.mobility, previous: prevMetrics.avgMobility },
                    { label: 'Sleep Quality', change: analysis.sleepImprovement, current: currentMetrics.sleep, previous: prevMetrics.avgSleep }
                ],
                summary: this._generateSummary(analysis)
            }
        };
    }

    _generateSummary(analysis) {
        const trends = [];
        if (analysis.painImprovement > 5) trends.push("notable reduction in pain levels");
        else if (analysis.painImprovement < -5) trends.push("slight increase in reported pain");

        if (analysis.mobilityImprovement > 5) trends.push("significant improvement in mobility");
        if (analysis.sleepImprovement > 5) trends.push("better sleep patterns observed");

        if (trends.length === 0) return "Patient state is stable with no major changes in tracked metrics.";
        return `The patient is showing a ${trends.join(' and ')}. Overall progress is positive.`;
    }
}

export const analyticsService = new AnalyticsService();
