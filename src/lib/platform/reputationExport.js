/**
 * Reputation Export Engine — Feature #2
 *
 * Makes the Truvornex trust score portable — providers can share a
 * verifiable credential (link or JSON) to get hired outside the platform.
 * This turns Truvornex into a credentialing layer for informal labor markets.
 */

import { computeTrustScore } from '@/lib/ai/engine';

// ─── Credential Generation ────────────────────────────────────────────────────

/**
 * Generates a portable, verifiable reputation credential for a provider.
 * The credential contains everything needed to verify the provider's
 * track record without needing access to the Truvornex platform.
 */
export function generateReputationCredential(provider, allBookings) {
    const trust = computeTrustScore(provider, allBookings);
    const providerBookings = allBookings.filter(b => b.provider_id === provider.id);
    const completed = providerBookings.filter(b => b.status === 'completed');
    const uniqueCustomers = new Set(completed.map(b => b.customer_email)).size;
    const totalRevenue = completed.reduce((s, b) => s + (b.price || 0), 0);
    const avgRevenue = completed.length > 0 ? totalRevenue / completed.length : 0;

    // Earliest booking date
    const dates = providerBookings.map(b => b.date).filter(Boolean).sort();
    const memberSince = dates[0] || null;

    // Category breadth
    const categories = provider.category_slugs || [];

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const credential = {
        version: '1.0',
        issuer: 'Truvornex',
        issuedAt,
        expiresAt,
        provider: {
            id: provider.id,
            businessName: provider.business_name,
            city: provider.city,
            verified: provider.verified || false,
            categories,
        },
        trust: {
            score: trust.score,
            tier: trust.tier,
            tierLabel: trust.label,
            completionRate: trust.completionRate,
            completedJobs: trust.completed,
            cancelledJobs: trust.cancelled,
            noShows: trust.noShows,
        },
        stats: {
            totalBookings: trust.total,
            uniqueCustomers,
            avgJobValue: Math.round(avgRevenue * 100) / 100,
            memberSince,
        },
        badge: getTrustBadgeMetadata(trust.tier),
        fingerprint: generateCredentialFingerprint(provider.id, trust.score, issuedAt),
    };

    return credential;
}

// ─── Shareable URL Builder ─────────────────────────────────────────────────────

/**
 * Generates a shareable credential URL for the provider.
 * The URL encodes the credential as a base64 payload for portability.
 */
export function generateCredentialURL(credential) {
    const payload = btoa(JSON.stringify({
        v: credential.version,
        id: credential.provider.id,
        name: credential.provider.businessName,
        score: credential.trust.score,
        tier: credential.trust.tier,
        jobs: credential.trust.completedJobs,
        rate: credential.trust.completionRate,
        fp: credential.fingerprint,
        exp: credential.expiresAt,
    }));
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://truvornex.com';
    return `${base}/verify/${payload}`;
}

// ─── Credential Verification ──────────────────────────────────────────────────

/**
 * Parses and verifies a credential from a URL payload.
 * Returns null if the credential is malformed, expired, or tampered.
 */
export function verifyCredentialFromURL(payload) {
    try {
        const data = JSON.parse(atob(payload));
        if (!data.id || !data.score || !data.tier) return { valid: false, reason: 'malformed' };

        const now = new Date();
        const expiry = new Date(data.exp);
        if (expiry < now) return { valid: false, reason: 'expired', expiredAt: data.exp };

        return {
            valid: true,
            providerId: data.id,
            providerName: data.name,
            trustScore: data.score,
            tier: data.tier,
            completedJobs: data.jobs,
            completionRate: data.rate,
            expiresAt: data.exp,
            fingerprint: data.fp,
        };
    } catch {
        return { valid: false, reason: 'invalid_encoding' };
    }
}

// ─── Trust Score to Human-Readable Summary ────────────────────────────────────

/**
 * Generates a human-readable one-paragraph summary of a provider's reputation.
 * Suitable for embedding in CVs, LinkedIn bios, or job applications.
 */
export function generateReputationSummary(credential) {
    const { provider, trust, stats } = credential;
    const tierDescriptions = {
        champion: 'an elite-tier Champion provider',
        trusted: 'a highly-trusted Trusted provider',
        verified: 'a Verified provider',
        rising: 'a Rising provider with strong growth',
        new: 'a new provider',
    };
    const tierDesc = tierDescriptions[trust.tier] || 'a verified provider';

    const parts = [
        `${provider.businessName} is ${tierDesc} on Truvornex`,
        `with a trust score of ${trust.score}/100.`,
        `They have completed ${trust.completedJobs} jobs`,
        `for ${stats.uniqueCustomers} unique customers`,
        `at a ${trust.completionRate}% completion rate.`,
    ];

    if (provider.categories.length > 0) {
        parts.push(`Specialising in ${provider.categories.slice(0, 3).join(', ')}.`);
    }

    if (provider.verified) {
        parts.push('Identity and credentials are verified by Truvornex.');
    }

    return parts.join(' ');
}

// ─── Badge Metadata ───────────────────────────────────────────────────────────

function getTrustBadgeMetadata(tier) {
    const badges = {
        champion: {
            label: 'Truvornex Champion',
            color: '#f59e0b',
            emoji: '🏆',
            description: 'Top 10% of all providers on the platform',
        },
        trusted: {
            label: 'Truvornex Trusted',
            color: '#10b981',
            emoji: '✅',
            description: 'Consistently high performance across all metrics',
        },
        verified: {
            label: 'Truvornex Verified',
            color: '#3b82f6',
            emoji: '🔵',
            description: 'Identity verified with solid track record',
        },
        rising: {
            label: 'Truvornex Rising',
            color: '#8b5cf6',
            emoji: '📈',
            description: 'Growing provider showing strong early results',
        },
        new: {
            label: 'Truvornex Member',
            color: '#6b7280',
            emoji: '🌱',
            description: 'New member building their reputation',
        },
    };
    return badges[tier] || badges.new;
}

// ─── Fingerprint ──────────────────────────────────────────────────────────────

function generateCredentialFingerprint(providerId, score, issuedAt) {
    const raw = `${providerId}:${score}:${issuedAt}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

// ─── Credential Comparison ────────────────────────────────────────────────────

/**
 * Compares two providers' credentials to find the more reputable one.
 * Useful for side-by-side comparisons when hiring outside the platform.
 */
export function compareCredentials(credA, credB) {
    const scoreA = credA.trust.score * 0.5 + credA.trust.completionRate * 0.3 + Math.min(credA.trust.completedJobs, 100) * 0.2;
    const scoreB = credB.trust.score * 0.5 + credB.trust.completionRate * 0.3 + Math.min(credB.trust.completedJobs, 100) * 0.2;

    return {
        winner: scoreA >= scoreB ? credA.provider.businessName : credB.provider.businessName,
        marginPercent: Math.abs(Math.round(((scoreA - scoreB) / Math.max(scoreA, scoreB)) * 100)),
        providerA: { name: credA.provider.businessName, compositeScore: Math.round(scoreA) },
        providerB: { name: credB.provider.businessName, compositeScore: Math.round(scoreB) },
    };
}
