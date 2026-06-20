/**
 * ServiceFlow Customer Memory Service
 * 
 * Builds and maintains a persistent memory profile for each customer.
 * This enables personalization, risk assessment, loyalty programs, and AI recommendations.
 */

import { computeLoyaltyTier, computeRiskScore } from './utils';

class CustomerMemoryService {
    /**
     * Get or create the memory profile for a customer.
     */
    async getOrCreate(customerEmail) {
        if (existing.length > 0) return existing[0];
    }

    /**
     * Rebuild the full memory profile from scratch based on booking history.
     * Call this after significant events (booking completed, cancelled, review left, etc.)
     */
    async rebuild(customerEmail) {
        const [bookings, reviews, memory] = await Promise.all([
            this.getOrCreate(customerEmail),
        ]);

        const completed = bookings.filter(b => b.status === 'completed');
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        const noShows = bookings.filter(b => b.status === 'no_show');
        const totalSpent = completed.reduce((s, b) => s + (b.price || 0), 0);

        // Find preferred providers (most booked)
        const providerCount = {};
        for (const b of completed) {
            providerCount[b.provider_id] = (providerCount[b.provider_id] || 0) + 1;
        }
        const preferredProviders = Object.entries(providerCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);

        // Find preferred time slots
        const slotCount = {};
        for (const b of bookings) {
            if (b.time_slot) slotCount[b.time_slot] = (slotCount[b.time_slot] || 0) + 1;
        }
        const preferredSlots = Object.entries(slotCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([slot]) => slot);

        const avgRating = reviews.length > 0
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            : null;

        const lastBooking = bookings.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

        const updates = {
            booking_count: bookings.length,
            cancellation_count: cancelled.length,
            total_spent: totalSpent,
            lifetime_value: totalSpent,
            average_rating_given: avgRating,
            preferred_providers: preferredProviders,
            preferred_time_slots: preferredSlots,
            loyalty_tier: computeLoyaltyTier(completed.length, totalSpent),
            risk_score: computeRiskScore(bookings.length, cancelled.length, noShows.length),
            last_booking_at: lastBooking?.date || null,
        };

    }

    /**
     * Get AI-powered recommendations for a customer based on their memory.
     */
    async getRecommendations(customerEmail) {
        const memory = await this.getOrCreate(customerEmail);
            { customer_email: customerEmail },
            '-created_date',
            20
        );

        const prompt = `
You are a recommendation engine for ServiceFlow, a local service marketplace.

Customer profile:
- Loyalty tier: ${memory.loyalty_tier}
- Total bookings: ${memory.booking_count}
- Total spent: $${memory.total_spent}
- Risk score: ${memory.risk_score}/100 (cancellation likelihood)
- Recent services: ${recentBookings.slice(0, 5).map(b => b.service_name).filter(Boolean).join(', ')}
- Preferred time slots: ${(memory.preferred_time_slots || []).join(', ')}

Generate 3 personalized service recommendations. Each recommendation should have:
- category: the service category slug
- reason: a short, friendly explanation why this suits this customer
- urgency: "low", "medium", or "high"
`;

            prompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    recommendations: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                category: { type: 'string' },
                                reason: { type: 'string' },
                                urgency: { type: 'string' },
                            },
                        },
                    },
                },
            },
        });
    }
}

export const customerMemoryService = new CustomerMemoryService();