/**
 * ServiceFlow Invoice Service
 * 
 * Manages invoice lifecycle — generation, status transitions, and revenue tracking.
 */

import { generateInvoiceNumber } from './utils';
import { auditLogger } from './auditLogger';

class InvoiceService {
    /**
     * Auto-generate an invoice when a booking is completed.
     */
    async createFromBooking(booking, actor = 'system') {
        // Check if invoice already exists
        if (existing.length > 0) return existing[0];

        const subtotal = booking.price || 0;
        const taxRate = 0; // configurable per provider in future
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

            invoice_number: generateInvoiceNumber(),
            booking_id: booking.id,
            provider_id: booking.provider_id,
            customer_email: booking.customer_email,
            line_items: [{
                description: booking.service_name,
                quantity: 1,
                unit_price: subtotal,
                total: subtotal,
            }],
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: total,
            currency: 'USD',
            status: 'issued',
            due_date: new Date().toISOString().split('T')[0],
            metadata: { booking_date: booking.date, time_slot: booking.time_slot },
        });

        auditLogger.log({
            actor,
            actorRole: 'system',
            action: 'invoice.created',
            resourceType: 'Invoice',
            resourceId: invoice.id,
            newState: invoice,
            tags: ['invoice', 'auto-generated'],
        });

        return invoice;
    }

    async markPaid(invoiceId, actor, paymentMethod = 'cash') {
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: paymentMethod,
        });

        auditLogger.log({
            actor,
            actorRole: 'provider',
            action: 'invoice.paid',
            resourceType: 'Invoice',
            resourceId: invoiceId,
            tags: ['invoice', 'payment'],
        });

        return updated;
    }

    async voidInvoice(invoiceId, actor, reason) {
            status: 'void',
            notes: reason,
        });
    }
}

export const invoiceService = new InvoiceService();