import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const users = await prisma.user.findMany({
            include: { doctor: true, therapist: true, patient: true }
        });
        console.log(`Auditing ${users.length} users...`);

        for (const user of users) {
            if (user.role === 'DOCTOR' || user.role === 'ADMIN_DOCTOR') {
                if (!user.doctor) {
                    console.log(`Creating missing doctor profile for ${user.email}`);
                    await prisma.doctor.create({ data: { userId: user.id, fullName: user.email.split('@')[0] } });
                }
            } else if (user.role === 'THERAPIST') {
                if (!user.therapist) {
                    console.log(`Creating missing therapist profile for ${user.email}`);
                    await prisma.therapist.create({ data: { userId: user.id, fullName: user.email.split('@')[0] } });
                }
            } else if (user.role === 'PATIENT') {
                if (!user.patient) {
                    console.log(`Creating missing patient profile for ${user.email}`);
                    await prisma.patient.create({ data: { userId: user.id, fullName: user.email.split('@')[0] } });
                }
            }
        }
        console.log('Audit and fix completed.');
    } catch (error) {
        console.error('Error during database fix:', error);
    } finally {
        await prisma.$disconnect();
    }
}
main();
