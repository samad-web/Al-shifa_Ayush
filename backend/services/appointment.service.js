import prisma from '../lib/prisma.js';
import { notificationService } from './notification.service.js';
import { AvailabilityService } from './availability.service.js';

const includeDetails = {
    doctor: { include: { user: { select: { email: true } } } },
    therapist: { include: { user: { select: { email: true } } } },
    patient: { include: { user: { select: { email: true } } } },
};

export class AppointmentService {
    static async getAppointments({ id, role }) {
        let where = {};

        if (role === 'PATIENT') {
            const patientRecord = await prisma.patient.findUnique({
                where: { userId: id },
                select: { id: true },
            });
            if (!patientRecord) throw new Error('Patient profile not found');
            where = { patientId: patientRecord.id };
        } else if (role === 'DOCTOR' || role === 'ADMIN_DOCTOR') {
            const doctorRecord = await prisma.doctor.findUnique({
                where: { userId: id },
                select: { id: true },
            });
            if (!doctorRecord) throw new Error('Doctor profile not found');
            where = { doctorId: doctorRecord.id };
        } else if (role === 'THERAPIST') {
            const therapistRecord = await prisma.therapist.findUnique({
                where: { userId: id },
                select: { id: true },
            });
            if (!therapistRecord) throw new Error('Therapist profile not found');
            where = { therapistId: therapistRecord.id };
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (user?.branchId && role !== 'ADMIN_DOCTOR') {
            where.branchId = user.branchId;
        }

        return prisma.appointment.findMany({
            where,
            include: includeDetails,
            orderBy: { date: 'desc' }
        });
    }

    static async createAppointment(user, data) {
        const { patientId, doctorId, therapistId, date, status, notes, triageSessionId, contactDetails, consultationType, consultationMode } = data;

        let actualPatientId;
        if (user.role === 'PATIENT') {
            const patientRecord = await prisma.patient.findUnique({
                where: { userId: user.id },
                select: { id: true },
            });
            if (!patientRecord) throw new Error('Patient profile not found');
            actualPatientId = patientRecord.id;
        } else {
            if (!patientId) throw new Error('patientId is required');
            actualPatientId = patientId;
        }

        const appointmentDate = new Date(date);

        // Dynamic Validation based on Consultation Type
        if (consultationType === 'DOCTOR' && !doctorId) throw new Error('Doctor selection is required for Doctor consultation');
        if (consultationType === 'THERAPIST' && !therapistId) throw new Error('Therapist selection is required for Therapist consultation');
        if (consultationType === 'COMBINED' && (!doctorId || !therapistId)) throw new Error('Both Doctor and Therapist are required for Combined consultation');

        // 1. Doctor Availability Check
        if (doctorId && (consultationType === 'DOCTOR' || consultationType === 'COMBINED')) {
            const startTimeStr = appointmentDate.toTimeString().slice(0, 5);
            const appointmentEndTime = new Date(appointmentDate.getTime() + 60 * 60 * 1000); // 1 hr duration
            const endTimeStr = appointmentEndTime.toTimeString().slice(0, 5);

            const docAvailability = await AvailabilityService.checkAvailability(
                doctorId, appointmentDate.toISOString(), startTimeStr, endTimeStr
            );
            if (!docAvailability.available) throw new Error(`Doctor unavailable: ${docAvailability.reason}`);

            // Double booking check for doctor
            const docBusy = await prisma.appointment.findFirst({
                where: { doctorId, date: appointmentDate, status: { notIn: ['CANCELLED'] } }
            });
            if (docBusy) throw new Error('The selected doctor is already booked at this time.');
        }

        const actualTherapistDate = data.therapistDate ? new Date(data.therapistDate) : appointmentDate;

        // 2. Therapist Availability Check (Using separate therapistDate if provided)
        if (therapistId && (consultationType === 'THERAPIST' || consultationType === 'COMBINED')) {
            const tStartTimeStr = actualTherapistDate.toTimeString().slice(0, 5);
            const tEndTime = new Date(actualTherapistDate.getTime() + 60 * 60 * 1000); // 1 hr duration
            const tEndTimeStr = tEndTime.toTimeString().slice(0, 5);

            const therapistAvailability = await AvailabilityService.checkAvailability(
                therapistId, actualTherapistDate.toISOString(), tStartTimeStr, tEndTimeStr
            );
            if (!therapistAvailability.available) throw new Error(`Therapist unavailable: ${therapistAvailability.reason}`);

            // Double booking check for therapist
            const therapistBusy = await prisma.appointment.findFirst({
                where: {
                    therapistId,
                    OR: [
                        { date: actualTherapistDate },
                        { therapistDate: actualTherapistDate }
                    ],
                    status: { notIn: ['CANCELLED'] }
                }
            });
            if (therapistBusy) throw new Error('The selected therapist is already booked at this time.');
        }

        // Triage Validation for Admin Doctor
        if (doctorId) {
            const targetDoctor = await prisma.doctor.findUnique({
                where: { id: doctorId },
                include: { user: true }
            });

            if (targetDoctor?.user?.role === 'ADMIN_DOCTOR') {
                if (!triageSessionId) throw new Error('Triage assessment is required for Admin Doctor');
                const triage = await prisma.triageSession.findUnique({ where: { id: triageSessionId } });
                if (!triage || (triage.severity !== 'HIGH' && triage.severity !== 'EMERGENCY' && !triage.isEscalated)) {
                    throw new Error('Case does not qualify for Admin Doctor');
                }
            }
        }

        if (contactDetails) {
            await prisma.patient.update({
                where: { id: actualPatientId },
                data: {
                    fullName: contactDetails.fullName,
                    phoneNumber: contactDetails.phoneNumber.replace(/[\s\-]/g, ''),
                },
            });

            const patient = await prisma.patient.findUnique({ where: { id: actualPatientId }, include: { user: true } });
            if (patient?.user && patient.user.email !== contactDetails.email) {
                await prisma.user.update({ where: { id: patient.userId }, data: { email: contactDetails.email } });
            }
        }

        // Online meeting generation (placeholder logic)
        let meetingLink = null;
        if (consultationMode === 'ONLINE') {
            meetingLink = `https://meet.jit.si/al-shifa-${Math.random().toString(36).substring(7)}`;
        }

        const appointment = await prisma.appointment.create({
            data: {
                patientId: actualPatientId,
                doctorId: (consultationType === 'THERAPIST' || !doctorId) ? null : doctorId,
                therapistId: (consultationType === 'DOCTOR' || !therapistId) ? null : therapistId,
                date: appointmentDate,
                therapistDate: (consultationType === 'COMBINED' || consultationType === 'THERAPIST') ? actualTherapistDate : null,
                status: user.role === 'PATIENT' ? 'PENDING' : (status || 'CONFIRMED'),
                notes,
                triageSessionId: triageSessionId || null,
                consultationType: consultationType || 'DOCTOR',
                consultationMode: consultationMode || 'OFFLINE',
                meetingLink,
                branchId: user.branchId || (await prisma.patient.findUnique({ where: { id: actualPatientId } }))?.branchId
            },
            include: includeDetails
        });

        // notification trigger removed from here as per Doctor-Approval workflow

        return appointment;
    }

    static async updateAppointment(id, user, data) {
        const existing = await prisma.appointment.findUnique({ where: { id } });
        if (!existing) throw new Error('Appointment not found');

        const updateData = {
            ...(data.date && { date: new Date(data.date) }),
            ...(data.therapistDate && { therapistDate: new Date(data.therapistDate) }),
            ...(data.status && { status: data.status }),
            ...(data.notes !== undefined && { notes: data.notes }),
        };

        const appointment = await prisma.appointment.update({
            where: { id },
            data: updateData,
            include: includeDetails
        });

        if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
            await prisma.patient.update({
                where: { id: appointment.patientId },
                data: { zenPoints: { increment: 100 } }
            });
        }

        return appointment;
    }

    static async approveAppointment(id, user) {
        const existing = await prisma.appointment.findUnique({ where: { id } });
        if (!existing) throw new Error('Appointment not found');

        const isDoctor = ['DOCTOR', 'ADMIN_DOCTOR'].includes(user.role);
        const isTherapist = user.role === 'THERAPIST';

        if (!isDoctor && !isTherapist) {
            throw new Error('Unauthorized: Only Doctors or Therapists can approve appointments');
        }

        // Determine flags to update
        const updateData = {};
        if (isDoctor) updateData.doctorApproved = true;
        if (isTherapist) updateData.therapistApproved = true;

        // Fetch updated flags (merging with existing)
        const docApp = updateData.doctorApproved || existing.doctorApproved;
        const therApp = updateData.therapistApproved || existing.therapistApproved;

        // Calculate final status based on consultation type
        let newStatus = existing.status;
        const type = existing.consultationType;

        if (type === 'DOCTOR') {
            if (docApp) newStatus = 'ACCEPTED';
        } else if (type === 'THERAPIST') {
            if (therApp) newStatus = 'ACCEPTED';
        } else if (type === 'COMBINED') {
            if (docApp && therApp) {
                newStatus = 'ACCEPTED';
            } else if (docApp) {
                newStatus = 'PENDING_THERAPIST_APPROVAL';
            } else if (therApp) {
                newStatus = 'PENDING_DOCTOR_APPROVAL';
            }
        }

        updateData.status = newStatus;

        const updated = await prisma.appointment.update({
            where: { id },
            data: updateData,
            include: includeDetails
        });

        // Trigger notification only after DUAL confirmation (Doctor AND Therapist)
        const isDualApproved = updated.doctorApproved && updated.therapistApproved;
        const wasDualApproved = existing.doctorApproved && existing.therapistApproved;

        if (isDualApproved && !wasDualApproved) {
            console.log(`[AppointmentService] DUAL CONFIRMATION detected for ${id}. Triggering notification.`);
            try {
                // Pass 'PATIENT' role to bypass the NotificationService recipient validation
                await notificationService.sendAppointmentConfirmation(updated, 'PATIENT');
            } catch (notifyError) {
                console.error('[AppointmentService] Failed to send confirmation notification:', notifyError.message);
            }
        } else if ((updated.doctorApproved || updated.therapistApproved) && !isDualApproved) {
            console.log(`[AppointmentService] Pending Dual Confirmation for ${id} (Doc: ${updated.doctorApproved}, Ther: ${updated.therapistApproved})`);
        }

        return updated;
    }

    static async cancelAppointment(id) {
        return prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
    }

    static async getAvailableStaff(user) {
        const where = {};
        if (user.branchId && user.role !== 'ADMIN_DOCTOR') {
            where.user = { branchId: user.branchId };
        }

        const [doctors, therapists] = await Promise.all([
            prisma.doctor.findMany({
                where,
                include: { user: { select: { email: true, role: true, branchId: true } } },
                orderBy: { fullName: 'asc' }
            }),
            prisma.therapist.findMany({
                where,
                include: { user: { select: { email: true, role: true, branchId: true } } },
                orderBy: { fullName: 'asc' }
            })
        ]);
        return { doctors, therapists };
    }
}
