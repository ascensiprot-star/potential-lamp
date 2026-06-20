/**
 * ServiceFlow Workflow Engine
 * 
 * Manages booking lifecycle as an explicit state machine.
 * All transitions are validated, audited, and event-sourced.
 * 
 * Usage:
 *   import { workflowEngine } from '@/lib/platform/workflowEngine';
 *   const result = await workflowEngine.transition({ booking, toStatus, actor, actorRole, reason });
 */

import { isValidBookingTransition, bookingStatusToEvent } from './utils';
import { auditLogger } from './auditLogger';
import { eventBus } from './eventBus';
import { notificationService } from './notificationService';
import { invoiceService } from './invoiceService';

class WorkflowEngine {
    /**
     * Transition a booking to a new status.
     * Validates the transition, persists the new state, emits events, audits the change.
     */
    async transitionBooking({ booking, toStatus, actor, actorRole = 'system', reason = null, metadata = {} }) {
        const fromStatus = booking.status;

        if (!isValidBookingTransition(fromStatus, toStatus)) {
            throw new Error(`Invalid transition: ${fromStatus} → ${toStatus}`);
        }

        const updates = { status: toStatus };
        if (reason) updates.cancellation_reason = reason;
        if (toStatus === 'in_progress') updates.started_at = new Date().toISOString();
        if (toStatus === 'completed') updates.completed_at = new Date().toISOString();

        // Persist

        // Audit
        auditLogger.logBookingAction({
            actor, actorRole,
            action: `booking.status_changed.${fromStatus}_to_${toStatus}`,
            booking: updated,
            previousState: { status: fromStatus },
        });

        // Publish domain event
        const eventType = bookingStatusToEvent(toStatus);
        if (eventType) {
            await eventBus.publish(eventType, {
                ...updated,
                previousStatus: fromStatus,
                reason,
                ...metadata,
            }, { actor, source: actorRole === 'system' ? 'automation' : 'user_action' });
        }

        // Side effects per transition
        if (toStatus === 'confirmed') {
            await notificationService.notify({
                recipientEmail: booking.customer_email,
                recipientRole: 'customer',
                type: 'booking_confirmed',
                title: 'Booking Confirmed! ✅',
                body: `Your booking for ${booking.service_name} with ${booking.provider_name} has been confirmed for ${booking.date} at ${booking.time_slot}.`,
                actionUrl: '/dashboard',
                resourceType: 'Booking',
                resourceId: booking.id,
            });
        }

        if (toStatus === 'cancelled') {
            await notificationService.notify({
                recipientEmail: booking.customer_email,
                recipientRole: 'customer',
                type: 'booking_cancelled',
                title: 'Booking Cancelled',
                body: `Your booking for ${booking.service_name} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
                actionUrl: '/dashboard',
                resourceType: 'Booking',
                resourceId: booking.id,
                priority: 'high',
            });
        }

        if (toStatus === 'completed') {
            // Auto-generate invoice
            await invoiceService.createFromBooking(updated, actor);
        }

        return updated;
    }

    /**
     * Confirm all pending bookings for a provider that have a past due date.
     * Runs as a background sweep.
     */
    async sweepOverdueBookings() {
        const today = new Date().toISOString().split('T')[0];
        const overdue = pending.filter(b => b.date < today);

        for (const booking of overdue) {
            await eventBus.publish('booking.overdue', { ...booking }, { source: 'system', actor: 'system@serviceflow.app' });
        }

        auditLogger.logSystemEvent({
            action: 'workflow.sweep_overdue_bookings',
            resourceType: 'Booking',
            metadata: { count: overdue.length, date: today },
        });

        return overdue.length;
    }
}

export const workflowEngine = new WorkflowEngine();