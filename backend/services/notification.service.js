import { PrismaClient } from '@prisma/client';
import { emailService } from './email.service.js';
import { smsService } from './sms.service.js';
import { emitToUser } from '../websocket/index.js';

const prisma = new PrismaClient();

/**
 * Central notification service
 * Handles creating, sending, and managing notifications across all channels
 */
class NotificationService {
    /**
     * Create and send a notification
     * @param {Object} options - Notification options
     * @param {string} options.userId - Recipient user ID
     * @param {string} options.type - Notification type
     * @param {string} options.title - Notification title
     * @param {string} options.message - Notification message
     * @param {Object} options.data - Additional context data
     * @param {boolean} options.sendEmail - Send via email
     * @param {boolean} options.sendSMS - Send via SMS
     */
    async create({ userId, type, title, message, data = {}, sendEmail = false, sendSMS = false }) {
        try {
            // Create in-app notification
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    data,
                },
            });

            // Emit real-time notification via WebSocket
            try {
                emitToUser(userId, 'notification', notification);
            } catch (wsError) {
                console.warn('[NotificationService] WebSocket emission failed:', wsError.message);
            }

            // Get user preferences
            const prefs = await prisma.notificationPreference.findUnique({
                where: { userId },
            });

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { patient: true, doctor: true, therapist: true },
            });

            // Send email if enabled
            if (sendEmail && prefs?.emailEnabled && user?.email) {
                await emailService.sendNotification(user.email, title, message, data);
            }

            // Send SMS if enabled
            if (sendSMS && prefs?.smsEnabled) {
                const phoneNumber = user?.patient?.phoneNumber || user?.doctor?.phoneNumber || user?.therapist?.phoneNumber;
                if (phoneNumber) {
                    await smsService.sendNotification(phoneNumber, message);
                }
            }

            return notification;
        } catch (error) {
            console.error('[NotificationService] Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Send appointment reminder
     */
    async sendAppointmentReminder(appointmentId, hoursBeforeAppointment) {
        try {
            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    patient: { include: { user: true } },
                    doctor: { include: { user: true } },
                    therapist: { include: { user: true } },
                },
            });

            if (!appointment) return;

            const patientName = appointment.patient.fullName || 'Patient';
            const doctorName = appointment.doctor.fullName || appointment.doctor.user.email;
            const appointmentDate = new Date(appointment.date).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            const title = `Appointment Reminder`;
            const message = `Hi ${patientName}, this is a reminder about your appointment with Dr. ${doctorName} on ${appointmentDate}.`;

            await this.create({
                userId: appointment.patient.userId,
                type: 'APPOINTMENT_REMINDER',
                title,
                message,
                data: { appointmentId, hoursBeforeAppointment },
                sendEmail: true,
                sendSMS: hoursBeforeAppointment === 1, // SMS only for 1-hour reminder
            });

            console.log(`[NotificationService] Sent ${hoursBeforeAppointment}h reminder for appointment ${appointmentId}`);
        } catch (error) {
            console.error('[NotificationService] Error sending appointment reminder:', error);
        }
    }

    /**
     * Send appointment confirmation
     */
    async sendAppointmentConfirmation(appointmentId) {
        try {
            const appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    patient: { include: { user: true } },
                    doctor: { include: { user: true } },
                },
            });

            if (!appointment) return;

            const patientName = appointment.patient.fullName || 'Patient';
            const doctorName = appointment.doctor.fullName || appointment.doctor.user.email;
            const appointmentDate = new Date(appointment.date).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            const title = `Appointment Confirmed`;
            const message = `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${appointmentDate} has been successfully booked.`;

            await this.create({
                userId: appointment.patient.userId,
                type: 'APPOINTMENT_CONFIRMED',
                title,
                message,
                data: { appointmentId },
                sendEmail: true,
                sendSMS: true,
            });

            console.log(`[NotificationService] Sent confirmation for appointment ${appointmentId}`);
        } catch (error) {
            console.error('[NotificationService] Error sending appointment confirmation:', error);
        }
    }

    /**
     * Send prescription update notification
     */
    async sendPrescriptionNotification(prescriptionId) {
        try {
            const prescription = await prisma.prescription.findUnique({
                where: { id: prescriptionId },
                include: {
                    patient: { include: { user: true } },
                    doctor: { include: { user: true } },
                    therapist: { include: { user: true } },
                },
            });

            if (!prescription) return;

            const prescriberName =
                prescription.doctor?.fullName ||
                prescription.therapist?.fullName ||
                'your healthcare provider';

            await this.create({
                userId: prescription.patient.userId,
                type: 'PRESCRIPTION_UPDATE',
                title: 'New Prescription Added',
                message: `A new prescription for ${prescription.medicationName} has been added by ${prescriberName}.`,
                data: { prescriptionId },
                sendEmail: true,
            });
        } catch (error) {
            console.error('[NotificationService] Error sending prescription notification:', error);
        }
    }

    /**
     * Send low stock alert to admins and pharmacists
     */
    async sendLowStockAlert(medicineName, currentStock) {
        try {
            // Find all admins and pharmacists
            const staff = await prisma.user.findMany({
                where: {
                    role: { in: ['ADMIN', 'PHARMACIST', 'ADMIN_DOCTOR'] },
                    deletedAt: null
                }
            });

            for (const user of staff) {
                await this.create({
                    userId: user.id,
                    type: 'SYSTEM_ALERT',
                    title: 'Low Stock Alert',
                    message: `Inventory Alert: ${medicineName} is running low on stock. Current quantity: ${currentStock}.`,
                    data: { medicineName, currentStock },
                    sendEmail: true
                });
            }
        } catch (error) {
            console.error('[NotificationService] Error sending low stock alert:', error);
        }
    }

    /**
     * Send low medication alert for a patient to Admins and the specific Doctor
     */
    async sendClientLowMedicationAlert({ patientId, patientName, medicineName, remainingQuantity, urgency }) {
        try {
            // Find all admins and admin doctors
            const admins = await prisma.user.findMany({
                where: {
                    role: { in: ['ADMIN', 'ADMIN_DOCTOR'] },
                    deletedAt: null
                }
            });

            // Find the assigned doctor for this patient
            const patient = await prisma.patient.findUnique({
                where: { id: patientId },
                include: {
                    appointments: {
                        orderBy: { date: 'desc' },
                        take: 1,
                        select: { doctor: { select: { userId: true } } }
                    }
                }
            });

            const doctorUserId = patient?.appointments[0]?.doctor?.userId;
            const recipients = new Set(admins.map(a => a.id));
            if (doctorUserId) recipients.add(doctorUserId);

            const title = `Low Medication Alert: ${urgency.toUpperCase()}`;
            const message = `Patient ${patientName} is running low on ${medicineName}. Remaining: ${remainingQuantity} doses. Please follow up for refill.`;

            for (const userId of recipients) {
                await this.create({
                    userId,
                    type: 'SYSTEM_ALERT',
                    title,
                    message,
                    data: { patientId, medicineName, remainingQuantity, urgency },
                    sendEmail: urgency === 'critical'
                });
            }
        } catch (error) {
            console.error('[NotificationService] Error sending client low med alert:', error);
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        return await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        return await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }

    /**
     * Get user notifications with pagination
     */
    async getUserNotifications(userId, { skip = 0, take = 20, unreadOnly = false }) {
        const where = { userId };
        if (unreadOnly) {
            where.isRead = false;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId, isRead: false } }),
        ]);

        return { notifications, total, unreadCount };
    }

    /**
     * Create default notification preferences for a user
     */
    async createDefaultPreferences(userId) {
        return await prisma.notificationPreference.create({
            data: { userId },
        });
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(userId, preferences) {
        return await prisma.notificationPreference.upsert({
            where: { userId },
            create: { userId, ...preferences },
            update: preferences,
        });
    }

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId) {
        return await prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });
    }

    /**
     * Get notification preferences
     */
    async getPreferences(userId) {
        let prefs = await prisma.notificationPreference.findUnique({
            where: { userId },
        });

        if (!prefs) {
            prefs = await this.createDefaultPreferences(userId);
        }

        return prefs;
    }
}

export const notificationService = new NotificationService();
