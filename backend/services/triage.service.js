import prisma from '../lib/prisma.js';
import path from 'path';

const TRIAGE_CONFIG = {
    SEVERITY_THRESHOLDS: {
        LOW: { max: 3, label: 'Standard', recommendation: 'General Physician' },
        MEDIUM: { max: 7, label: 'Specialist', recommendation: 'Specialized Doctor' },
        HIGH: { max: 10, label: 'Senior Specialist', recommendation: 'Senior Consultant' }
    },
    SPECIALTY_MAP: {
        'Back Pain': 'Orthopedic', 'Joint Pain': 'Orthopedic', 'Stomach Pain': 'Gastroenterologist',
        'Acid Reflux': 'Gastroenterologist', 'Skin Rash': 'Dermatologist', 'Acne': 'Dermatologist',
        'Headache': 'Neurologist', 'Dizziness': 'Neurologist', 'Anxiety': 'Therapist',
        'Depression': 'Therapist', 'Cough': 'General Physician', 'Fever': 'General Physician'
    }
};

export class TriageService {
    static async submitTriage(userId, data) {
        const { painArea, painSeverity, duration, symptoms, medicalHistory, medications, documentIds } = data;

        // 1. Threshold-Driven Classification Engine
        let classification = 'Standard';
        let severity = 'LOW';
        let reasoning = [];

        // Determine category based on painSeverity score strictly
        if (painSeverity >= 8) {
            classification = TRIAGE_CONFIG.SEVERITY_THRESHOLDS.HIGH.label;
            severity = 'HIGH';
            reasoning.push(`High severity score (${painSeverity}/10) requires a Senior Specialist.`);
        } else if (painSeverity >= 4) {
            classification = TRIAGE_CONFIG.SEVERITY_THRESHOLDS.MEDIUM.label;
            severity = 'MEDIUM';
            reasoning.push(`Moderate severity score (${painSeverity}/10) recommended for Specialist evaluation.`);
        } else {
            classification = TRIAGE_CONFIG.SEVERITY_THRESHOLDS.LOW.label;
            severity = 'LOW';
            reasoning.push(`Low severity score (${painSeverity}/10) suitable for Standard Consultation.`);
        }

        // 2. Specialty Mapping (Informational)
        let suggestedSpecialty = 'General Physician';
        if (symptoms) {
            for (const symptom of symptoms) {
                if (TRIAGE_CONFIG.SPECIALTY_MAP[symptom]) {
                    suggestedSpecialty = TRIAGE_CONFIG.SPECIALTY_MAP[symptom];
                    break;
                }
            }
        }

        const patientRecord = await prisma.patient.findUnique({ where: { userId } });
        if (!patientRecord) throw new Error('Patient profile not found');

        const triageSession = await prisma.triageSession.create({
            data: {
                patientId: patientRecord.id,
                severity,
                suggestedSpecialty,
                isEscalated: severity === 'HIGH',
                responses: {
                    ...data,
                    classification,
                    reasoning: reasoning.join(', ')
                }
            }
        });

        console.log(`[Triage Decision] Patient: ${patientRecord.id} | Score: ${painSeverity} | Result: ${classification}`);

        if (documentIds && documentIds.length > 0) {
            await prisma.document.updateMany({
                where: { id: { in: documentIds } },
                data: { triageSessionId: triageSession.id }
            });
        }

        return {
            ...triageSession,
            classification,
            reasoning: reasoning.join(', ')
        };
    }

    static async uploadDocument(userId, file, data) {
        const patientRecord = await prisma.patient.findUnique({ where: { userId } });
        if (!patientRecord) throw new Error('Patient profile not found');

        const { category, description } = data;

        return prisma.document.create({
            data: {
                patientId: patientRecord.id,
                uploadedBy: userId,
                fileName: file.originalname,
                fileUrl: `/uploads/documents/${file.filename}`,
                fileType: path.extname(file.originalname).substring(1).toUpperCase(),
                fileSize: file.size,
                category: category || 'MEDICAL_RECORD',
                description: description || ''
            }
        });
    }

    static async getMySessions(userId) {
        const patientRecord = await prisma.patient.findUnique({ where: { userId } });
        if (!patientRecord) throw new Error('Patient profile not found');

        return prisma.triageSession.findMany({
            where: { patientId: patientRecord.id },
            orderBy: { createdAt: 'desc' },
            include: { appointment: true }
        });
    }
}
