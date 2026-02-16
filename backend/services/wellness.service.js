import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WellnessService {
    static async getStats(userId) {
        const patient = await prisma.patient.findUnique({
            where: { userId },
            include: {
                dailyCheckIns: { orderBy: { createdAt: 'desc' }, take: 7 }
            }
        });
        if (!patient) throw new Error('Patient profile not found');

        const level = patient.zenPoints >= 1000 ? 'Zen Master' : patient.zenPoints >= 500 ? 'Peaceful Soul' : 'Mindful Beginner';

        return {
            zenPoints: patient.zenPoints,
            dailyCheckIns: patient.dailyCheckIns,
            level
        };
    }

    static async submitCheckIn(userId, data) {
        const patient = await prisma.patient.findUnique({ where: { userId } });
        if (!patient) throw new Error('Patient profile not found. Please complete onboarding.');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingCheckIn = await prisma.dailyCheckIn.findFirst({
            where: { patientId: patient.id, createdAt: { gte: today } }
        });
        if (existingCheckIn) throw new Error('You have already checked in today.');

        return prisma.$transaction(async (tx) => {
            const checkIn = await tx.dailyCheckIn.create({
                data: { ...data, patientId: patient.id }
            });
            await tx.patient.update({
                where: { id: patient.id },
                data: { zenPoints: { increment: 10 } }
            });
            return checkIn;
        });
    }

    static async getVideos() {
        return prisma.exerciseVideo.findMany();
    }

    static async getMyPrescriptions(userId) {
        const patient = await prisma.patient.findUnique({ where: { userId } });
        if (!patient) throw new Error('Patient not found');
        return prisma.videoPrescription.findMany({
            where: { patientId: patient.id },
            include: { video: true, doctor: true, therapist: true }
        });
    }

    static async prescribeVideo(userId, data) {
        const { patientId, videoId, notes } = data;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { doctor: true, therapist: true }
        });

        const prescriber = {};
        if (user.doctor) prescriber.doctorId = user.doctor.id;
        else if (user.therapist) prescriber.therapistId = user.therapist.id;

        return prisma.videoPrescription.create({
            data: { patientId, videoId, notes, ...prescriber }
        });
    }
}
