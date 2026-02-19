import prisma from '../lib/prisma.js';

const N8N_WEBHOOK_URL = "https://n8n.srv930949.hstgr.cloud/webhook/6d090cd6-89ef-4fc3-97d1-0a6c0ca9debe";
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

            // 1. Fetch full details with all needed relations for payload integrity
            if (typeof appointmentOrId === 'string' || !appointment.doctor || !appointment.patient) {
                appointment = await prisma.appointment.findUnique({
                    where: { id: appointmentId },
                    include: {
                        doctor: true,
                        therapist: true,
                        patient: true,
                        branch: true
                    }
                });
            }

            if (!appointment) return false;

            // 2. Persistent Idempotency check
            if (processedIds.has(appointmentId) || appointment.notificationSent) {
                console.log(`[NotificationService] IDEMPOTENCY - Webhook Bypassed for ${appointmentId} (Flag: ${appointment.notificationSent})`);
                return false;
            }

            // 3. Client and Contact Info
            const patientName = appointment.patient?.fullName || appointment.contactDetails?.fullName;
            if (!patientName) {
                console.error(`[NotificationService] Data Integrity Error: Missing patient name for appointment ${appointmentId}`);
                return false;
            }

            // 4. Phone Number Formatting (+91)
            let rawPhone = appointment.contactDetails?.phoneNumber || appointment.patient?.phoneNumber || "";
            let sanitizedPhone = rawPhone.replace(/\D/g, '');
            if (sanitizedPhone.startsWith('0')) sanitizedPhone = sanitizedPhone.substring(1);
            const formattedMobile = sanitizedPhone.startsWith('91') && sanitizedPhone.length > 10
                ? sanitizedPhone
                : `91${sanitizedPhone}`;

            // 5. Date and Time Formatting
            const formatDateTime = (date) => {
                if (!date) return null;
                return {
                    date: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    iso: date.toISOString()
                };
            };

            const docTimeInfo = appointment.date ? formatDateTime(new Date(appointment.date)) : null;
            const therTimeInfo = appointment.therapistDate ? formatDateTime(new Date(appointment.therapistDate)) : null;

            // 6. Estimated Arrival (15 mins before)
            let estimatedArrivalTime = null;
            if (appointment.consultationMode === 'OFFLINE') {
                const arrivalDate = appointment.date ? new Date(appointment.date) : (appointment.therapistDate ? new Date(appointment.therapistDate) : null);
                if (arrivalDate) {
                    const arrival = new Date(arrivalDate.getTime() - 15 * 60000);
                    estimatedArrivalTime = arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                }
            }

            const payload = {
                appointmentId: appointment.id,
                clientName: patientName,
                mobileNumber: formattedMobile,
                appointmentDate: docTimeInfo?.date || therTimeInfo?.date,
                appointmentTime: docTimeInfo?.time || therTimeInfo?.time,
                doctorName: appointment.doctor?.fullName || null,
                therapistName: appointment.therapist?.fullName || null,
                branch: appointment.branch?.name || null,
                consultationMode: appointment.consultationMode,
                consultationType: appointment.consultationType,
                estimatedArrivalTime,
                thankYouMessage: `Dear ${patientName}, your appointment at Al-Shifa Ayush is confirmed.`,
                metadata: { status: appointment.status, timestamp: new Date().toISOString() }
            };

            // 7. Mark as processed BEFORE dispatching to guarantee once-only behavior
            await prisma.appointment.update({
                where: { id: appointmentId },
                data: { notificationSent: true }
            });
            processedIds.add(appointmentId);

            console.log(`[NotificationService] AUDIT LOG - Dispatching for ${appointmentId}:`, JSON.stringify(payload, null, 2));

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
