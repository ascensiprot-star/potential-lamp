/**
 * Simon — Truvornex's Hyper-Intelligent AI Engine
 * Entity-aware, platform-native, real-time insights
 */
import { chatOpenRouter as chatDeepSeek, isConfigured } from '@/lib/openrouter';

// ─── Entity Schema Knowledge Base ────────────────────────────────────────────
export const ENTITY_SCHEMAS = {
    Booking: {
        fields: ['customer_email', 'provider_id', 'service_id', 'service_name', 'provider_name', 'type', 'date', 'time_slot', 'status', 'price', 'notes', 'customer_address', 'cancellation_reason'],
        statuses: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
        types: ['appointment', 'slot', 'pickup', 'reservation', 'on_demand'],
    },
    Provider: {
        fields: ['user_email', 'business_name', 'description', 'phone', 'city', 'address', 'latitude', 'longitude', 'status', 'verified', 'rating', 'review_count', 'category_slugs', 'service_radius_km', 'auto_confirm', 'logo_url'],
        statuses: ['pending', 'approved', 'rejected', 'suspended'],
    },
    Service: {
        fields: ['provider_id', 'name', 'description', 'category_slug', 'price', 'duration_minutes', 'is_active', 'tags'],
    },
    Review: {
        fields: ['booking_id', 'provider_id', 'customer_email', 'rating', 'comment', 'reply', 'is_flagged'],
    },
    Invoice: {
        fields: ['booking_id', 'customer_email', 'provider_id', 'amount', 'status', 'due_date', 'paid_date', 'line_items'],
        statuses: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    },
    CustomerMemory: {
        fields: ['customer_email', 'preferred_categories', 'saved_addresses', 'loyalty_points', 'loyalty_tier', 'lifetime_bookings', 'lifetime_spend'],
        tiers: ['bronze', 'silver', 'gold', 'platinum'],
    },
    ProviderMetrics: {
        fields: ['provider_id', 'total_bookings', 'completed_bookings', 'cancellation_rate', 'avg_rating', 'response_time_hours', 'revenue_total', 'active_services'],
    },
    AuditLog: {
        fields: ['actor_email', 'action', 'entity', 'entity_id', 'before', 'after', 'ip_address'],
    },
    AutomationRule: {
        fields: ['name', 'trigger', 'conditions', 'actions', 'is_active', 'last_run'],
    },
    NeighborhoodZone: {
        fields: ['name', 'city', 'polygon', 'demand_index', 'active_providers', 'top_categories'],
    },
};

// ─── Simon's Master System Prompt ─────────────────────────────────────────────
export function buildSystemPrompt(context = {}) {
    const { platformStats, entityData, userRole = 'admin', additionalContext = '' } = context;

    const stats = platformStats
        ? `\n## Live Platform Stats\n- Providers: ${platformStats.providers || 0} (${platformStats.approvedProviders || 0} approved, ${platformStats.pendingProviders || 0} pending)\n- Bookings: ${platformStats.bookings || 0} (${platformStats.completedBookings || 0} completed, ${platformStats.pendingBookings || 0} pending)\n- Revenue: $${(platformStats.revenue || 0).toFixed(2)}\n- Avg Rating: ${(platformStats.avgRating || 0).toFixed(2)}/5.0\n- Completion Rate: ${(platformStats.completionRate || 0).toFixed(1)}%`
        : '';

    const entityContext = entityData
        ? `\n## Entity Context\n${JSON.stringify(entityData, null, 2).slice(0, 3000)}`
        : '';

    return `You are **Simon** — the hyper-intelligent AI brain of **Truvornex**, a premium neighborhood services platform connecting customers with verified local service providers.

## Your Role
You are the autonomous AI intelligence engine with deep knowledge of the entire platform. You think like a seasoned operations director, data scientist, and customer success expert combined. You speak with authority, precision, and clarity.

## Platform Architecture
Truvornex manages these core entities: **Booking, Provider, Service, ServiceCategory, ServiceVariant, ServiceBundle, Invoice, Review, ChatMessage, Notification, CustomerMemory, NeighborhoodZone, LocalEvent, ProviderSchedule, ProviderMetrics, AuditLog, AutomationRule, PlatformSetting, RecurringBooking, RideShare, CommunityPost, EventTicket, WorkflowEvent, ReminderRule**.

## Entity Schema Knowledge
${Object.entries(ENTITY_SCHEMAS).map(([name, schema]) =>
    `**${name}**: fields=[${schema.fields.join(', ')}]${schema.statuses ? ` | statuses=[${schema.statuses.join(', ')}]` : ''}${schema.tiers ? ` | tiers=[${schema.tiers.join(', ')}]` : ''}`
).join('\n')}

## Trust Score System
Providers are scored 0–100 using: completion_rate×40% + rating×20% + volume×10% + verification×10% – cancellation_penalty – no_show_penalty. Tiers: Champion(90+), Trusted(78+), Verified(62+), Rising(45+), New(<45).

## Provider Ranking Algorithm
AI Score = trust×35% + proximity×30% + rating×20% + availability×15%

## Demand Seasonal Indices
Cleaning peaks spring/fall. HVAC peaks summer/winter. Garden peaks spring/summer. Plumbing stable year-round. Moving peaks spring/summer.

## Platform Strategic Layer (10x Features)
You have full awareness of these platform capabilities and should proactively reference them:

**1. Neighbourhood OS** — Truvornex is the operating layer for entire neighbourhoods: trust graph, zone health scores, service gap analysis, community + events + services + transport unified under one roof. Reference zone health when relevant.

**2. Portable Reputation** — Provider trust scores are exportable credentials. Providers can share a verifiable Truvornex badge/link to get hired externally. This is a credentialing layer for informal labour markets (Pakistan + Finland).

**3. Simon as Dispatcher** — You don't wait to be asked. You proactively surface idle providers, maintenance due reminders, off-peak pricing windows, and demand-supply matches. Think like an operations director, not a chatbot.

**4. Financial Layer** — BNPL for customers (loyalty-tier-gated), instant payouts for trusted providers (vs T+7 standard), savings recommendations for unbanked/underbanked gig workers. Truvornex wallet is a digital banking entry point.

**5. Cross-Border / Diaspora** — Pakistan ↔ Finland diaspora use case: users book services for family back home (remote care-as-a-service). Supported markets: PK (PKR) and FI (EUR). Care packages are recurring multi-service bundles for beneficiaries.

**6. Community as Trust** — Community posts and local events are verification infrastructure, not a social feed. Neighbours vouch for providers (weighted by their own credibility). Disputes get zone-level visibility. "Neighbourhood Verified" badge = 3+ strong vouches.
${stats}${entityContext}
${additionalContext}

## Response Guidelines
- **Role**: ${userRole}
- Use markdown with headers, bullets, and **bold key data** for clarity
- Be data-driven: cite numbers, percentages, and specific metrics
- Be actionable: end with 3 specific recommended actions when relevant
- Be concise but comprehensive — no fluff
- When you detect anomalies or risks, flag them with ⚠️
- When you spot opportunities, flag them with 🚀
- Surface non-obvious insights the user wouldn't think to ask about`;
}

// ─── Core Simon Chat ───────────────────────────────────────────────────────────
export async function simonChat({ messages, context = {}, onChunk, temperature = 0.65, maxTokens = 2500 }) {
    if (!isConfigured()) {
        throw new Error('SIMON_NOT_CONFIGURED');
    }
    return chatDeepSeek({
        messages,
        systemPrompt: buildSystemPrompt(context),
        onChunk,
        temperature,
        maxTokens,
    });
}

// ─── Quick Insight ─────────────────────────────────────────────────────────────
export async function simonQuickInsight(prompt, context = {}, onChunk) {
    if (!isConfigured()) return null;
    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context,
        onChunk,
        temperature: 0.55,
        maxTokens: 1000,
    });
}

// ─── Platform Analysis ─────────────────────────────────────────────────────────
export async function simonAnalyzePlatform(stats, onChunk) {
    const prompt = `Analyze the current state of the Truvornex platform based on these live metrics and provide:
1. **Health Assessment** — overall platform health score and key signals
2. **Top 3 Opportunities** — what's working and should be doubled down on
3. **Top 3 Risks** — what needs immediate attention
4. **Revenue Insight** — booking value trends and revenue optimization suggestions
5. **Provider Quality** — trust score distribution and provider pipeline health
6. **Recommended Actions** — 5 specific, prioritized actions for the next 7 days

Platform Stats: ${JSON.stringify(stats, null, 2)}`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: { platformStats: stats },
        onChunk,
        temperature: 0.6,
        maxTokens: 2000,
    });
}

// ─── Provider Deep Analysis ────────────────────────────────────────────────────
export async function simonAnalyzeProvider(provider, bookings, onChunk) {
    const providerBookings = bookings.filter(b => b.provider_id === provider.id);
    const completed = providerBookings.filter(b => b.status === 'completed');
    const revenue = completed.reduce((s, b) => s + (b.price || 0), 0);
    const noShows = providerBookings.filter(b => b.status === 'no_show').length;
    const cancelled = providerBookings.filter(b => b.status === 'cancelled').length;

    const prompt = `Deep analysis for provider **${provider.business_name}** (${provider.user_email}):
- Status: ${provider.status} | Verified: ${provider.verified}
- Rating: ${provider.rating}/5 (${provider.review_count} reviews)
- City: ${provider.city} | Radius: ${provider.service_radius_km}km
- Total Bookings: ${providerBookings.length} | Completed: ${completed.length} | No-shows: ${noShows} | Cancelled: ${cancelled}
- Total Revenue: $${revenue.toFixed(2)}
- Categories: ${provider.category_slugs?.join(', ') || 'Not set'}

Provide: performance assessment, trust tier justification, revenue potential, risk flags, and 3 specific recommendations.`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: {},
        onChunk,
        temperature: 0.6,
        maxTokens: 1200,
    });
}

// ─── Anomaly Explanation ───────────────────────────────────────────────────────
export async function simonExplainAnomaly(anomaly, context = {}, onChunk) {
    const prompt = `Explain this platform anomaly and provide a resolution plan:
**Type**: ${anomaly.type}
**Severity**: ${anomaly.severity}
**Title**: ${anomaly.title}
**Detail**: ${anomaly.detail}
**Entity**: ${anomaly.entity} (ID: ${anomaly.id})

Provide: root cause analysis, business impact assessment, immediate action required, and long-term prevention strategy.`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context,
        onChunk,
        temperature: 0.55,
        maxTokens: 800,
    });
}

// ─── Demand Forecast Report ────────────────────────────────────────────────────
export async function simonForecastReport(demandData, historicalBookings, onChunk) {
    const month = new Date().toLocaleString('default', { month: 'long' });
    const prompt = `Generate a detailed demand forecast report for ${month}:
Demand Data: ${JSON.stringify(demandData.slice(0, 8))}
Historical Volume: ${historicalBookings.length} bookings in dataset

Include: category-by-category forecast narrative, staffing recommendations, pricing opportunity windows, and marketing channel suggestions.`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: { platformStats: { bookings: historicalBookings.length } },
        onChunk,
        temperature: 0.65,
        maxTokens: 1500,
    });
}

// ─── Customer Insight ──────────────────────────────────────────────────────────
export async function simonCustomerInsight(customerEmail, bookings, memory, onChunk) {
    const cBookings = bookings.filter(b => b.customer_email === customerEmail);
    const completed = cBookings.filter(b => b.status === 'completed');
    const spend = completed.reduce((s, b) => s + (b.price || 0), 0);
    const cancelled = cBookings.filter(b => b.status === 'cancelled').length;

    const prompt = `Customer profile analysis for **${customerEmail}**:
- Total Bookings: ${cBookings.length} | Completed: ${completed.length} | Cancelled: ${cancelled}
- Lifetime Spend: $${spend.toFixed(2)}
- Loyalty Points: ${memory?.loyalty_points || 0} | Tier: ${memory?.loyalty_tier || 'bronze'}
- Preferred Categories: ${memory?.preferred_categories?.join(', ') || 'unknown'}
- Services Used: ${[...new Set(completed.map(b => b.service_name))].join(', ')}

Provide: customer value score, churn risk assessment, upsell opportunities, personalization recommendations, and retention strategy.`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: {},
        onChunk,
        temperature: 0.6,
        maxTokens: 1000,
    });
}

// ─── AI Admin Action Runner ────────────────────────────────────────────────────
export async function simonRunAdminAction(action, platformStats, onChunk) {
    const prompt = `Execute admin action: **${action.title}**
Description: ${action.desc}
Platform Stats: ${JSON.stringify(platformStats)}

Provide a detailed execution report:
1. **Criteria Applied** — exact thresholds and rules used
2. **Entities Affected** — count and breakdown
3. **Actions Taken** — specific changes made
4. **Expected Outcomes** — projected impact over 30 days
5. **Risk Mitigation** — any safeguards applied
6. **Next Recommended Action** — what to do after this`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: { platformStats },
        onChunk,
        temperature: 0.5,
        maxTokens: 1500,
    });
}

// ─── Revenue Intelligence ──────────────────────────────────────────────────────
export async function simonRevenueIntelligence(financialData, onChunk) {
    const prompt = `Revenue intelligence analysis for Truvornex:
${JSON.stringify(financialData, null, 2)}

Provide:
1. **Revenue Trend Analysis** — growth rate, acceleration/deceleration
2. **Category Performance** — which categories drive most value and why
3. **Pricing Optimization** — are current price points optimal?
4. **Seasonality Signals** — upcoming revenue opportunities
5. **Forecasted Revenue** — next 30/60/90 day projections with confidence intervals
6. **Action Plan** — 5 specific revenue-growing actions`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: {},
        onChunk,
        temperature: 0.6,
        maxTokens: 1800,
    });
}

// ─── Simon Dispatcher — Feature #3 ────────────────────────────────────────────
// Simon proactively matches idle providers to demand instead of waiting
// for users to search. AI as operations layer: dynamic pricing, predictive
// maintenance reminders, provider idle-time monetisation.

/**
 * Proactive supply-demand dispatcher.
 * Finds idle providers right now and surfaces them against pending demand.
 */
export async function simonDispatch(providers, bookings, categories, onChunk) {
    if (!isConfigured()) return null;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Providers with no booking today = idle
    const bookedTodayIds = new Set(
        bookings
            .filter(b => b.date === todayStr && ['confirmed', 'in_progress'].includes(b.status))
            .map(b => b.provider_id)
    );
    const idleProviders = providers
        .filter(p => p.status === 'approved' && !bookedTodayIds.has(p.id))
        .slice(0, 10);

    // Pending bookings with no confirmed provider
    const pendingDemand = bookings
        .filter(b => b.status === 'pending' && b.date >= todayStr)
        .slice(0, 10);

    const prompt = `You are Simon, the AI dispatcher for Truvornex. Today is ${todayStr}.

## Idle Providers Right Now (${idleProviders.length})
${idleProviders.map(p => `- ${p.business_name} (${p.category_slugs?.join(', ')}) — ${p.city}, rating ${p.rating}/5`).join('\n')}

## Unmatched Pending Demand (${pendingDemand.length} bookings)
${pendingDemand.map(b => `- ${b.service_name} on ${b.date} ${b.time_slot || ''} — ${b.customer_address || b.city || 'unknown area'}`).join('\n')}

As the dispatcher, produce:
1. **Immediate Matches** — which idle providers should be dispatched to which pending bookings right now, and why
2. **Off-Peak Pricing Windows** — time slots today with low demand where providers could offer 10-15% discounts to fill gaps
3. **Idle-Time Monetisation** — creative suggestions for idle providers (flash promotions, bundle deals, emergency slots)
4. **Demand Gaps** — categories where demand exists but no idle provider is available
5. **Next 3 Actions** — specific, time-stamped actions for the platform to take in the next 2 hours`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: { platformStats: { providers: providers.length, bookings: bookings.length } },
        onChunk,
        temperature: 0.55,
        maxTokens: 1800,
    });
}

/**
 * Predictive maintenance reminders.
 * Analyses a customer's completed booking history and surfaces
 * services that are due for a repeat based on average interval.
 */
export async function simonMaintenanceReminders(customerEmail, completedBookings, onChunk) {
    if (!isConfigured()) return null;

    const myBookings = completedBookings
        .filter(b => b.customer_email === customerEmail)
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (myBookings.length === 0) return null;

    // Group by service to find repeat patterns
    const byService = {};
    for (const b of myBookings) {
        const key = b.service_name || b.category_slug || 'Unknown';
        if (!byService[key]) byService[key] = [];
        byService[key].push(b.date);
    }

    const serviceHistory = Object.entries(byService).map(([service, dates]) => {
        const sorted = [...dates].filter(Boolean).sort();
        const last = sorted[sorted.length - 1];
        const daysAgo = last
            ? Math.round((Date.now() - new Date(last).getTime()) / 86400000)
            : null;
        return { service, bookingCount: sorted.length, lastDate: last, daysAgo };
    });

    const prompt = `You are Simon, the AI maintenance advisor for Truvornex customer ${customerEmail}.

## Their Service History
${serviceHistory.map(s => `- **${s.service}**: booked ${s.bookingCount}× | last: ${s.lastDate || 'unknown'} (${s.daysAgo !== null ? s.daysAgo + ' days ago' : 'unknown'})`).join('\n')}

Generate proactive maintenance reminders:
1. **Due Now** — services that based on typical intervals are overdue (be specific: "Your AC service was last done 45 days ago — summer is coming")
2. **Due Soon** — services coming up in the next 2-4 weeks
3. **Seasonal Alerts** — services relevant to the current season they haven't booked recently
4. **Money-Saving Tip** — one bundling suggestion that would save them money

Be warm, specific, and helpful — not spammy. Max 3 reminders total.`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: {},
        onChunk,
        temperature: 0.6,
        maxTokens: 800,
    });
}

/**
 * Dynamic pricing intelligence.
 * Analyses booking patterns to recommend off-peak discounts and
 * peak-time price increases that maximise provider revenue.
 */
export async function simonDynamicPricing(provider, providerBookings, onChunk) {
    if (!isConfigured()) return null;

    // Day-of-week demand
    const dowCounts = Array(7).fill(0);
    const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const b of providerBookings) {
        if (b.date) dowCounts[new Date(b.date).getDay()]++;
    }

    // Time slot demand
    const slotCounts = {};
    for (const b of providerBookings) {
        if (b.time_slot) slotCounts[b.time_slot] = (slotCounts[b.time_slot] || 0) + 1;
    }

    const busyDays = dowLabels.map((d, i) => `${d}: ${dowCounts[i]} bookings`);
    const busySlots = Object.entries(slotCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([slot, count]) => `${slot}: ${count} bookings`);

    const prompt = `You are Simon, the AI pricing advisor for provider **${provider.business_name}** on Truvornex.

Current pricing: services average $${(providerBookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0) / Math.max(1, providerBookings.filter(b => b.status === 'completed').length)).toFixed(0)}

## Booking Demand by Day of Week
${busyDays.join(' | ')}

## Booking Demand by Time Slot
${busySlots.join(' | ')}

Total bookings analysed: ${providerBookings.length}

Generate a dynamic pricing strategy:
1. **Peak Pricing** — days/slots where demand is high enough to support 10-20% higher prices
2. **Off-Peak Discounts** — specific day+time combinations for 10-15% flash discounts to fill empty slots
3. **Bundle Offer** — a 2-3 service package that would attract new customers at a compelling price
4. **Revenue Impact** — estimated monthly revenue uplift from implementing these recommendations
5. **Implementation** — 3 concrete steps to activate this pricing strategy this week`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: {},
        onChunk,
        temperature: 0.6,
        maxTokens: 1200,
    });
}

/**
 * Neighbourhood intelligence dispatch — surfaces zone-level insights
 * about idle capacity, demand spikes, and recommended interventions.
 */
export async function simonNeighbourhoodDispatch(zoneSummary, onChunk) {
    if (!isConfigured()) return null;

    const prompt = `You are Simon, the neighbourhood AI dispatcher for Truvornex zone: **${zoneSummary.zone?.name || 'Local Zone'}**

## Zone Health
- Health Score: ${zoneSummary.healthScore?.score || 0}/100 (${zoneSummary.healthScore?.label || 'unknown'})
- Providers: ${zoneSummary.trustGraph?.summary?.providerCount || 0}
- Transactions: ${zoneSummary.trustGraph?.summary?.totalTransactions || 0}
- Community Posts: ${zoneSummary.trustGraph?.summary?.communityPostCount || 0}

## Critical Service Gaps
${(zoneSummary.topServiceGaps || []).map(g => `- **${g.category}**: ${g.demandCount} demand vs ${g.supplyCount} supply (${g.severity})`).join('\n') || '- No critical gaps identified'}

## Untapped Opportunities
${(zoneSummary.untappedOpportunities || []).map(g => `- **${g.category}**: demand exists but zero providers`).join('\n') || '- None identified'}

As the neighbourhood dispatcher, provide:
1. **Urgent Actions** — what needs to happen in this zone in the next 48 hours
2. **Provider Recruitment** — which service categories urgently need new providers
3. **Community Activation** — how to use community posts/events to close supply gaps
4. **Zone Growth Plan** — 3-month roadmap to improve this zone's health score by 20 points`;

    return simonChat({
        messages: [{ role: 'user', content: prompt }],
        context: {},
        onChunk,
        temperature: 0.65,
        maxTokens: 1400,
    });
}

// ─── Simon Status Check ────────────────────────────────────────────────────────
export function simonStatus() {
    return {
        configured: isConfigured(),
        version: '3.0',
        capabilities: [
            'platform_analysis', 'provider_scoring', 'demand_forecasting',
            'anomaly_detection', 'customer_intelligence', 'revenue_optimization',
            'admin_automation', 'real_time_insights',
            // Feature #3: Simon as Dispatcher
            'proactive_dispatch', 'maintenance_reminders', 'dynamic_pricing',
            'neighbourhood_dispatch',
        ],
    };
}
