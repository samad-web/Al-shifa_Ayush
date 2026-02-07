import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
});

/**
 * Parse CSV file and return data
 */
async function parseCSV(filepath) {
    return new Promise((resolve, reject) => {
        const results = [];
        createReadStream(filepath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

/**
 * Validate patient data
 */
function validatePatientData(row) {
    const errors = [];

    if (!row.fullName?.trim()) {
        errors.push('Full name is required');
    }
    if (!row.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push('Valid email is required');
    }
    if (!row.phoneNumber?.trim() || !/^\+?[\d\s-]{10,}$/.test(row.phoneNumber)) {
        errors.push('Valid phone number is required');
    }
    if (row.age && (isNaN(row.age) || row.age < 0 || row.age > 150)) {
        errors.push('Valid age is required');
    }

    return errors;
}

/**
 * Upload and validate CSV for bulk patient import
 */
router.post(
    '/patients/upload',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']),
    upload.single('file'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const data = await parseCSV(req.file.path);

            // Validate all rows
            const validationResults = data.map((row, index) => ({
                row: index + 1,
                data: row,
                errors: validatePatientData(row),
            }));

            const validRows = validationResults.filter((r) => r.errors.length === 0);
            const invalidRows = validationResults.filter((r) => r.errors.length > 0);

            // Create bulk operation record
            const bulkOp = await prisma.bulkOperation.create({
                data: {
                    type: 'PATIENT_IMPORT',
                    initiatedBy: req.user.id,
                    status: 'PENDING',
                    totalRecords: data.length,
                    fileUrl: req.file.path,
                },
            });

            // Clean up file
            await unlink(req.file.path);

            res.json({
                success: true,
                operationId: bulkOp.id,
                summary: {
                    total: data.length,
                    valid: validRows.length,
                    invalid: invalidRows.length,
                },
                validRows,
                invalidRows: invalidRows.map((r) => ({
                    row: r.row,
                    data: r.data,
                    errors: r.errors,
                })),
            });
        } catch (err) {
            if (req.file) {
                await unlink(req.file.path).catch(() => { });
            }
            next(err);
        }
    }
);

/**
 * Execute bulk patient import
 */
router.post(
    '/patients/import',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']),
    async (req, res, next) => {
        try {
            const { patients } = req.body;

            if (!Array.isArray(patients) || patients.length === 0) {
                return res.status(400).json({ error: 'Invalid patient data' });
            }

            const bulkOp = await prisma.bulkOperation.create({
                data: {
                    type: 'PATIENT_IMPORT',
                    initiatedBy: req.user.id,
                    status: 'IN_PROGRESS',
                    totalRecords: patients.length,
                },
            });

            const results = {
                success: [],
                failed: [],
            };

            // Process each patient
            for (let i = 0; i < patients.length; i++) {
                const patientData = patients[i];
                try {
                    // Check if user exists
                    const existingUser = await prisma.user.findUnique({
                        where: { email: patientData.email },
                    });

                    if (existingUser) {
                        results.failed.push({
                            row: i + 1,
                            data: patientData,
                            error: 'Email already exists',
                        });
                        continue;
                    }

                    // Create user and patient
                    const user = await prisma.user.create({
                        data: {
                            email: patientData.email,
                            password: patientData.password || 'ChangeMe123!',
                            role: 'PATIENT',
                        },
                    });

                    const patient = await prisma.patient.create({
                        data: {
                            userId: user.id,
                            fullName: patientData.fullName,
                            phoneNumber: patientData.phoneNumber,
                            age: patientData.age ? parseInt(patientData.age) : null,
                            gender: patientData.gender || null,
                            therapyType: patientData.therapyType || null,
                        },
                    });

                    results.success.push({
                        row: i + 1,
                        patientId: patient.id,
                        email: user.email,
                    });
                } catch (error) {
                    results.failed.push({
                        row: i + 1,
                        data: patientData,
                        error: error.message,
                    });
                }
            }

            // Update bulk operation
            await prisma.bulkOperation.update({
                where: { id: bulkOp.id },
                data: {
                    status: results.failed.length === 0 ? 'COMPLETED' : 'COMPLETED',
                    processedRecords: results.success.length,
                    failedRecords: results.failed.length,
                    completedAt: new Date(),
                    errorLog: results.failed.length > 0 ? results.failed : null,
                },
            });

            res.json({
                success: true,
                operationId: bulkOp.id,
                results: {
                    total: patients.length,
                    imported: results.success.length,
                    failed: results.failed.length,
                    successfulImports: results.success,
                    failedImports: results.failed,
                },
            });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * Get bulk operation status
 */
router.get(
    '/operations/:id',
    authMiddleware,
    async (req, res, next) => {
        try {
            const operation = await prisma.bulkOperation.findUnique({
                where: { id: req.params.id },
                include: {
                    user: {
                        select: {
                            email: true,
                        },
                    },
                },
            });

            if (!operation) {
                return res.status(404).json({ error: 'Operation not found' });
            }

            res.json({ success: true, operation });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * List bulk operations
 */
router.get(
    '/operations',
    authMiddleware,
    roleMiddleware(['ADMIN', 'ADMIN_DOCTOR']),
    async (req, res, next) => {
        try {
            const operations = await prisma.bulkOperation.findMany({
                include: {
                    user: {
                        select: {
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });

            res.json({ success: true, operations });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
