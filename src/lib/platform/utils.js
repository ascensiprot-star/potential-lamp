/**
 * Platform Utilities
 */

export function generateCorrelationId() {
    return `sf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateInvoiceNumber() {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 90000) + 10000;
    return `${prefix}-${year}-${seq}`;
}

/**
 * Evaluate a condition object against a data object.
 * Used by the automation engine for rule evaluation.
 */
export function evaluateCondition(condition, data) {
    const value = getNestedValue(data, condition.field);
    const target = condition.value;

    switch (condition.operator) {
        case 'eq': return value === target;
        case 'neq': return value !== target;
        case 'gt': return Number(value) > Number(target);
        case 'lt': return Number(value) < Number(target);
        case 'gte': return Number(value) >= Number(target);
        case 'lte': return Number(value) <= Number(target);
        case 'contains': return String(value || '').toLowerCase().includes(String(target).toLowerCase());
        case 'not_contains': return !String(value || '').toLowerCase().includes(String(target).toLowerCase());
        default: return true;
    }
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Booking state machine — defines valid transitions.
 */
export const BOOKING_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled', 'no_show'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
};

export function isValidBookingTransition(from, to) {
    return BOOKING_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Map a booking status to an event type.
 */
export function bookingStatusToEvent(status) {
    const map = {
        confirmed: 'booking.confirmed',
        cancelled: 'booking.cancelled',
        completed: 'booking.completed',
        in_progress: 'booking.in_progress',
        no_show: 'booking.no_show',
    };
    return map[status] || null;
}

/**
 * Compute loyalty tier based on booking count and total spend.
 */
export function computeLoyaltyTier(bookingCount, totalSpent) {
    if (bookingCount >= 20 || totalSpent >= 2000) return 'champion';
    if (bookingCount >= 10 || totalSpent >= 500) return 'vip';
    if (bookingCount >= 3 || totalSpent >= 100) return 'regular';
    return 'new';
}

/**
 * Compute risk score for a customer based on their history.
 * Higher = more likely to cancel or no-show.
 */
export function computeRiskScore(bookingCount, cancellationCount, noShowCount) {
    if (bookingCount === 0) return 0;
    const cancelRate = cancellationCount / bookingCount;
    const noShowRate = noShowCount / bookingCount;
    return Math.min(100, Math.round((cancelRate * 60 + noShowRate * 40) * 100));
}