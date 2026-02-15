import { PrismaClient } from '@prisma/client';
import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { inventoryService } from '../services/inventory.service.js';
const router = express.Router();

const prisma = new PrismaClient();

// --- MEDICINES ---

// Get all medicines with current stock levels
router.get('/medicines', authMiddleware, async (req, res, next) => {
    try {
        const medicines = await prisma.medicine.findMany({
            include: {
                stocks: true
            },
            orderBy: { name: 'asc' }
        });

        // Calculate total quantity for each medicine
        const medicinesWithStock = medicines.map(med => ({
            ...med,
            totalStock: med.stocks.reduce((sum, stock) => sum + stock.quantity, 0)
        }));

        res.json(medicinesWithStock);
    } catch (err) {
        next(err);
    }
});

// Add a new medicine
router.post('/medicines', authMiddleware, roleMiddleware(['ADMIN', 'PHARMACIST', 'ADMIN_DOCTOR']), async (req, res, next) => {
    try {
        const { name, brand, category, manufacturer, composition, description, price } = req.body;

        const medicine = await prisma.medicine.create({
            data: {
                name,
                brand,
                category,
                manufacturer,
                composition,
                description,
                price: parseFloat(price)
            }
        });

        res.status(201).json(medicine);
    } catch (err) {
        next(err);
    }
});

// Update a medicine
router.put('/medicines/:id', authMiddleware, roleMiddleware(['ADMIN', 'PHARMACIST', 'ADMIN_DOCTOR']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, brand, category, manufacturer, composition, description, price } = req.body;

        const medicine = await prisma.medicine.update({
            where: { id },
            data: {
                name,
                brand,
                category,
                manufacturer,
                composition,
                description,
                price: price ? parseFloat(price) : undefined
            }
        });

        res.json(medicine);
    } catch (err) {
        next(err);
    }
});

// --- STOCK MANAGEMENT ---

// Add stock to a medicine
router.post('/stock', authMiddleware, roleMiddleware(['ADMIN', 'PHARMACIST', 'ADMIN_DOCTOR']), async (req, res, next) => {
    try {
        const { medicineId, batchNumber, expiryDate, quantity, minStock, location } = req.body;

        const stock = await prisma.medicineStock.create({
            data: {
                medicineId,
                batchNumber,
                expiryDate: new Date(expiryDate),
                quantity: parseInt(quantity),
                minStock: minStock ? parseInt(minStock) : 10,
                location
            }
        });

        res.status(201).json(stock);
    } catch (err) {
        next(err);
    }
});

// Get low stock medicines
router.get('/stock/low', authMiddleware, roleMiddleware(['ADMIN', 'PHARMACIST', 'ADMIN_DOCTOR']), async (req, res, next) => {
    try {
        const lowStockMedicines = await prisma.medicine.findMany({
            where: {
                stocks: {
                    some: {
                        quantity: {
                            lte: prisma.medicineStock.fields.minStock
                        }
                    }
                }
            },
            include: {
                stocks: true
            }
        });

        res.json(lowStockMedicines);
    } catch (err) {
        next(err);
    }
});

// --- DISPENSING ---

// Dispense medicines to a patient
router.post('/dispense', authMiddleware, roleMiddleware(['PHARMACIST', 'ADMIN', 'ADMIN_DOCTOR']), async (req, res, next) => {
    try {
        const { patientId, prescriptionId, items } = req.body; // items: [{ medicineId, quantity, stockId }]

        // Start a transaction
        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const itemsWithPrices = [];

            // 1. Verify and Pick Prices
            for (const item of items) {
                const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
                if (!medicine) throw new Error(`Medicine ${item.medicineId} not found`);

                const itemTotalPrice = medicine.price * item.quantity;
                totalAmount += itemTotalPrice;

                itemsWithPrices.push({
                    medicineId: item.medicineId,
                    quantity: item.quantity,
                    unitPrice: medicine.price,
                    totalPrice: itemTotalPrice,
                    stockId: item.stockId
                });
            }

            // 2. Deduct from stock using InventoryService
            await inventoryService.deductStock(tx, items);

            // 3. Create PharmacyDispense record
            const dispense = await tx.pharmacyDispense.create({
                data: {
                    patientId,
                    prescriptionId,
                    dispensedBy: req.user.id,
                    totalAmount,
                    items: {
                        create: itemsWithPrices.map(item => ({
                            medicineId: item.medicineId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice
                        }))
                    }
                },
                include: {
                    items: true
                }
            });

            return dispense;
        });

        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

// Get dispensing history
router.get('/dispenses', authMiddleware, async (req, res, next) => {
    try {
        const dispenses = await prisma.pharmacyDispense.findMany({
            include: {
                patient: { select: { fullName: true } },
                dispenser: { select: { email: true } },
                items: {
                    include: {
                        medicine: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(dispenses);
    } catch (err) {
        next(err);
    }
});

export default router;
