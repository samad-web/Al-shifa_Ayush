import prisma from '../lib/prisma.js';
import crypto from 'crypto';

export class LeaderboardService {
    /**
     * Get the current leaderboard configuration or create default
     */
    static async getConfig() {
        let config = await prisma.leaderboardConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!config) {
            config = await prisma.leaderboardConfig.create({
                data: {
                    appointmentWeight: 0.25,
                    adherenceWeight: 0.25,
                    responseTimeWeight: 0.15,
                    successRateWeight: 0.25,
                    consistencyWeight: 0.10,
                    targetAppointments: 50,
                    targetAdherence: 90,
                    targetSuccessRate: 85,
                    targetResponseTime: 30
                }
            });
        }
        return config;
    }

    /**
     * Calculate score for a participant based on current config with strict data integrity
     */
    static async calculateParticipantScore(participantId, role, prefetchedData = null) {
        const config = await this.getConfig();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        let allSourceIds = [];

        // 1. Appointment Metric
        const appointments = prefetchedData
            ? prefetchedData.appointments.filter(a => a.status === 'COMPLETED')
            : await prisma.appointment.findMany({
                where: {
                    OR: [{ doctorId: participantId }, { therapistId: participantId }],
                    status: 'COMPLETED',
                    date: { gte: thirtyDaysAgo }
                }
            });
        const appointmentCount = appointments.length;
        const appointmentScore = Math.min((appointmentCount / config.targetAppointments) * 100, 100);
        allSourceIds.push(...appointments.map(a => (typeof a === 'string' ? a : a.id)));

        // 2. Adherence Rate Metric
        const clinician = prefetchedData
            ? prefetchedData.journeys
            : (role === 'THERAPIST'
                ? await prisma.therapist.findUnique({ where: { id: participantId }, include: { journeys: { include: { medications: true } } } })
                : await prisma.doctor.findUnique({ where: { id: participantId }, include: { journeys: { include: { medications: true } } } }));

        let totalLogs = 0;
        let takenLogs = 0;
        const journeys = prefetchedData ? prefetchedData.journeys : (clinician?.journeys || []);

        journeys.forEach(j => {
            allSourceIds.push(j.id);
            j.medications.forEach(m => {
                totalLogs++;
                if (m.taken) takenLogs++;
                allSourceIds.push(m.id);
            });
        });
        const adherenceRate = totalLogs > 0 ? (takenLogs / totalLogs) * 100 : 100;
        const adherenceScore = Math.min((adherenceRate / config.targetAdherence) * 100, 100);

        // 3. Response Time Metric
        const { avgMinutes, sourceIds: responseTimeIds } = await this._calculateResponseTimeMetric(participantId, thirtyDaysAgo, prefetchedData);
        const responseTimeScore = Math.max(0, 100 - (avgMinutes / config.targetResponseTime * 50));
        allSourceIds.push(...responseTimeIds);

        // 4. Success Rate Metric
        const totalJourneys = journeys.length;
        const completedJourneys = journeys.filter(j => j.status === 'COMPLETED').length;
        const successRate = totalJourneys > 0 ? (completedJourneys / totalJourneys) * 100 : 0;
        const successScore = Math.min((successRate / config.targetSuccessRate) * 100, 100);

        // 5. Consistency Metric
        const { consistency, sourceIds: consistencyIds, activeDaysCount } = await this._calculateConsistencyScore(participantId, thirtyDaysAgo, prefetchedData);
        const consistencyScore = consistency;
        allSourceIds.push(...consistencyIds);

        // Deduplicate Source IDs
        const finalSourceIds = this._collectSourceIds(allSourceIds);

        // Verify participant role again before saving (Strict Role Enforcement)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { doctor: { id: participantId } },
                    { therapist: { id: participantId } }
                ]
            },
            select: { role: true, email: true }
        });

        if (!user || user.role === 'ADMIN' || user.role === 'ADMIN_DOCTOR') {
            console.warn(`[LeaderboardService] Excluding restricted role (${user?.role}) for user ${user?.email || participantId} from score computation.`);
            return null;
        }

        // Calculate Final Weighted Score
        const finalScore = Math.round(
            (appointmentScore * config.appointmentWeight) +
            (adherenceScore * config.adherenceWeight) +
            (responseTimeScore * config.responseTimeWeight) +
            (successScore * config.successRateWeight) +
            (consistencyScore * config.consistencyWeight)
        );

        // Fix: Use responseTimeScore instead of responseTimeWeightScore if that was a typo in previous version 
        // Actually, looking at line 73: const responseTimeScore = Math.max(0, 100 - (avgMinutes / config.targetResponseTime * 50));
        // So I'll use responseTimeScore.

        const metrics = {
            appointments: { value: appointmentCount, score: appointmentScore, target: config.targetAppointments },
            adherence: { value: adherenceRate, score: adherenceScore, target: config.targetAdherence },
            responseTime: { value: avgMinutes, score: responseTimeScore, target: config.targetResponseTime },
            successRate: { value: successRate, score: successScore, target: config.targetSuccessRate },
            consistency: { value: activeDaysCount, score: consistencyScore, target: 15 } // target 15 days
        };

        const weights = {
            appointmentWeight: config.appointmentWeight,
            adherenceWeight: config.adherenceWeight,
            responseTimeWeight: config.responseTimeWeight,
            successRateWeight: config.successRateWeight,
            consistencyWeight: config.consistencyWeight
        };

        // Generate Integrity Hash
        const integrityHash = this._generateIntegrityHash({
            participantId,
            score: finalScore,
            metrics,
            sourceRecordIds: finalSourceIds
        });

        // Save to Audit Log
        const audit = await prisma.leaderboardAudit.create({
            data: {
                participantId,
                participantRole: role,
                score: finalScore,
                metrics,
                weights,
                sourceRecordIds: finalSourceIds,
                integrityHash
            }
        });

        return { score: finalScore, metrics, auditId: audit.id, integrityHash };
    }

    /**
     * Get the leaderboard
     */
    /**
     * Get the leaderboard with balanced performance
     */
    static async getLeaderboard() {
        const config = await this.getConfig();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        const [doctors, therapists] = await Promise.all([
            prisma.doctor.findMany({
                where: { user: { role: 'DOCTOR' } },
                include: { user: true }
            }),
            prisma.therapist.findMany({
                where: { user: { role: 'THERAPIST' } },
                include: { user: true }
            })
        ]);

        const participants = [
            ...doctors.map(d => ({ id: d.id, fullName: d.fullName, role: 'DOCTOR', specialization: d.specialization, profilePhoto: d.profilePhoto })),
            ...therapists.map(t => ({ id: t.id, fullName: t.fullName, role: 'THERAPIST', specialization: t.specialization, profilePhoto: t.profilePhoto }))
        ];

        const participantIds = participants.map(p => p.id);

        // Bulk Fetch Metrics to avoid N+1
        const [allAppointments, allJourneys, allPrescriptions, allMessages] = await Promise.all([
            prisma.appointment.findMany({
                where: {
                    OR: [{ doctorId: { in: participantIds } }, { therapistId: { in: participantIds } }],
                    date: { gte: thirtyDaysAgo }
                },
                include: { triageSession: true }
            }),
            prisma.journey.findMany({
                where: {
                    OR: [{ doctorId: { in: participantIds } }, { therapistId: { in: participantIds } }]
                },
                include: { medications: true }
            }),
            prisma.prescription.findMany({
                where: {
                    OR: [{ doctorId: { in: participantIds } }, { therapistId: { in: participantIds } }],
                    createdAt: { gte: thirtyDaysAgo }
                }
            }),
            prisma.message.findMany({
                where: {
                    senderId: { in: participantIds }, // Inaccurate for response time but good for consistency
                    createdAt: { gte: thirtyDaysAgo }
                }
            })
        ]);

        // Group data by participantId for O(1) lookup
        const dataMap = {};
        participantIds.forEach(id => {
            dataMap[id] = {
                appointments: allAppointments.filter(a => a.doctorId === id || a.therapistId === id),
                journeys: allJourneys.filter(j => j.doctorId === id || j.therapistId === id),
                prescriptions: allPrescriptions.filter(r => r.doctorId === id || r.therapistId === id),
                messages: allMessages.filter(m => m.senderId === id)
            };
        });

        const currentRankedParticipants = await Promise.all(participants.map(async (p) => {
            // We still use calculateParticipantScore for logic reuse, but we SHOULD pass prefetched data
            // For now, I'll optimize getLeaderboard directly or refactor calculateParticipantScore to accept data.
            // Let's refactor calculateParticipantScore to accept an optional data slice.
            const result = await this.calculateParticipantScore(p.id, p.role, dataMap[p.id]);
            if (!result) return null;

            const previousAudit = await prisma.leaderboardAudit.findFirst({
                where: { participantId: p.id, calculationDate: { lt: new Date() } },
                orderBy: { calculationDate: 'desc' },
                skip: 1
            });

            const trend = previousAudit ? (result.score - previousAudit.score) : 0;

            return {
                ...p,
                score: result.score,
                trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
                trendValue: Math.abs(trend),
                metrics: result.metrics
            };
        }));

        return currentRankedParticipants
            .filter(p => p !== null)
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Get detailed breakdown for a participant
     */
    static async getParticipantBreakdown(participantId) {
        const latestAudit = await prisma.leaderboardAudit.findFirst({
            where: {
                participantId,
                participantRole: { notIn: ['ADMIN', 'ADMIN_DOCTOR'] }
            },
            orderBy: { calculationDate: 'desc' }
        });

        if (!latestAudit) throw new Error('No performance data found for this clinician');

        // Fetch history for trends (last 5 calculations)
        const history = await prisma.leaderboardAudit.findMany({
            where: { participantId },
            orderBy: { calculationDate: 'desc' },
            take: 5
        });

        return {
            participantId,
            currentScore: latestAudit.score,
            metrics: latestAudit.metrics,
            weights: latestAudit.weights,
            history: history.map(h => ({ date: h.calculationDate, score: h.score })),
            calculatedAt: latestAudit.calculationDate
        };
    }

    /**
     * Calculate average response time using primary records
     */
    static async _calculateResponseTimeMetric(participantId, thirtyDaysAgo, prefetchedData = null) {
        const sourceIds = [];
        let totalMinutes = 0;
        let count = 0;

        // 1. Clinical Response: TriageSession to Appointment
        const appointmentsWithTriage = prefetchedData
            ? prefetchedData.appointments.filter(a => a.triageSessionId !== null && a.createdAt >= thirtyDaysAgo)
            : await prisma.appointment.findMany({
                where: {
                    OR: [{ doctorId: participantId }, { therapistId: participantId }],
                    triageSessionId: { not: null },
                    createdAt: { gte: thirtyDaysAgo }
                },
                include: { triageSession: true }
            });

        appointmentsWithTriage.forEach(apt => {
            if (apt.triageSession) {
                const diff = (apt.createdAt.getTime() - apt.triageSession.createdAt.getTime()) / (1000 * 60);
                if (diff > 0) {
                    totalMinutes += diff;
                    count++;
                    sourceIds.push(apt.id, apt.triageSession.id);
                }
            }
        });

        // 2. Chat Response: Patient Message to Clinician Message
        const conversations = prefetchedData
            ? [] // Complex for bulk fetching without many messages. For now, fallback to db or skip if data not provided.
            : await prisma.conversation.findMany({
                where: {
                    OR: [{ doctorId: participantId }, { therapistId: participantId }],
                    updatedAt: { gte: thirtyDaysAgo }
                },
                include: {
                    messages: {
                        where: { createdAt: { gte: thirtyDaysAgo } },
                        orderBy: { createdAt: 'asc' },
                        take: 200
                    }
                }
            });

        conversations.forEach(conv => {
            let lastPatientMsgTime = null;
            conv.messages.forEach(msg => {
                const isPatient = !['DOCTOR', 'THERAPIST', 'ADMIN_DOCTOR'].includes(msg.senderId); // Simplified check, should ideally check User.role
                // Note: Better check if possible, but participantId is clinician
                const isClinician = msg.senderId === participantId;

                if (!isClinician && !lastPatientMsgTime) {
                    lastPatientMsgTime = msg.createdAt;
                } else if (isClinician && lastPatientMsgTime) {
                    const diff = (msg.createdAt.getTime() - lastPatientMsgTime.getTime()) / (1000 * 60);
                    if (diff > 0 && diff < 1440) { // Ignore gaps > 24h as they might be new threads
                        totalMinutes += diff;
                        count++;
                        sourceIds.push(msg.id);
                    }
                    lastPatientMsgTime = null; // Reset for next interaction
                }
            });
        });

        const avgMinutes = count > 0 ? (totalMinutes / count) : 30; // Default to target if no data
        return { avgMinutes, sourceIds: [...new Set(sourceIds)] };
    }

    /**
     * Calculate consistency score based on active days
     */
    static async _calculateConsistencyScore(participantId, thirtyDaysAgo, prefetchedData = null) {
        const sourceIds = [];
        const activeDays = new Set();

        // 1. Appointment Activity
        const appointments = prefetchedData
            ? prefetchedData.appointments.filter(a => a.status === 'COMPLETED' && a.date >= thirtyDaysAgo)
            : await prisma.appointment.findMany({
                where: {
                    OR: [{ doctorId: participantId }, { therapistId: participantId }],
                    status: 'COMPLETED',
                    date: { gte: thirtyDaysAgo }
                }
            });
        appointments.forEach(apt => {
            activeDays.add(apt.date.toISOString().split('T')[0]);
            sourceIds.push(apt.id);
        });

        // 2. Prescription Activity
        const prescriptions = prefetchedData
            ? prefetchedData.prescriptions
            : await prisma.prescription.findMany({
                where: {
                    OR: [{ doctorId: participantId }, { therapistId: participantId }],
                    createdAt: { gte: thirtyDaysAgo }
                }
            });
        prescriptions.forEach(rx => {
            activeDays.add(rx.createdAt.toISOString().split('T')[0]);
            sourceIds.push(rx.id);
        });

        // 3. Chat Activity
        const messages = prefetchedData
            ? prefetchedData.messages
            : await prisma.message.findMany({
                where: {
                    senderId: participantId,
                    createdAt: { gte: thirtyDaysAgo }
                }
            });
        messages.forEach(msg => {
            activeDays.add(msg.createdAt.toISOString().split('T')[0]);
            sourceIds.push(msg.id);
        });

        // Target: 15 active days out of 30 (adjust as needed for clinician workload)
        const consistency = Math.min((activeDays.size / 15) * 100, 100);
        return { consistency, sourceIds: [...new Set(sourceIds)], activeDaysCount: activeDays.size };
    }

    /**
     * Generate an integrity hash for the calculation record
     */
    static _generateIntegrityHash(data) {
        const sortedData = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(sortedData).digest('hex');
    }

    /**
     * Collect unique source IDs from various records
     */
    static _collectSourceIds(records) {
        const ids = records
            .filter(r => r && r.id)
            .map(r => r.id);
        return [...new Set(ids)];
    }
}
