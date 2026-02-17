
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AvailabilityService {
    static async createBlock(data) {
        const { doctorId, date, dayOfWeek, startTime, endTime, reason } = data;

        if (!date && dayOfWeek === undefined) {
            throw new Error('Either specific date or day of week is required');
        }

        // Validate time format HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            throw new Error('Invalid time format. Use HH:mm');
        }

        if (startTime >= endTime) {
            throw new Error('Start time must be before end time');
        }

        return prisma.blockedSlot.create({
            data: {
                doctorId,
                date: date ? new Date(date) : null,
                dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek) : null,
                startTime,
                endTime,
                reason
            }
        });
    }

    static async deleteBlock(id) {
        return prisma.blockedSlot.delete({ where: { id } });
    }

    static async getBlocks(doctorId) {
        return prisma.blockedSlot.findMany({
            where: { doctorId },
            orderBy: [
                { date: 'asc' },
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
    }

    static async checkAvailability(doctorId, dateString, startTime, endTime) {
        const appointmentDate = new Date(dateString);
        const dayOfWeek = appointmentDate.getDay(); // 0-6 Sunday-Saturday

        // Check specific date blocks
        // We need to compare dates without time components for the database query usually, 
        // but prisma DateTime filters can be tricky.
        // Best to fetch potential blocks and filter in JS or use stringent range queries.

        // Get all blocks for this doctor that match either the date OR the day of week
        // Note: Logic needs to determine if *any* block overlaps with the requested time.

        // 1. Fetch relevant blocks
        const blocks = await prisma.blockedSlot.findMany({
            where: {
                doctorId,
                OR: [
                    {
                        // Specific date match
                        date: {
                            gte: new Date(new Date(dateString).setHours(0, 0, 0, 0)),
                            lt: new Date(new Date(dateString).setHours(24, 0, 0, 0))
                        }
                    },
                    {
                        // Recurring day match
                        dayOfWeek: dayOfWeek,
                        date: null // Recurring usually implies no specific date, but sometimes overrides? 
                        // Let's assume dayOfWeek is enough. 
                        // If we have both, it might be complex. Let's assume recurring applies generally.
                    }
                ]
            }
        });

        // 2. Check for time overlap
        // Request: Start A, End B
        // Block: Start C, End D
        // Overlap if (A < D) and (B > C)

        for (const block of blocks) {
            // Check time overlap
            if (startTime < block.endTime && endTime > block.startTime) {
                return {
                    available: false,
                    reason: block.reason || 'Doctor unavailable'
                };
            }
        }

        return { available: true };
    }
}
