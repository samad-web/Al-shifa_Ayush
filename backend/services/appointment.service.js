import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        return prisma.appointment.findMany({
            where,
            include: includeDetails,
            orderBy: { date: 'desc' }
        });
    }

    static async createAppointment(user, data) {
        const { patientId, doctorId, therapistId, date, status, notes, triageSessionId, contactDetails } = data;

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

        // Triage Validation
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

        return prisma.appointment.create({
            data: {
                patientId: actualPatientId,
                doctorId,
                therapistId,
                date: new Date(date),
                status: user.role === 'PATIENT' ? 'PENDING' : (status || 'CONFIRMED'),
                notes,
                triageSessionId
            },
            include: includeDetails
        });
    }

    static async updateAppointment(id, user, data) {
        const existing = await prisma.appointment.findUnique({ where: { id } });
        if (!existing) throw new Error('Appointment not found');

        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                ...(data.date && { date: new Date(data.date) }),
                ...(data.status && { status: data.status }),
                ...(data.notes !== undefined && { notes: data.notes }),
            },
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

    static async cancelAppointment(id) {
        return prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
    }

    static async getAvailableStaff() {
        const [doctors, therapists] = await Promise.all([
            prisma.doctor.findMany({ include: { user: { select: { email: true, role: true } } }, orderBy: { fullName: 'asc' } }),
            prisma.therapist.findMany({ include: { user: { select: { email: true, role: true } } }, orderBy: { fullName: 'asc' } })
        ]);
        return { doctors, therapists };
    }
}
