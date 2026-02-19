import prisma from '../lib/prisma.js';
import path from 'path';

const HIGH_RISK_SYMPTOMS = [
    'Chest Pain', 'Shortness of Breath', 'Severe Bleeding', 'Loss of Consciousness',
    'Sudden Weakness', 'Difficulty Speaking', 'High Fever (>103°F)'
];

const SPECIALTY_MAP = {
    'Back Pain': 'Orthopedic', 'Joint Pain': 'Orthopedic', 'Stomach Pain': 'Gastroenterologist',
    'Acid Reflux': 'Gastroenterologist', 'Skin Rash': 'Dermatologist', 'Acne': 'Dermatologist',
    'Headache': 'Neurologist', 'Dizziness': 'Neurologist', 'Anxiety': 'Therapist',
    'Depression': 'Therapist', 'Cough': 'General Physician', 'Fever': 'General Physician'
};

export class TriageService {
    static async submitTriage(userId, data) {
        const { painArea, painSeverity, duration, symptoms, medicalHistory, medications, documentIds } = data;

        // 1. Determine Severity
        let severity = 'LOW';
        const hasHighRiskSymptom = symptoms?.some(s => HIGH_RISK_SYMPTOMS.includes(s)) || false;
        const historyComplexity = (medicalHistory?.length > 100 || (documentIds && documentIds.length > 2));

        if (hasHighRiskSymptom || painSeverity >= 9) severity = 'EMERGENCY';
        else if (painSeverity >= 7 || (painSeverity >= 5 && duration === 'Long-term') || (painSeverity >= 6 && historyComplexity)) severity = 'HIGH';
        else if (painSeverity >= 4) severity = 'MEDIUM';

        // 2. Suggest Specialty
        let suggestedSpecialty = 'General Physician';
        if (symptoms) {
            for (const symptom of symptoms) {
                if (SPECIALTY_MAP[symptom]) {
                    suggestedSpecialty = SPECIALTY_MAP[symptom];
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
                isEscalated: severity === 'HIGH' || severity === 'EMERGENCY',
                responses: { painArea, painSeverity, duration, symptoms, medicalHistory, medications, documentIds }
            }
        });

        if (documentIds && documentIds.length > 0) {
            await prisma.document.updateMany({
                where: { id: { in: documentIds } },
                data: { triageSessionId: triageSession.id }
            });
        }

        return triageSession;
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
