
import prisma from '../lib/prisma.js';


export class AvailabilityService {
    static async createBlock(data) {
        const { doctorId, therapistId, date, dayOfWeek, startTime, endTime, reason } = data;

        if (!doctorId && !therapistId) {
            throw new Error('Either doctorId or therapistId is required');
        }

        // Validate time format HH:mm
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            throw new Error('Invalid time format. Use HH:mm');
        }

        if (startTime >= endTime) {
            throw new Error('Start time must be before end time');
        }

        await this.validateBlockOverlap(data);

        // Check for conflicting appointments
        const clinicianFilter = {
            OR: [
                { doctorId: doctorId || undefined },
                { therapistId: therapistId || undefined }
            ]
        };

        const appointmentWhere = {
            ...clinicianFilter,
            status: { notIn: ['CANCELLED', 'REJECTED'] },
        };

        if (date) {
            const startOfDate = new Date(new Date(date).setHours(0, 0, 0, 0));
            const endOfDate = new Date(new Date(date).setHours(23, 59, 59, 999));
            appointmentWhere.date = { gte: startOfDate, lte: endOfDate };
        } else if (dayOfWeek !== undefined) {
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
            const aptEnd = new Date(apt.date.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);

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

    static async updateBlock(id, data) {
        const { startTime, endTime, date, dayOfWeek, reason } = data;

        const existing = await prisma.blockedSlot.findUnique({ where: { id } });
        if (!existing) throw new Error('Block not found');

        // Merge existing and new data for validation
        const validationData = {
            ...existing,
            ...data,
            excludeId: id
        };

        // Re-validate time if provided
        if (startTime || endTime) {
            const s = startTime || existing.startTime;
            const e = endTime || existing.endTime;
            if (s >= e) throw new Error('Start time must be before end time');
        }

        await this.validateBlockOverlap(validationData);

        return prisma.blockedSlot.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek) : undefined,
                startTime: data.startTime,
                endTime: data.endTime,
                reason: data.reason
            }
        });
    }

    static async validateBlockOverlap(data) {
        const { doctorId, therapistId, date, dayOfWeek, startTime, endTime, excludeId } = data;

        const clinicianFilter = {
            OR: [
                { doctorId: doctorId || undefined },
                { therapistId: therapistId || undefined }
            ]
        };

        // Fetch potential overlaps
        // We fetch candidates and filter in JS to ensure absolute precision between specific dates and recurring days
        const candidates = await prisma.blockedSlot.findMany({
            where: {
                ...clinicianFilter,
                id: { not: excludeId }
            }
        });

        const newDateObj = date ? new Date(date) : null;
        const newDay = dayOfWeek !== undefined ? parseInt(dayOfWeek) : (newDateObj ? newDateObj.getDay() : null);

        for (const block of candidates) {
            let matchesDay = false;

            if (date && block.date) {
                // Both specific dates - must be same day
                matchesDay = new Date(date).toISOString().split('T')[0] === new Date(block.date).toISOString().split('T')[0];
            } else if (dayOfWeek !== undefined && block.dayOfWeek !== null) {
                // Both recurring - must be same day of week
                matchesDay = parseInt(dayOfWeek) === block.dayOfWeek;
            } else if (date && block.dayOfWeek !== null) {
                // New is specific, existing is recurring
                matchesDay = new Date(date).getDay() === block.dayOfWeek;
            } else if (dayOfWeek !== undefined && block.date) {
                // New is recurring, existing is specific
                matchesDay = new Date(block.date).getDay() === parseInt(dayOfWeek);
            }

            if (matchesDay) {
                // Overlap if (newStart < existingEnd) AND (newEnd > existingStart)
                if (startTime < block.endTime && endTime > block.startTime) {
                    console.log(`[Availability Conflict] User: ${doctorId || therapistId} | Input: ${startTime}-${endTime} | Conflict: ${block.startTime}-${block.endTime} (${block.reason || 'No reason'})`);
                    throw new Error(`Time slot overlaps with an existing blocked slot (${block.reason || 'Leave/Blocked'})`);
                }
            }
        }
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
        const dateStrOnly = new Date(dateString).toISOString().split('T')[0];
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
                                date: {
                                    gte: new Date(dateStrOnly + 'T00:00:00.000Z'),
                                    lte: new Date(dateStrOnly + 'T23:59:59.999Z')
                                }
                            },
                            {
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

        const slots = [];
        for (let hour = workingStart; hour < workingEnd; hour++) {
            const slotStart = `${hour.toString().padStart(2, '0')}:00`;
            const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
            const slotLabel = `${slotStart} - ${slotEnd}`;

            // Check if blocked by leave
            const block = blocks.find(b => slotStart < b.endTime && slotEnd > b.startTime);
            if (block) {
                slots.push({
                    slot: slotLabel,
                    status: 'BLOCKED',
                    reason: block.reason || 'Doctor unavailable (Leave)'
                });
                continue;
            }

            // Check if booked by appointment
            const appointment = appointments.find(a => {
                const start = a.date.toTimeString().slice(0, 5);
                const end = new Date(a.date.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);
                return slotStart < end && slotEnd > start;
            });

            if (appointment) {
                slots.push({
                    slot: slotLabel,
                    status: 'BOOKED',
                    reason: 'Slot already reserved'
                });
                continue;
            }

            slots.push({
                slot: slotLabel,
                status: 'AVAILABLE'
            });
        }

        return slots;
    }
}
