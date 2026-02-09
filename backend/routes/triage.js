import { PrismaClient } from '@prisma/client';
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

// Multer configuration for document uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/documents/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

const HIGH_RISK_SYMPTOMS = [
    'Chest Pain',
    'Shortness of Breath',
    'Severe Bleeding',
    'Loss of Consciousness',
    'Sudden Weakness',
    'Difficulty Speaking',
    'High Fever (>103°F)'
];

const SPECIALTY_MAP = {
    'Back Pain': 'Orthopedic',
    'Joint Pain': 'Orthopedic',
    'Stomach Pain': 'Gastroenterologist',
    'Acid Reflux': 'Gastroenterologist',
    'Skin Rash': 'Dermatologist',
    'Acne': 'Dermatologist',
    'Headache': 'Neurologist',
    'Dizziness': 'Neurologist',
    'Anxiety': 'Therapist',
    'Depression': 'Therapist',
    'Cough': 'General Physician',
    'Fever': 'General Physician'
};

router.post('/submit', authMiddleware, async (req, res, next) => {
    try {
        console.log('[Triage] Submission received:', req.body);
        const {
            painArea,
            painSeverity,
            duration,
            symptoms,
            medicalHistory,
            medications,
            documentIds // Array of IDs from /upload
        } = req.body;

        // 1. Determine Severity
        let severity = 'LOW';
        const hasHighRiskSymptom = symptoms?.some(s => HIGH_RISK_SYMPTOMS.includes(s)) || false;

        // Increased complexity factor if many documents or specific history
        const historyComplexity = (medicalHistory?.length > 100 || (documentIds && documentIds.length > 2));

        if (hasHighRiskSymptom || painSeverity >= 9) {
            severity = 'EMERGENCY';
        } else if (painSeverity >= 7 || (painSeverity >= 5 && duration === 'Long-term') || (painSeverity >= 6 && historyComplexity)) {
            severity = 'HIGH';
        } else if (painSeverity >= 4) {
            severity = 'MEDIUM';
        }
        console.log('[Triage] Determined severity:', severity);

        // 2. Suggest Specialty
        let suggestedSpecialty = 'General Physician';
        for (const symptom of symptoms) {
            if (SPECIALTY_MAP[symptom]) {
                suggestedSpecialty = SPECIALTY_MAP[symptom];
                break;
            }
        }

        // 3. Check for escalation criteria
        const isEscalated = severity === 'HIGH' || severity === 'EMERGENCY';

        // 4. Create Triage Session
        const patientRecord = await prisma.patient.findUnique({
            where: { userId: req.user.id }
        });

        if (!patientRecord) {
            return res.status(404).json({ error: 'Patient profile not found' });
        }

        const triageSession = await prisma.triageSession.create({
            data: {
                patientId: patientRecord.id,
                severity,
                suggestedSpecialty,
                isEscalated,
                responses: {
                    painArea,
                    painSeverity,
                    duration,
                    symptoms,
                    medicalHistory,
                    medications,
                    documentIds
                }
            }
        });
        console.log('[Triage] Created session:', triageSession.id);

        // Link uploaded documents to the session
        if (documentIds && documentIds.length > 0) {
            console.log('[Triage] Linking documents:', documentIds);
            await prisma.document.updateMany({
                where: { id: { in: documentIds } },
                data: { triageSessionId: triageSession.id }
            });
        }

        res.status(201).json(triageSession);
    } catch (err) {
        console.error('[Triage] Error in /submit:', err);
        next(err);
    }
});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res, next) => {
    try {
        console.log('[Triage] Upload received:', req.file?.originalname);
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const patientRecord = await prisma.patient.findUnique({
            where: { userId: req.user.id }
        });

        if (!patientRecord) {
            return res.status(404).json({ error: 'Patient profile not found' });
        }

        const { category, description } = req.body;

        const document = await prisma.document.create({
            data: {
                patientId: patientRecord.id,
                uploadedBy: req.user.id,
                fileName: req.file.originalname,
                fileUrl: `/uploads/documents/${req.file.filename}`,
                fileType: path.extname(req.file.originalname).substring(1).toUpperCase(),
                fileSize: req.file.size,
                category: category || 'MEDICAL_RECORD',
                description: description || ''
            }
        });

        res.status(201).json(document);
    } catch (err) {
        next(err);
    }
});

router.get('/my-sessions', authMiddleware, async (req, res, next) => {
    try {
        const patientRecord = await prisma.patient.findUnique({
            where: { userId: req.user.id }
        });

        if (!patientRecord) {
            return res.status(404).json({ error: 'Patient profile not found' });
        }

        const sessions = await prisma.triageSession.findMany({
            where: { patientId: patientRecord.id },
            orderBy: { createdAt: 'desc' },
            include: { appointment: true }
        });

        res.json(sessions);
    } catch (err) {
        next(err);
    }
});

export default router;
