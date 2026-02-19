
import prisma from '../lib/prisma.js';


export class AvailabilityService {
    static async createBlock(data) {
        const { doctorId, therapistId, date, dayOfWeek, startTime, endTime, reason } = data;

        if (!doctorId && !therapistId) {
            throw new Error('Either doctorId or therapistId is required');
        }

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

        // Overlap Validation
        // We need to look for existing blocks that overlap with the requested time.
        // A block overlaps if:
        // 1. It belongs to the same clinician
        // 2. The day/date matches:
        //    a. If we provide a specific date, it overlaps with:
        //       - Same date specific blocks
        //       - Same day-of-week recurring blocks
        //    b. If we provide a recurring day, it overlaps with:
        //       - Same day-of-week recurring blocks
        //       - Any specific date blocks that fall on that day-of-week

        const clinicianFilter = {
            OR: [
                { doctorId: doctorId || undefined },
                { therapistId: therapistId || undefined }
            ]
        };

        const existingBlocks = await prisma.blockedSlot.findMany({
            where: {
                ...clinicianFilter,
                OR: [
                    // Same specific date
                    { date: date ? new Date(date) : null },
                    // Same day of week (recurring)
                    { dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek) : null },
                    // If we are adding a recurring day, check for specific dates that match that day
                    ...(dayOfWeek !== undefined ? [{
                        date: { not: null },
                        // Unfortunately Prisma can't easily filter by dayOfWeek on a DateTime field in a generic across-DB way here without raw SQL or JS filtering
                    }] : []),
                    // If we are adding a specific date, check for recurring blocks on that day of week
                    ...(date ? [{
                        dayOfWeek: new Date(date).getDay(),
                        date: null
                    }] : [])
                ]
            }
        });

        for (const block of existingBlocks) {
            // Additional JS check for recurring vs specific date on the same day if adding a recurring block
            if (dayOfWeek !== undefined && block.date) {
                if (new Date(block.date).getDay() !== parseInt(dayOfWeek)) continue;
            }

            // Overlap if (A < D) and (B > C)
            if (startTime < block.endTime && endTime > block.startTime) {
                throw new Error(`This time slot overlaps with an existing blocked slot (${block.reason || 'No reason'})`);
            }
        }

        // Check for conflicting appointments
        const appointmentWhere = {
            ...clinicianFilter,
            status: { notIn: ['CANCELLED', 'REJECTED'] },
        };

        if (date) {
            const startOfDate = new Date(new Date(date).setHours(0, 0, 0, 0));
            const endOfDate = new Date(new Date(date).setHours(23, 59, 59, 999));
            appointmentWhere.date = { gte: startOfDate, lte: endOfDate };
        } else if (dayOfWeek !== undefined) {
            // For recurring blocks, we just check future appointments on that day of week
            // Note: This is a bit complex for a simple query, we'll check the next 3 months of appointments
            const futureDate = new Date();
            const threeMonthsLater = new Date();
            threeMonthsLater.setMonth(futureDate.getMonth() + 3);
            appointmentWhere.date = { gte: futureDate, lte: threeMonthsLater };
        }

        const conflictingAppointments = await prisma.appointment.findMany({
            where: appointmentWhere,
            include: { patient: true }
        });

        for (const apt of conflictingAppointments) {
            const aptStart = apt.date.toTimeString().slice(0, 5);
            const aptEnd = new Date(apt.date.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5); // Assuming 1hr

            // If recurring, check if the appointment falls on the requested dayOfWeek
            if (dayOfWeek !== undefined && apt.date.getDay() !== parseInt(dayOfWeek)) continue;

            if (startTime < aptEnd && endTime > aptStart) {
                throw new Error(`Conflict: ${apt.patient.fullName} has an appointment scheduled during this time on ${apt.date.toLocaleDateString()}`);
            }
        }

        return prisma.blockedSlot.create({
            data: {
                doctorId: doctorId || null,
                therapistId: therapistId || null,
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

    static async getBlocks(clinicianId) {
        return prisma.blockedSlot.findMany({
            where: {
                OR: [
                    { doctorId: clinicianId },
                    { therapistId: clinicianId }
                ]
            },
            orderBy: [
                { date: 'asc' },
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
    }

    static async checkAvailability(clinicianId, dateString, startTime, endTime) {
        const appointmentDate = new Date(dateString);
        const dayOfWeek = appointmentDate.getDay(); // 0-6 Sunday-Saturday

        // Get all blocks for this doctor/therapist that match either the date OR the day of week
        const blocks = await prisma.blockedSlot.findMany({
            where: {
                OR: [
                    { doctorId: clinicianId },
                    { therapistId: clinicianId }
                ],
                AND: [
                    {
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
                                date: null
                            }
                        ]
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

    static async getAvailableSlots(clinicianId, date) {
        const checkDate = new Date(date);
        const dayOfWeek = checkDate.getDay();
        const dateString = checkDate.toISOString().split('T')[0];

        // 1. Define working hours (e.g., 09:00 to 18:00)
        const workingStart = 9; // 9 AM
        const workingEnd = 18;  // 6 PM

        // 2. Fetch all blocks and appointments for the day
        const [blocks, appointments] = await Promise.all([
            prisma.blockedSlot.findMany({
                where: {
                    OR: [{ doctorId: clinicianId }, { therapistId: clinicianId }],
                    OR: [
                        { date: { gte: new Date(dateString), lt: new Date(new Date(dateString).getTime() + 24 * 60 * 60 * 1000) } },
                        { dayOfWeek: dayOfWeek, date: null }
                    ]
                }
            }),
            prisma.appointment.findMany({
                where: {
                    OR: [{ doctorId: clinicianId }, { therapistId: clinicianId }],
                    date: { gte: new Date(dateString), lt: new Date(new Date(dateString).getTime() + 24 * 60 * 60 * 1000) },
                    status: { notIn: ['CANCELLED', 'REJECTED'] }
                }
            })
        ]);

        const busySlots = [
            ...blocks.map(b => ({ start: b.startTime, end: b.endTime })),
            ...appointments.map(a => {
                const start = a.date.toTimeString().slice(0, 5);
                const end = new Date(a.date.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
                return { start, end };
            })
        ];

        // 3. Generate candidate hours and filter them
        const availableSlots = [];
        for (let hour = workingStart; hour < workingEnd; hour++) {
            const slotStart = `${hour.toString().padStart(2, '0')}:00`;
            const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;

            const isOverlap = busySlots.some(busy => {
                // Overlap if (slotStart < busy.end) and (slotEnd > busy.start)
                return slotStart < busy.end && slotEnd > busy.start;
            });

            if (!isOverlap) {
                availableSlots.push(`${slotStart} - ${slotEnd}`);
            }
        }

        return availableSlots;
    }
}
