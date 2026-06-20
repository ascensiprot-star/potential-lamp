/**
 * ServiceFlow AI Engine
 * Real algorithms for matching, trust scoring, demand prediction,
 * anomaly detection, bundle clustering, and schedule optimization.
 */

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Trust Score Engine ───────────────────────────────────────────────────────
// Weighted multi-factor model:
//   completion history (40%), rating (20%), volume (10%),
//   verification (10%), penalties for cancellations/no-shows
//   + community trust boost from neighbour vouches (up to +12) — Feature #6
export function computeTrustScore(provider, allBookings, communityBoost = 0) {
    const pbs = allBookings.filter(b => b.provider_id === provider.id);
    const total = pbs.length;

    if (total === 0) {
        const baseScore = 50 + communityBoost;
        const s = Math.max(0, Math.min(100, Math.round(baseScore)));
        const tier = s >= 90 ? 'champion' : s >= 78 ? 'trusted' : s >= 62 ? 'verified' : s >= 45 ? 'rising' : 'new';
        return { score: s, tier, label: { champion: 'Champion', trusted: 'Trusted', verified: 'Verified', rising: 'Rising', new: 'New' }[tier], completionRate: 0, total: 0, communityBoost };
    }

    const completed = pbs.filter(b => b.status === 'completed').length;
    const cancelled = pbs.filter(b => b.status === 'cancelled').length;
    const noShows = pbs.filter(b => b.status === 'no_show').length;

    const completionRate = completed / total;
    const cancellationRate = cancelled / total;
    const noShowRate = noShows / total;

    let score = 50;
    score += completionRate * 30;                        // up to +30
    score += ((provider.rating || 3) / 5) * 20;         // up to +20
    score += provider.verified ? 8 : 0;
    score += Math.min(total / 20, 1) * 7;               // volume bonus up to +7
    score -= cancellationRate * 25;
    score -= noShowRate * 35;
    score += Math.min(communityBoost, 12);               // community vouch boost up to +12 (Feature #6)

    const s = Math.max(0, Math.min(100, Math.round(score)));
    const tier =
        s >= 90 ? 'champion' :
            s >= 78 ? 'trusted' :
                s >= 62 ? 'verified' :
                    s >= 45 ? 'rising' : 'new';

    return {
        score: s,
        tier,
        label: { champion: 'Champion', trusted: 'Trusted', verified: 'Verified', rising: 'Rising', new: 'New' }[tier],
        completionRate: Math.round(completionRate * 100),
        total,
        completed,
        cancelled,
        noShows,
        communityBoost,
    };
}

// ─── Provider Matching / Ranking ──────────────────────────────────────────────
// Composite weighted score:
//   trust (35%) + proximity (30%) + rating (20%) + availability (15%)
export function rankProviders(providers, allBookings, userLat, userLng, targetCategorySlug) {
    return providers
        .filter(p => !targetCategorySlug || p.category_slugs?.includes(targetCategorySlug))
        .map(p => {
            const trust = computeTrustScore(p, allBookings);

            let proximityScore = 50;
            if (userLat && userLng && p.latitude && p.longitude) {
                const km = haversine(userLat, userLng, p.latitude, p.longitude);
                const radius = Math.max(p.service_radius_km || 10, 1);
                proximityScore = Math.max(0, 100 - (km / radius) * 100);
            }

            const availScore = p.auto_confirm ? 85 : 65;
            const ratingScore = ((p.rating || 3.5) / 5) * 100;

            const aiScore = (
                trust.score * 0.35 +
                proximityScore * 0.30 +
                ratingScore * 0.20 +
                availScore * 0.15
            );

            return {
                ...p,
                aiScore: Math.round(aiScore),
                trustScore: trust.score,
                trustTier: trust.tier,
                trustLabel: trust.label,
                proximityScore: Math.round(proximityScore),
                completionRate: trust.completionRate,
                completedJobs: trust.completed,
            };
        })
        .sort((a, b) => b.aiScore - a.aiScore);
}

// ─── Demand Prediction (seasonal index × recent volume) ──────────────────────
const SEASONAL_INDEX = {
    cleaning: [0.85, 0.88, 1.05, 1.25, 1.15, 1.00, 0.95, 0.92, 1.00, 1.10, 0.90, 0.82],
    garden: [0.30, 0.40, 0.80, 1.40, 1.50, 1.20, 1.10, 1.05, 0.80, 0.60, 0.40, 0.30],
    hvac: [1.30, 1.20, 0.80, 0.60, 0.90, 1.50, 1.80, 1.65, 0.90, 0.70, 1.05, 1.40],
    plumbing: [1.20, 1.15, 1.00, 0.90, 0.90, 0.90, 0.88, 0.88, 0.95, 1.00, 1.10, 1.20],
    painting: [0.70, 0.72, 0.90, 1.20, 1.45, 1.30, 1.20, 1.10, 1.00, 0.82, 0.72, 0.68],
    electrical: [1.10, 1.05, 0.95, 0.90, 0.88, 0.90, 0.92, 0.90, 0.95, 1.00, 1.05, 1.10],
    pest: [0.60, 0.60, 0.80, 1.10, 1.40, 1.50, 1.45, 1.30, 1.10, 0.80, 0.65, 0.60],
    moving: [0.80, 0.85, 1.10, 1.30, 1.40, 1.20, 1.00, 0.95, 1.15, 1.10, 0.90, 0.80],
};

export function predictDemand(categories, bookings) {
    const month = new Date().getMonth();
    const counts = {};
    bookings.forEach(b => {
        const slug = b.category_slug || (b.service_name?.toLowerCase().split(' ')[0] || 'other');
        counts[slug] = (counts[slug] || 0) + 1;
    });

    return categories.map(cat => {
        const multiplier = SEASONAL_INDEX[cat.slug]?.[month] ?? 1.0;
        const base = counts[cat.slug] || 1;
        const forecast = Math.max(1, Math.round(base * multiplier));
        const demandLevel = multiplier >= 1.3 ? 'high' : multiplier >= 1.05 ? 'rising' : multiplier <= 0.75 ? 'low' : 'normal';
        return { ...cat, demandForecast: forecast, demandLevel, multiplier: Math.round(multiplier * 100) };
    }).sort((a, b) => b.demandForecast - a.demandForecast);
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────
export function detectAnomalies(bookings, providers) {
    const alerts = [];
    const now = new Date();

    // 1. High-cancellation users (≥3 bookings, >50% cancelled)
    const userStats = {};
    bookings.forEach(b => {
        if (!userStats[b.customer_email]) userStats[b.customer_email] = { total: 0, cancelled: 0, noShow: 0 };
        userStats[b.customer_email].total++;
        if (b.status === 'cancelled') userStats[b.customer_email].cancelled++;
        if (b.status === 'no_show') userStats[b.customer_email].noShow++;
    });
    Object.entries(userStats).forEach(([email, s]) => {
        if (s.total >= 3 && s.cancelled / s.total > 0.5)
            alerts.push({ type: 'high_cancel_user', severity: 'medium', title: 'High cancellation user', detail: `${email}: ${s.cancelled}/${s.total} cancellations`, entity: 'user', id: email });
    });

    // 2. Provider high no-show rate (≥3 bookings, >25% no-show)
    const providerStats = {};
    bookings.forEach(b => {
        if (!providerStats[b.provider_id]) providerStats[b.provider_id] = { total: 0, noShow: 0 };
        providerStats[b.provider_id].total++;
        if (b.status === 'no_show') providerStats[b.provider_id].noShow++;
    });
    Object.entries(providerStats).forEach(([id, s]) => {
        if (s.total >= 3 && s.noShow / s.total > 0.25) {
            const p = providers.find(p => p.id === id);
            alerts.push({ type: 'provider_no_show', severity: 'high', title: 'Provider reliability issue', detail: `${p?.business_name || 'Unknown'}: ${s.noShow}/${s.total} no-shows`, entity: 'provider', id });
        }
    });

    // 3. Overdue pending confirmations (>48h)
    bookings.forEach(b => {
        if (b.status === 'pending' && b.created_date) {
            const hoursAgo = (now - new Date(b.created_date)) / 3600000;
            if (hoursAgo > 48)
                alerts.push({ type: 'overdue_pending', severity: 'medium', title: 'Overdue confirmation', detail: `Booking pending for ${Math.round(hoursAgo)}h without confirmation`, entity: 'booking', id: b.id });
        }
    });

    // 4. Provider with trust score < 40 (poor performance)
    providers.forEach(p => {
        const t = computeTrustScore(p, bookings);
        if (t.total >= 5 && t.score < 40)
            alerts.push({ type: 'low_trust_provider', severity: 'high', title: 'Low trust score', detail: `${p.business_name}: trust score ${t.score}/100`, entity: 'provider', id: p.id });
    });

    return alerts;
}

// ─── Bundle Clustering ────────────────────────────────────────────────────────
// Groups pending bookings by service type to suggest efficient batches
export function findBundleOpportunities(bookings) {
    const pending = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
    const groups = {};
    pending.forEach(b => {
        const key = b.service_name || 'General';
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
    });
    return Object.entries(groups)
        .filter(([, items]) => items.length >= 2)
        .map(([service, items]) => ({
            service,
            count: items.length,
            estimatedSaving: `${Math.min(35, Math.round(12 + items.length * 3))}%`,
            bookingIds: items.map(b => b.id),
        }))
        .sort((a, b) => b.count - a.count);
}

// ─── Repeat Booking Prediction ────────────────────────────────────────────────
// Finds repeat booking patterns and predicts next booking date
export function predictRepeatBookings(completedBookings) {
    const byKey = {};
    completedBookings.forEach(b => {
        const key = `${b.customer_email}|||${b.service_name}`;
        if (!byKey[key]) byKey[key] = [];
        byKey[key].push(b.date);
    });

    const predictions = [];
    Object.entries(byKey).forEach(([key, dates]) => {
        if (dates.length < 2) return;
        const [email, service] = key.split('|||');
        dates.sort();
        const gaps = [];
        for (let i = 1; i < dates.length; i++)
            gaps.push((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
        const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
        const nextDate = new Date(new Date(dates[dates.length - 1]).getTime() + avgGap * 86400000);
        const daysUntil = Math.round((nextDate - new Date()) / 86400000);
        if (daysUntil >= -3 && daysUntil <= 45) {
            predictions.push({
                customerEmail: email, service,
                nextDate: nextDate.toISOString().split('T')[0],
                daysUntil, avgIntervalDays: Math.round(avgGap),
                confidence: dates.length >= 4 ? 'high' : dates.length >= 3 ? 'medium' : 'low',
                bookingCount: dates.length,
            });
        }
    });
    return predictions.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ─── Schedule Optimizer (sort by date + time, detect gaps) ───────────────────
export function optimizeSchedule(providerBookings) {
    const sorted = [...providerBookings]
        .filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status))
        .sort((a, b) => a.date !== b.date ? (a.date > b.date ? 1 : -1) : (a.time_slot > b.time_slot ? 1 : -1));

    const byDate = {};
    sorted.forEach(b => { if (!byDate[b.date]) byDate[b.date] = []; byDate[b.date].push(b); });

    const suggestions = [];
    Object.entries(byDate).forEach(([date, jobs]) => {
        if (jobs.length === 1)
            suggestions.push({ type: 'fill_slot', date, message: `Only 1 booking on ${date} — fill more slots to maximize earnings` });
        if (jobs.length >= 4)
            suggestions.push({ type: 'high_load', date, message: `${jobs.length} bookings on ${date} — consider buffer time between jobs` });
    });

    return { schedule: sorted, suggestions, totalUpcoming: sorted.length };
}

// ─── Trust tier style tokens (literal for Tailwind scanning) ─────────────────
export const TRUST_TIER_STYLE = {
    champion: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
    trusted: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    verified: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
    rising: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
    new: { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200', dot: 'bg-zinc-400' },
};