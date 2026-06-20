/**
 * ServiceFlow Automation Engine
 * 
 * Rule-based automation layer. Loads AutomationRule records from the database,
 * subscribes to the event bus, evaluates conditions, and executes actions.
 * 
 * This is the "brain" of the platform — it enables no-code workflow automation
 * where rules can be created/modified without code changes.
 * 
 * Usage:
 *   import { automationEngine } from '@/lib/platform/automationEngine';
 *   automationEngine.start(); // call once on app init
 */

import { eventBus } from './eventBus';
import { evaluateCondition } from './utils';
import { notificationService } from './notificationService';
import { auditLogger } from './auditLogger';

class AutomationEngine {
    constructor() {
        this._rules = [];
        this._running = false;
        this._unsubscribers = [];
    }

    async start() {
        if (this._running) return;
        this._running = true;

        // Load active rules from database
        await this._loadRules();

        // Subscribe to all events
        const unsub = eventBus.subscribe('*', (event) => {
            this._processEvent(event);
        });
        this._unsubscribers.push(unsub);

        // Reload rules every 5 minutes to pick up changes
        const interval = setInterval(() => this._loadRules(), 5 * 60 * 1000);
        this._unsubscribers.push(() => clearInterval(interval));

        auditLogger.logSystemEvent({
            action: 'automation_engine.started',
            resourceType: 'System',
            metadata: { rules_loaded: this._rules.length },
        });
    }

    stop() {
        this._unsubscribers.forEach(u => typeof u === 'function' && u());
        this._unsubscribers = [];
        this._running = false;
    }

    async _loadRules() {
    }

    async _processEvent(event) {
        const matchingRules = this._rules.filter(rule => rule.trigger_event === event.type);
        if (matchingRules.length === 0) return;

        for (const rule of matchingRules) {
            try {
                const conditionsMet = (rule.conditions || []).every(c => evaluateCondition(c, event.payload));
                if (!conditionsMet) continue;

                await this._executeActions(rule, event);

                // Track execution
                    run_count: (rule.run_count || 0) + 1,
                    last_run_at: new Date().toISOString(),
                });

                auditLogger.log({
                    actor: 'automation@serviceflow.app',
                    actorRole: 'automation',
                    action: `automation.rule_fired:${rule.name}`,
                    resourceType: 'AutomationRule',
                    resourceId: rule.id,
                    metadata: { trigger: event.type, payload_id: event.payload?.id },
                    severity: 'info',
                    tags: ['automation'],
                });
            } catch (e) {
                console.error(`[AutomationEngine] Rule "${rule.name}" failed:`, e);
                auditLogger.log({
                    actor: 'automation@serviceflow.app',
                    actorRole: 'automation',
                    action: `automation.rule_error:${rule.name}`,
                    resourceType: 'AutomationRule',
                    resourceId: rule.id,
                    metadata: { error: e.message, trigger: event.type },
                    severity: 'error',
                    tags: ['automation', 'error'],
                });
            }
        }
    }

    async _executeActions(rule, event) {
        for (const action of (rule.actions || [])) {
            await this._executeAction(action, rule, event);
        }
    }

    async _executeAction(action, rule, event) {
        const payload = event.payload;
        const cfg = action.config || {};

        switch (action.type) {
            case 'send_notification':
                await notificationService.notify({
                    recipientEmail: this._resolveTemplate(cfg.recipient_email || '', payload),
                    recipientRole: cfg.recipient_role || 'customer',
                    type: 'automation_triggered',
                    title: this._resolveTemplate(cfg.title || rule.name, payload),
                    body: this._resolveTemplate(cfg.body || '', payload),
                    actionUrl: cfg.action_url || null,
                    resourceType: payload.resource_type || 'Booking',
                    resourceId: payload.id,
                    source: 'automation',
                    priority: cfg.priority || 'normal',
                });
                break;

            case 'send_email':
                    to: this._resolveTemplate(cfg.to || payload.customer_email || '', payload),
                    subject: this._resolveTemplate(cfg.subject || rule.name, payload),
                    body: this._resolveTemplate(cfg.body || '', payload),
                });
                break;

            case 'update_booking_status':
                if (payload.id && cfg.status) {
                }
                break;

            case 'update_provider_status':
                if (payload.id && cfg.status) {
                }
                break;

            case 'log_event':
                auditLogger.logSystemEvent({
                    action: `automation.custom_log:${cfg.message || rule.name}`,
                    resourceType: payload.resource_type || 'System',
                    resourceId: payload.id,
                    metadata: { rule_name: rule.name, event_type: event.type },
                });
                break;

            default:
                console.warn(`[AutomationEngine] Unknown action type: ${action.type}`);
        }
    }

    /**
     * Simple template engine — resolves {{field}} placeholders from payload.
     */
    _resolveTemplate(template, payload) {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => payload?.[key] ?? `{{${key}}}`);
    }

    /**
     * Seed default automation rules for a fresh platform install.
     */
    async seedDefaultRules() {
        if (existing.length > 0) return; // already seeded

        const defaults = [
            {
                name: 'Notify customer on booking confirmation',
                description: 'Sends a notification when provider confirms a booking',
                trigger_event: 'booking.confirmed',
                is_active: true,
                priority: 100,
                conditions: [],
                actions: [{
                    type: 'send_notification',
                    config: {
                        recipient_email: '{{customer_email}}',
                        recipient_role: 'customer',
                        title: 'Your booking is confirmed ✅',
                        body: 'Your booking for {{service_name}} with {{provider_name}} on {{date}} at {{time_slot}} is confirmed.',
                        action_url: '/dashboard',
                        priority: 'high',
                    },
                }],
            },
            {
                name: 'Notify customer on booking cancellation',
                description: 'Sends a notification when a booking is cancelled',
                trigger_event: 'booking.cancelled',
                is_active: true,
                priority: 100,
                conditions: [],
                actions: [{
                    type: 'send_notification',
                    config: {
                        recipient_email: '{{customer_email}}',
                        recipient_role: 'customer',
                        title: 'Booking cancelled',
                        body: 'Your booking for {{service_name}} has been cancelled.',
                        action_url: '/dashboard',
                        priority: 'high',
                    },
                }],
            },
            {
                name: 'Notify provider on new booking',
                description: 'Alerts provider when they receive a new booking',
                trigger_event: 'booking.created',
                is_active: true,
                priority: 90,
                conditions: [],
                actions: [{
                    type: 'log_event',
                    config: { message: 'New booking received by provider' },
                }],
            },
            {
                name: 'Alert admin on high-value booking',
                description: 'Flags bookings over $500 for admin review',
                trigger_event: 'booking.created',
                is_active: true,
                priority: 80,
                conditions: [{ field: 'price', operator: 'gte', value: 500 }],
                actions: [{
                    type: 'send_notification',
                    config: {
                        recipient_email: 'admin@serviceflow.app',
                        recipient_role: 'admin',
                        title: 'High-value booking 💰',
                        body: 'A booking for ${{price}} was just created for {{service_name}}.',
                        priority: 'high',
                    },
                }],
            },
        ];

    }
}

export const automationEngine = new AutomationEngine();