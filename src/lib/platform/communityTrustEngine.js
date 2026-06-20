/**
 * Community Trust Engine — Feature #6
 *
 * Makes the community layer the trust infrastructure, not a social feed.
 * Neighbors vouch for providers, disputes get neighborhood visibility,
 * and community signals compound the provider's trust score.
 */

import { supabase } from '@/api/supabaseClient';

// ─── Vouching System ──────────────────────────────────────────────────────────

/**
 * Creates a neighbor vouch for a provider.
 * A vouch is a community-verified endorsement from someone who has
 * direct personal knowledge of the provider's work.
 *
 * @param {string} neighborEmail - the person vouching
 * @param {string} providerId - provider being vouched for
 * @param {string} statement - what the neighbor is vouching about
 * @param {string[]} categories - categories they're vouching the provider for
 */
export async function vouchForProvider(neighborEmail, providerId, statement, categories = []) {
    const vouch = {
        neighbor_email: neighborEmail,
        provider_id: providerId,
        statement: statement.slice(0, 500),
        categories,
        created_at: new Date().toISOString(),
        verified: false,
        weight: 0,
    };

    const { data, error } = await supabase
        .from('provider_vouches')
        .upsert([vouch], { onConflict: 'neighbor_email,provider_id' })
        .select()
        .single();

    if (error) {
        console.error('[CommunityTrust] Vouch error:', error);
        return { success: false, error: error.message };
    }

    return { success: true, vouch: data };
}

/**
 * Fetches all vouches for a provider.
 */
export async function getProviderVouches(providerId) {
    const { data, error } = await supabase
        .from('provider_vouches')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}

// ─── Vouch Weight Calculation ─────────────────────────────────────────────────

/**
 * Weights a neighbor's vouch by their own platform credibility.
 * A neighbor who has completed 10+ bookings has a stronger vouch than a newcomer.
 *
 * Weight factors:
 *   - booking history quality (40%)
 *   - review giving history (30%)
 *   - time on platform (20%)
 *   - own trust/loyalty tier (10%)
 */
export function computeVouchWeight(neighborEmail, allBookings, allReviews) {
    const myBookings = allBookings.filter(b => b.customer_email === neighborEmail);
    const myCompleted = myBookings.filter(b => b.status === 'completed');
    const myReviews = allReviews.filter(r => r.customer_email === neighborEmail);

    const completionScore = Math.min(myCompleted.length / 10, 1) * 40;
    const reviewScore = Math.min(myReviews.length / 5, 1) * 30;

    const earliestBooking = myBookings
        .map(b => b.date)
        .filter(Boolean)
        .sort()[0];
    const daysOnPlatform = earliestBooking
        ? Math.round((Date.now() - new Date(earliestBooking).getTime()) / 86400000)
        : 0;
    const tenureScore = Math.min(daysOnPlatform / 365, 1) * 20;

    const totalBookings = myBookings.length;
    const loyaltyScore = totalBookings >= 20 ? 10 : totalBookings >= 10 ? 7 : totalBookings >= 3 ? 4 : 1;

    const weight = Math.round(completionScore + reviewScore + tenureScore + loyaltyScore);

    return {
        weight,
        tier: weight >= 80 ? 'strong' : weight >= 50 ? 'moderate' : weight >= 20 ? 'light' : 'minimal',
        factors: {
            bookingHistory: Math.round(completionScore),
            reviewHistory: Math.round(reviewScore),
            tenure: Math.round(tenureScore),
            loyalty: loyaltyScore,
        },
        completedBookings: myCompleted.length,
        reviewsGiven: myReviews.length,
        daysOnPlatform,
    };
}

// ─── Community Trust Boost ────────────────────────────────────────────────────

/**
 * Computes the trust score boost a provider receives from community vouches.
 * Strong vouches from credible neighbors can add up to +12 points to the trust score.
 */
export function computeCommunityTrustBoost(vouches, allBookings, allReviews) {
    if (!vouches || vouches.length === 0) return { boost: 0, vouchCount: 0, breakdown: [] };

    let totalWeight = 0;
    const breakdown = [];

    for (const vouch of vouches) {
        const weightData = computeVouchWeight(vouch.neighbor_email, allBookings, allReviews);
        totalWeight += weightData.weight;
        breakdown.push({
            neighbor: vouch.neighbor_email,
            vouchWeight: weightData.weight,
            tier: weightData.tier,
            statement: vouch.statement,
        });
    }

    const avgWeight = vouches.length > 0 ? totalWeight / vouches.length : 0;
    const vouchCountBonus = Math.min(vouches.length * 0.5, 4);
    const boost = Math.min(12, Math.round((avgWeight / 100) * 8 + vouchCountBonus));

    return {
        boost,
        vouchCount: vouches.length,
        avgVouchWeight: Math.round(avgWeight),
        breakdown,
        label: boost >= 10 ? 'Neighborhood Favourite' : boost >= 6 ? 'Community Trusted' : boost >= 3 ? 'Locally Known' : 'No Community Signal',
    };
}

// ─── Dispute Visibility ───────────────────────────────────────────────────────

/**
 * Surfaces disputes to the neighborhood zone for visibility.
 * Disputes that are severe (provider misconduct, fraud) get zone-level
 * visibility so other users in the zone are informed.
 */
export function computeDisputeNeighborhoodVisibility(disputes, providers, zoneCity) {
    const visible = [];

    for (const dispute of disputes) {
        const provider = providers.find(p => p.id === dispute.provider_id);
        if (!provider) continue;

        const isInZone = provider.city?.toLowerCase().includes(zoneCity?.toLowerCase());
        const isSevere = dispute.severity === 'high' || dispute.type === 'fraud' || dispute.type === 'no_show';

        if (isInZone && isSevere) {
            visible.push({
                disputeId: dispute.id,
                providerName: provider.business_name,
                providerCity: provider.city,
                type: dispute.type,
                severity: dispute.severity,
                summary: sanitizeDisputeSummary(dispute.description),
                reportedAt: dispute.created_at,
                status: dispute.status,
                impactsZone: true,
            });
        }
    }

    return visible.sort((a, b) => (b.reportedAt || '').localeCompare(a.reportedAt || ''));
}

function sanitizeDisputeSummary(description) {
    if (!description) return 'Service quality concern reported.';
    return description.length > 120 ? description.slice(0, 120) + '…' : description;
}

// ─── Neighborhood Verification ────────────────────────────────────────────────

/**
 * A provider can request neighborhood-level verification.
 * Three or more neighbors with strong vouches trigger a "Neighborhood Verified" badge.
 */
export function computeNeighborhoodVerificationStatus(vouches, allBookings, allReviews) {
    const strongVouches = vouches.filter(v => {
        const w = computeVouchWeight(v.neighbor_email, allBookings, allReviews);
        return w.tier === 'strong' || w.tier === 'moderate';
    });

    const isNeighborhoodVerified = strongVouches.length >= 3;
    const progress = Math.min(strongVouches.length / 3, 1);

    return {
        isNeighborhoodVerified,
        strongVouchCount: strongVouches.length,
        requiredVouches: 3,
        progressPercent: Math.round(progress * 100),
        badge: isNeighborhoodVerified
            ? { label: 'Neighbourhood Verified', color: '#10b981', emoji: '🏘️' }
            : null,
        message: isNeighborhoodVerified
            ? 'This provider is endorsed by verified neighbours in your zone.'
            : `${3 - strongVouches.length} more strong neighbour vouch${3 - strongVouches.length !== 1 ? 'es' : ''} needed for Neighbourhood Verified status.`,
    };
}

// ─── Community Event × Provider Co-hosting ────────────────────────────────────

/**
 * Identifies providers who have co-hosted local events — an additional
 * trust signal that shows community integration beyond transactions.
 */
export function getProviderCommunityEngagement(providerId, events, communityPosts) {
    const coHostedEvents = (events || []).filter(ev =>
        ev.organizer_provider_id === providerId ||
        ev.sponsor_provider_ids?.includes(providerId)
    );

    const communityMentions = (communityPosts || []).filter(post =>
        post.content?.toLowerCase().includes(providerId) ||
        post.tagged_provider_ids?.includes(providerId)
    );

    const engagementScore = Math.min(100,
        coHostedEvents.length * 15 +
        communityMentions.length * 5
    );

    return {
        coHostedEvents: coHostedEvents.length,
        communityMentions: communityMentions.length,
        engagementScore,
        level: engagementScore >= 60 ? 'deeply_engaged' :
            engagementScore >= 30 ? 'active' :
                engagementScore >= 10 ? 'present' : 'absent',
        recentEvents: coHostedEvents.slice(0, 3).map(ev => ({ title: ev.title, date: ev.date })),
    };
}

// ─── Zone Dispute Health ──────────────────────────────────────────────────────

/**
 * Summarises the dispute health of a zone — are disputes rising or falling?
 * Used by the NeighborhoodDashboard to show community safety signals.
 */
export function computeZoneDisputeHealth(disputes, providers, zoneCity) {
    const visible = computeDisputeNeighborhoodVisibility(disputes, providers, zoneCity);
    const last30Days = visible.filter(d => {
        const days = (Date.now() - new Date(d.reportedAt).getTime()) / 86400000;
        return days <= 30;
    });
    const last60Days = visible.filter(d => {
        const days = (Date.now() - new Date(d.reportedAt).getTime()) / 86400000;
        return days <= 60;
    });
    const prev30 = last60Days.length - last30Days.length;

    const trend = last30Days.length > prev30 ? 'worsening' :
        last30Days.length < prev30 ? 'improving' : 'stable';

    return {
        totalDisputes: visible.length,
        last30Days: last30Days.length,
        trend,
        highSeverityCount: visible.filter(d => d.severity === 'high').length,
        healthLabel: visible.length === 0 ? 'excellent' :
            last30Days.length === 0 ? 'good' :
                last30Days.length <= 2 ? 'fair' : 'poor',
    };
}
