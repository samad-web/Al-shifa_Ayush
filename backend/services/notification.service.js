import prisma from '../lib/prisma.js';

const N8N_WEBHOOK_URL = "https://n8n.srv930949.hstgr.cloud/webhook-test/6d090cd6-89ef-4fc3-97d1-0a6c0ca9debe";
const WEBHOOK_SECRET = "shifa-ayush-secret-token-2024";

// Track processed appointment IDs for idempotency
const processedIds = new Set();

export class NotificationService {
    /**
     * Send appointment confirmation to n8n webhook
     * @param {string|Object} appointmentOrId - The created appointment ID or object
     * @param {string} userRole - The role of the user who booked the appointment
     */
    async sendAppointmentConfirmation(appointmentOrId, userRole) {
        try {
            // 1. Fail-safe: Strict Patient-only trigger
            if (userRole !== 'PATIENT') {
                console.log(`[NotificationService] Webhook Not Triggered – Non-Patient Source (${userRole})`);
                return false;
            }

            let appointment = appointmentOrId;
            const appointmentId = typeof appointmentOrId === 'string' ? appointmentOrId : appointmentOrId.id;

            // 2. Idempotency check: Prevent duplicate triggers
            if (processedIds.has(appointmentId)) {
                console.log(`[NotificationService] Webhook Bypassed – Duplicate Trigger for ${appointmentId}`);
                return false;
            }

            // If only ID is provided, fetch full details with all needed relations
            if (typeof appointmentOrId === 'string') {
                appointment = await prisma.appointment.findUnique({
                    where: { id: appointmentOrId },
                    include: {
                        doctor: true,
                        therapist: true,
                        patient: true,
                        branch: true
                    }
                });
            } else if (appointment && (!appointment.doctor || !appointment.patient)) {
                // If object is passed but missing relations, re-fetch to be safe
                appointment = await prisma.appointment.findUnique({
                    where: { id: appointment.id },
                    include: {
                        doctor: true,
                        therapist: true,
                        patient: true,
                        branch: true
                    }
                });
            }

            if (!appointment) return false;

            // Mark as processed immediately to prevent concurrent triggers
            processedIds.add(appointmentId);

            // 1. Client and Contact Info (Strictly from the record)
            const patientName = appointment.patient?.fullName || appointment.contactDetails?.fullName;
            if (!patientName) {
                console.error(`[NotificationService] Data Integrity Error: Missing patient name for appointment ${appointmentId}`);
                return false;
            }

            // ... (rest of the formatting logic remains the same)

            // 2. Phone Number Sanitation & Formatting for India (+91)
            let rawPhone = appointment.contactDetails?.phoneNumber || appointment.patient?.phoneNumber || "";
            // Remove all non-digits
            let sanitizedPhone = rawPhone.replace(/\D/g, '');
            // Remove leading zero if present
            if (sanitizedPhone.startsWith('0')) {
                sanitizedPhone = sanitizedPhone.substring(1);
            }
            // Append 91 if not already present as prefix
            const formattedMobile = sanitizedPhone.startsWith('91') && sanitizedPhone.length > 10
                ? sanitizedPhone
                : `91${sanitizedPhone}`;

            // 3. Provider Details (Explicitly handled)
            const doctorName = appointment.doctor ? appointment.doctor.fullName : null;
            const therapistName = appointment.therapist ? appointment.therapist.fullName : null;

            // 4. Date and Time Formatting
            const docDate = appointment.date ? new Date(appointment.date) : null;
            const therDate = appointment.therapistDate ? new Date(appointment.therapistDate) : null;

            const formatDateTime = (date) => {
                if (!date) return null;
                return {
                    date: date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    time: date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    iso: date.toISOString()
                };
            };

            const docTimeInfo = appointment.doctorId ? formatDateTime(docDate) : null;
            const therTimeInfo = appointment.therapistId ? formatDateTime(therDate) : null;

            // 5. Estimated Arrival (15 mins before for physical visits)
            let estimatedArrivalTime = null;
            if (appointment.consultationMode === 'OFFLINE') {
                const arrivalDate = docDate || therDate;
                if (arrivalDate) {
                    const arrival = new Date(arrivalDate.getTime() - 15 * 60000);
                    estimatedArrivalTime = arrival.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }

            const payload = {
                appointmentId: appointment.id,
                clientName: patientName,
                mobileNumber: formattedMobile,
                appointmentDate: docTimeInfo?.date || therTimeInfo?.date,
                appointmentTime: docTimeInfo?.time || therTimeInfo?.time,
                doctorName: doctorName,
                doctorAppointmentTime: docTimeInfo ? docTimeInfo.time : null,
                therapistName: therapistName,
                therapistAppointmentTime: therTimeInfo ? therTimeInfo.time : null,
                branch: appointment.branch?.name || null,
                consultationMode: appointment.consultationMode || null,
                consultationType: appointment.consultationType,
                estimatedArrivalTime: estimatedArrivalTime,
                thankYouMessage: `Dear ${patientName}, your appointment at Al-Shifa Ayush is confirmed.`,
                metadata: {
                    status: appointment.status,
                    timestamp: new Date().toISOString()
                }
            };

            // Audit Log: Record exact payload before dispatch
            console.log(`[NotificationService] AUDIT LOG - Payload for ${appointmentId}:`, JSON.stringify(payload, null, 2));

            console.log(`[NotificationService] Triggering n8n webhook for appointment ${appointment.id} (Mobile: ${formattedMobile})`);

            // Non-blocking trigger using background fetch
            fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': WEBHOOK_SECRET
                },
                body: JSON.stringify(payload)
            }).then(async response => {
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[NotificationService] Webhook failed (${response.status}): ${errorText}`);
                } else {
                    console.log(`[NotificationService] Webhook delivered successfully for ${appointment.id}`);
                }
            }).catch(err => {
                console.error(`[NotificationService] Error calling webhook for ${appointment.id}:`, err.message);
            });

            return true;
        } catch (error) {
            console.error(`[NotificationService] Failed to prepare notification:`, error.message);
            return false;
        }
    }
}

export const notificationService = new NotificationService();
