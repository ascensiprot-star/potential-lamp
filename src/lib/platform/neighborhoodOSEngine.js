/**
 * Neighborhood OS Engine — Feature #1
 *
 * Transforms Truvornex from a booking app into a neighborhood operating system.
 * Weaves together NeighborhoodZone, CommunityPost, LocalEvent, RideShare,
 * Services, and Providers into a single unified trust graph per zone.
 */

// ─── Zone Trust Graph ─────────────────────────────────────────────────────────
/**
 * Builds a unified trust graph for a neighborhood zone.
 * Each node is a provider, customer, event, or community post.
 * Edges represent verified transactions, vouches, and co-participation.
 */
export function computeNeighborhoodTrustGraph(zone, providers, bookings, communityPosts, events) {
    const nodes = [];
    const edges = [];
    const zoneProviders = providers.filter(p =>
        p.city?.toLowerCase() === zone.city?.toLowerCase() ||
        zone.top_categories?.some(cat => p.category_slugs?.includes(cat))
    );

    // Provider nodes
    for (const p of zoneProviders) {
        const pBookings = bookings.filter(b => b.provider_id === p.id);
        const completed = pBookings.filter(b => b.status === 'completed');
        nodes.push({
            id: `provider_${p.id}`,
            type: 'provider',
            label: p.business_name,
            trustScore: p.rating ? Math.round((p.rating / 5) * 100) : 50,
            transactionCount: completed.length,
            verified: p.verified,
            categories: p.category_slugs || [],
        });

        // Customer edges (transaction graph)
        const customers = [...new Set(completed.map(b => b.customer_email))];
        for (const email of customers) {
            const txCount = completed.filter(b => b.customer_email === email).length;
            edges.push({
                from: `provider_${p.id}`,
                to: `customer_${email}`,
                type: 'transaction',
                weight: txCount,
            });
        }
    }

    // Community nodes (posts that mention or tag providers)
    for (const post of (communityPosts || []).slice(0, 50)) {
        nodes.push({
            id: `post_${post.id}`,
            type: 'community_post',
            label: post.title || post.content?.slice(0, 40),
            trustBoost: post.likes_count > 10 ? 5 : 0,
        });
    }

    // Event nodes
    for (const ev of (events || []).slice(0, 20)) {
        nodes.push({
            id: `event_${ev.id}`,
            type: 'event',
            label: ev.title,
            category: ev.category,
        });
    }

    const providerCount = zoneProviders.length;
    const totalTransactions = bookings.filter(b =>
        zoneProviders.some(p => p.id === b.provider_id)
    ).length;

    return {
        zone: zone.name,
        nodes,
        edges,
        summary: {
            providerCount,
            totalTransactions,
            communityPostCount: (communityPosts || []).length,
            eventCount: (events || []).length,
            trustDensity: providerCount > 0 ? Math.round(totalTransactions / providerCount) : 0,
        },
    };
}

// ─── Service Gap Analysis ─────────────────────────────────────────────────────
/**
 * Identifies unmet demand in a zone — categories where demand outpaces supply.
 */
export function findNeighborhoodServiceGaps(zone, providers, bookings, categories) {
    const month = new Date().getMonth();

    const demandByCategory = {};
    for (const b of bookings) {
        const slug = b.category_slug || b.service_name?.toLowerCase().split(' ')[0] || 'other';
        demandByCategory[slug] = (demandByCategory[slug] || 0) + 1;
    }

    const supplyByCategory = {};
    for (const p of providers) {
        for (const slug of (p.category_slugs || [])) {
            supplyByCategory[slug] = (supplyByCategory[slug] || 0) + 1;
        }
    }

    const gaps = categories.map(cat => {
        const demand = demandByCategory[cat.slug] || 0;
        const supply = supplyByCategory[cat.slug] || 0;
        const ratio = supply > 0 ? demand / supply : demand;
        const gapScore = Math.round(ratio * 10);
        return {
            category: cat.name,
            slug: cat.slug,
            demandCount: demand,
            supplyCount: supply,
            gapScore,
            severity: gapScore >= 15 ? 'critical' : gapScore >= 8 ? 'high' : gapScore >= 4 ? 'medium' : 'low',
            opportunity: supply === 0 && demand > 0 ? 'untapped' : gapScore >= 8 ? 'undersupplied' : 'balanced',
        };
    }).sort((a, b) => b.gapScore - a.gapScore);

    return gaps;
}

// ─── Zone Health Score ─────────────────────────────────────────────────────────
/**
 * Computes an overall health score (0-100) for a neighborhood zone.
 * Factors: provider density, completion rate, community activity, event count.
 */
export function computeZoneHealthScore(zone, providers, bookings, communityPosts, events) {
    const zoneProviders = providers.filter(p =>
        p.city?.toLowerCase() === zone.city?.toLowerCase()
    );
    const zoneBookings = bookings.filter(b =>
        zoneProviders.some(p => p.id === b.provider_id)
    );

    const providerDensityScore = Math.min(40, zoneProviders.length * 4);
    const completionRate = zoneBookings.length > 0
        ? zoneBookings.filter(b => b.status === 'completed').length / zoneBookings.length
        : 0;
    const completionScore = completionRate * 30;
    const communityScore = Math.min(15, (communityPosts || []).length * 1.5);
    const eventScore = Math.min(15, (events || []).length * 3);

    const total = Math.round(providerDensityScore + completionScore + communityScore + eventScore);

    return {
        score: Math.min(100, total),
        breakdown: {
            providerDensity: Math.round(providerDensityScore),
            serviceCompletion: Math.round(completionScore),
            communityActivity: Math.round(communityScore),
            localEvents: Math.round(eventScore),
        },
        label: total >= 75 ? 'thriving' : total >= 50 ? 'active' : total >= 25 ? 'developing' : 'nascent',
    };
}

// ─── Unified Zone Summary ─────────────────────────────────────────────────────
/**
 * Produces the full neighborhood OS summary for a zone —
 * trust graph, service gaps, health score, and active bundles.
 */
export function computeZoneSummary(zone, providers, bookings, communityPosts, events, categories) {
    const trustGraph = computeNeighborhoodTrustGraph(zone, providers, bookings, communityPosts, events);
    const serviceGaps = findNeighborhoodServiceGaps(zone, providers, bookings, categories);
    const healthScore = computeZoneHealthScore(zone, providers, bookings, communityPosts, events);

    const topGaps = serviceGaps.filter(g => g.severity === 'critical' || g.severity === 'high').slice(0, 3);
    const topOpportunities = serviceGaps.filter(g => g.opportunity === 'untapped').slice(0, 3);

    return {
        zone,
        trustGraph,
        healthScore,
        topServiceGaps: topGaps,
        untappedOpportunities: topOpportunities,
        allGaps: serviceGaps,
    };
}
