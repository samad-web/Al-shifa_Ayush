import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const userCount = await prisma.user.count();
        console.log('Database connection successful!');
        console.log('User count:', userCount);
    } catch (error) {
        console.error('Database connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}
main();
