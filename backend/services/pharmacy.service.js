import { PrismaClient } from '@prisma/client';
import { inventoryService } from './inventory.service.js';

const prisma = new PrismaClient();

export class PharmacyService {
    static async getAllMedicines() {
        const medicines = await prisma.medicine.findMany({
            include: { stocks: true },
            orderBy: { name: 'asc' }
        });
        return medicines.map(med => ({
            ...med,
            totalStock: med.stocks.reduce((sum, stock) => sum + stock.quantity, 0)
        }));
    }

    static async addMedicine(data) {
        return prisma.medicine.create({
            data: {
                ...data,
                price: parseFloat(data.price)
            }
        });
    }

    static async updateMedicine(id, data) {
        return prisma.medicine.update({
            where: { id },
            data: {
                ...data,
                price: data.price ? parseFloat(data.price) : undefined
            }
        });
    }

    static async addStock(data) {
        return prisma.medicineStock.create({
            data: {
                ...data,
                expiryDate: new Date(data.expiryDate),
                quantity: parseInt(data.quantity),
                minStock: data.minStock ? parseInt(data.minStock) : 10,
            }
        });
    }

    static async getLowStockMedicines() {
        return inventoryService.getLowStockMedicines();
    }

    static async dispenseMedicines(userId, data) {
        const { patientId, prescriptionId, items } = data;

        return prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const itemsWithPrices = [];

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

            await inventoryService.deductStock(tx, items);

            return tx.pharmacyDispense.create({
                data: {
                    patientId,
                    prescriptionId,
                    dispensedBy: userId,
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
                include: { items: true }
            });
        });
    }

    static async getDispenseHistory() {
        return prisma.pharmacyDispense.findMany({
            include: {
                patient: { select: { fullName: true } },
                dispenser: { select: { email: true } },
                items: {
                    include: { medicine: { select: { name: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
