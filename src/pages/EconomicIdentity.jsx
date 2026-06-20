import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

const TIER_COLORS = {
    champion: { bg: '#f59e0b22', border: '#f59e0b', text: '#d97706', label: 'Champion' },
    trusted:  { bg: '#3b82f622', border: '#3b82f6', text: '#2563eb', label: 'Trusted' },
    verified: { bg: '#10b98122', border: '#10b981', text: '#059669', label: 'Verified' },
    rising:   { bg: '#8b5cf622', border: '#8b5cf6', text: '#7c3aed', label: 'Rising' },
    new:      { bg: '#6b728022', border: '#6b7280', text: '#4b5563', label: 'New'     },
};

const CATEGORY_ICONS = {
    cleaning: '🧹', plumbing: '🔧', hvac: '❄️', moving: '📦',
    gardening: '🌿', chef: '👨‍🍳', handyman: '🔨', fitness: '💪',
    tutoring: '📚', driving: '🚗',
};

function StatCard({ label, value, sub, highlight }) {
    return (
        <div style={{
            background: highlight ? 'var(--color-primary)' : 'var(--color-card)',
            border: `1px solid ${highlight ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 12, padding: '18px 20px',
        }}>
            <div style={{ fontSize: 11, color: highlight ? 'rgba(255,255,255,0.75)' : 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: highlight ? '#fff' : 'var(--color-text)', lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 12, color: highlight ? 'rgba(255,255,255,0.65)' : 'var(--color-text-subtle)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

function ScoreRing({ score, tier }) {
    const tc = TIER_COLORS[tier] || TIER_COLORS.new;
    const r = 44, circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <svg width={110} height={110}>
                <circle cx={55} cy={55} r={r} fill="none" stroke="var(--color-border)" strokeWidth={8} />
                <circle cx={55} cy={55} r={r} fill="none" stroke={tc.border} strokeWidth={8}
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 55 55)" style={{ transition: 'stroke-dasharray 1.2s ease' }} />
                <text x={55} y={52} textAnchor="middle" fill="var(--color-text)" fontSize={20} fontWeight={700}>{Math.round(score)}</text>
                <text x={55} y={68} textAnchor="middle" fill="var(--color-text-subtle)" fontSize={10}>/100</text>
            </svg>
            <div style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600 }}>
                {tc.label}
            </div>
        </div>
    );
}

export default function EconomicIdentity() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [credential, setCredential] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);

    useEffect(() => {
        if (!user) return;
        fetch('/api/identity/me')
            .then(r => r.json())
            .then(d => { if (d.error) setError(d.error); else setCredential(d.credential); })
            .catch(() => setError('Failed to load identity'))
            .finally(() => setLoading(false));
    }, [user]);

    function downloadCredential() {
        const blob = new Blob([JSON.stringify(credential, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `truvornex-tip-v1-${credential.subject.id.slice(0, 8)}.json`;
        a.click(); URL.revokeObjectURL(url);
    }

    async function copyVerifyLink() {
        const link = `${window.location.origin}/api/identity/${credential.subject.id}/verify`;
        await navigator.clipboard.writeText(link);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    }

    async function testVerify() {
        const r = await fetch('/api/identity/me/verify');
        const d = await r.json();
        setVerifyResult(d);
    }

    if (!user) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-subtle)' }}>
            Sign in to view your Economic Identity.
        </div>
    );

    if (loading) return (
        <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>Building your Economic Identity...</p>
        </div>
    );

    if (error) return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-subtle)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <p>{error}</p>
            {user?.role !== 'provider' && <p style={{ marginTop: 12, fontSize: 13 }}>Economic Identity is available for providers only.</p>}
        </div>
    );

    const { subject, trust, income, skills, dispute_record, issued_at, valid_until, credential_hash } = credential;
    const tc = TIER_COLORS[trust.tier] || TIER_COLORS.new;

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>

            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', letterSpacing: 2, textTransform: 'uppercase' }}>
                        Xylvanthrex Labs · Trust Identity Protocol v1
                    </span>
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                    Economic Identity
                </h1>
                <p style={{ color: 'var(--color-text-subtle)', fontSize: 14, margin: '6px 0 0' }}>
                    Machine-readable. Cryptographically signed. Verifiable by any bank, employer, or platform.
                </p>
            </div>

            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ScoreRing score={trust.score} tier={trust.tier} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{subject.name}</div>
                        <div style={{ color: 'var(--color-text-subtle)', fontSize: 13, margin: '4px 0 10px' }}>
                            {subject.city}, {subject.country} · Member since {subject.member_since ? new Date(subject.member_since).getFullYear() : 'N/A'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                                {Math.round(trust.completion_rate * 100)}% Completion Rate
                            </div>
                            <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)', borderRadius: 6, padding: '3px 10px', fontSize: 12 }}>
                                {trust.total_completed} Jobs Completed
                            </div>
                            <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)', borderRadius: 6, padding: '3px 10px', fontSize: 12 }}>
                                {trust.vouches} Vouches
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                <StatCard label="Last 30 Days" value={`₨${income.period_30d.toLocaleString()}`} sub="Verified earnings" highlight />
                <StatCard label="Last 90 Days" value={`₨${income.period_90d.toLocaleString()}`} sub={`${Math.round(income.period_90d / 3 / 1000)}k/mo avg`} />
                <StatCard label="Last 12 Months" value={`₨${income.period_365d.toLocaleString()}`} sub={`${income.transaction_count_365d} transactions`} />
                <StatCard label="Avg Monthly" value={`₨${income.avg_monthly_365d.toLocaleString()}`} sub="12-month average" />
            </div>

            {skills.length > 0 && (
                <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Verified Skills
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {skills.map(s => (
                            <div key={s.category} style={{
                                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                                borderRadius: 10, padding: '10px 14px', minWidth: 120,
                            }}>
                                <div style={{ fontSize: 18, marginBottom: 4 }}>{CATEGORY_ICONS[s.category] || '⚙️'}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', textTransform: 'capitalize' }}>{s.category}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                                    {s.verified_jobs} verified jobs
                                </div>
                                {s.last_active && (
                                    <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                                        Active: {s.last_active}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {skills.length === 0 && (
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>
                            Complete jobs to build verified skill records.
                        </p>
                    )}
                </div>
            )}

            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Credential Info</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                        ['Protocol', 'TIP-v1 (Trust Identity Protocol)'],
                        ['Issuer', 'truvornex.xylvanthrex.io'],
                        ['Issued', issued_at ? new Date(issued_at).toLocaleString() : '—'],
                        ['Valid Until', valid_until ? new Date(valid_until).toLocaleString() : '—'],
                        ['Hash', credential_hash ? credential_hash.slice(0, 24) + '…' : '—'],
                        ['Dispute Record', `${dispute_record.resolved_favorably}/${dispute_record.total} resolved favorably`],
                    ].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
                            <span style={{ color: 'var(--color-text-subtle)' }}>{k}</span>
                            <span style={{ color: 'var(--color-text)', fontFamily: 'monospace', textAlign: 'right' }}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>

            {verifyResult && (
                <div style={{
                    background: verifyResult.valid ? '#10b98114' : '#ef444414',
                    border: `1px solid ${verifyResult.valid ? '#10b981' : '#ef4444'}`,
                    borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13,
                    color: verifyResult.valid ? '#059669' : '#dc2626',
                }}>
                    {verifyResult.valid
                        ? `✓ Credential valid · Tier: ${verifyResult.tier} · Subject: ${verifyResult.subject_id?.slice(0, 8)}…`
                        : `✗ Invalid: ${verifyResult.reason}`}
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={downloadCredential} style={{
                    background: 'var(--color-primary)', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                    ↓ Download TIP-v1 JSON
                </button>
                <button onClick={copyVerifyLink} style={{
                    background: 'var(--color-card)', color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '11px 20px', fontSize: 14, cursor: 'pointer',
                }}>
                    {copied ? '✓ Copied' : '🔗 Copy Verify Link'}
                </button>
                <button onClick={testVerify} style={{
                    background: 'var(--color-card)', color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '11px 20px', fontSize: 14, cursor: 'pointer',
                }}>
                    Verify Hash
                </button>
            </div>

            <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 16, lineHeight: 1.5 }}>
                This credential can be verified by any institution using the public API at{' '}
                <code style={{ fontSize: 10 }}>/api/identity/{'{userId}'}/verify</code>.
                No phone call required. No third-party check. One API call.
            </p>
        </div>
    );
}
