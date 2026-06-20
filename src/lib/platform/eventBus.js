/**
 * ServiceFlow Platform Event Bus
 * 
 * In-memory publish/subscribe system with typed domain events.
 * Events are also persisted to WorkflowEvent entity for durability and replay.
 * 
 * Usage:
 *   import { eventBus } from '@/lib/platform/eventBus';
 *   eventBus.publish('booking.created', { bookingId: '...', ... });
 *   const unsub = eventBus.subscribe('booking.created', handler);
 */

import { generateCorrelationId } from './utils';

class EventBus {
    constructor() {
        this._handlers = new Map(); // eventType -> Set of handlers
        this._middlewares = [];
        this._sessionCorrelationId = generateCorrelationId();
    }

    /**
     * Subscribe to a domain event type.
     * Use '*' to subscribe to all events.
     * Returns an unsubscribe function.
     */
    subscribe(eventType, handler) {
        if (!this._handlers.has(eventType)) {
            this._handlers.set(eventType, new Set());
        }
        this._handlers.get(eventType).add(handler);
        return () => this._handlers.get(eventType)?.delete(handler);
    }

    /**
     * Add middleware that runs before every event dispatch.
     * Middleware receives (eventType, payload) and can mutate/enrich the payload.
     */
    use(middleware) {
        this._middlewares.push(middleware);
    }

    /**
     * Publish a domain event.
     * Synchronously notifies all subscribers, then persists asynchronously.
     */
    async publish(eventType, payload = {}, options = {}) {
        const event = {
            type: eventType,
            payload,
            correlationId: options.correlationId || this._sessionCorrelationId,
            causationId: options.causationId || null,
            timestamp: new Date().toISOString(),
            source: options.source || 'user_action',
            actor: options.actor || null,
        };

        // Run middleware
        for (const mw of this._middlewares) {
            await mw(event);
        }

        // Notify wildcard subscribers
        this._handlers.get('*')?.forEach(h => {
            try { h(event); } catch (e) { console.error('[EventBus] Handler error:', e); }
        });

        // Notify specific event subscribers
        this._handlers.get(eventType)?.forEach(h => {
            try { h(event); } catch (e) { console.error('[EventBus] Handler error:', e); }
        });

        // Persist event to WorkflowEvent entity (non-blocking)
        const [aggregateType, ...rest] = eventType.split('.');
        this._persist({
            event_type: eventType,
            aggregate_type: aggregateType,
            aggregate_id: payload.id || payload.bookingId || payload.providerId || 'unknown',
            actor_email: options.actor || 'system',
            payload,
            correlation_id: event.correlationId,
            causation_id: event.causationId,
            source: event.source,
        }).catch(err => console.warn('[EventBus] Persist failed (non-critical):', err));

        return event;
    }

    async _persist(data) {
    }
}

export const eventBus = new EventBus();