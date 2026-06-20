import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG as QRCode } from 'qrcode.react';

const TIER_CONFIG = {
    champion:  { label: 'Champion',  color: '#f59e0b', icon: '🏆' },
    trusted:   { label: 'Trusted',   color: '#10b981', icon: '✅' },
    verified:  { label: 'Verified',  color: '#3b82f6', icon: '🔵' },
    rising:    { label: 'Rising',    color: '#8b5cf6', icon: '⬆️' },
    new:       { label: 'New',       color: '#6b7280', icon: '🌱' },
};

function AnimatedScore({ target, duration = 1500 }) {
    const [display, setDisplay] = useState(0);
    const raf = useRef(null);

    useEffect(() => {
        const start = performance.now();
        const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * target));
            if (progress < 1) raf.current = requestAnimationFrame(animate);
        };
        raf.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);

    return <span>{display}</span>;
}

function SkeletonBlock({ w = '100%', h = 24, r = 8 }) {
    return (
        <div style={{
            width: w, height: h, borderRadius: r,
            background: 'var(--color-surface-raised)',
            animation: 'pulse 1.5s ease-in-out infinite',
        }} />
    );
}

export default function TrustPassport() {
    const { providerId } = useParams();
    const [passport, setPassport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const shareUrl = `${window.location.origin}/trust/${providerId}`;

    useEffect(() => {
        if (!providerId) return;
        fetch(`/api/trust-passport/${providerId}`)
            .then(r => { if (!r.ok) throw new Error('Provider not found'); return r.json(); })
            .then(d => { setPassport(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [providerId]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: `${passport?.provider_name} — TrustPassport`, url: shareUrl });
            } catch (_) {}
        } else {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        setVerifyResult(null);
        try {
            const r = await fetch(`/api/identity/${providerId}/verify`);
            const d = await r.json();
            setVerifyResult(d);
        } catch (e) {
            setVerifyResult({ error: 'Verification request failed.' });
        } finally {
            setVerifying(false);
        }
    };

    const tier = passport ? (TIER_CONFIG[passport.tier] || TIER_CONFIG.new) : null;

    const cardStyle = {
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: '20px 24px',
    };

    const labelStyle = {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-text-subtle)',
        marginBottom: 4,
    };

    const valueStyle = {
        fontSize: 28,
        fontWeight: 800,
        color: 'var(--color-text)',
        lineHeight: 1.1,
    };

    const subStyle = { fontSize: 13, color: 'var(--color-text-subtle)', marginTop: 4 };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '40px 20px', maxWidth: 640, margin: '0 auto' }}>
                <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
                <SkeletonBlock h={40} w="60%" r={12} />
                <div style={{ marginTop: 12 }}><SkeletonBlock h={20} w="40%" /></div>
                <div style={{ marginTop: 32 }}><SkeletonBlock h={180} /></div>
                <div style={{ marginTop: 16 }}><SkeletonBlock h={120} /></div>
                <div style={{ marginTop: 16 }}><SkeletonBlock h={120} /></div>
            </div>
        );
    }

    if (error || !passport) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>
                    <div style={{ fontSize: 48 }}>🔍</div>
                    <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Provider Not Found</div>
                    <div style={{ marginTop: 8 }}>{error || 'This trust passport does not exist.'}</div>
                </div>
            </div>
        );
    }

    const completionPct = Math.round((passport.completion_rate || 0) * 100);
    const scoreColor = passport.score >= 78 ? '#10b981' : passport.score >= 45 ? '#f59e0b' : '#6b7280';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '32px 16px 60px' }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>TrustPassport</span>
                    <span style={{ fontSize: 12, background: 'var(--color-primary)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>Truvornex</span>
                </div>

                <div style={{ ...cardStyle, background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-raised) 100%)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>{passport.provider_name}</div>
                            <div style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginTop: 4 }}>
                                {passport.city ? `${passport.city}, ` : ''}{passport.country || 'PK'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                                <span style={{ fontSize: 20 }}>{tier.icon}</span>
                                <span style={{
                                    fontSize: 13, fontWeight: 700, color: tier.color,
                                    background: tier.color + '20', borderRadius: 6, padding: '3px 10px',
                                }}>{tier.label}</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', minWidth: 100 }}>
                            <div style={{
                                width: 90, height: 90, borderRadius: '50%',
                                border: `4px solid ${scoreColor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column',
                                background: 'var(--color-bg)',
                            }}>
                                <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                                    <AnimatedScore target={Math.round(passport.score || 0)} />
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', letterSpacing: '0.05em' }}>SCORE</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={cardStyle}>
                        <div style={labelStyle}>Jobs Done</div>
                        <div style={valueStyle}>{passport.total_completed || 0}</div>
                        <div style={subStyle}>completed</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={labelStyle}>Completion</div>
                        <div style={{ ...valueStyle, color: completionPct >= 80 ? '#10b981' : completionPct >= 60 ? '#f59e0b' : '#ef4444' }}>
                            {completionPct}%
                        </div>
                        <div style={subStyle}>rate</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={labelStyle}>Avg Rating</div>
                        <div style={valueStyle}>
                            {passport.avg_rating ? parseFloat(passport.avg_rating).toFixed(1) : '–'}
                            <span style={{ fontSize: 16, marginLeft: 4 }}>★</span>
                        </div>
                        <div style={subStyle}>out of 5.0</div>
                    </div>
                    <div style={cardStyle}>
                        <div style={labelStyle}>Vouches</div>
                        <div style={valueStyle}>{passport.vouches_count || 0}</div>
                        <div style={subStyle}>from neighbors</div>
                    </div>
                </div>

                {passport.dispute_free_streak > 0 && (
                    <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>🛡️</span>
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>
                                {passport.dispute_free_streak} dispute-free streak
                            </div>
                            <div style={subStyle}>No disputes in recent completed jobs</div>
                        </div>
                    </div>
                )}

                {passport.badges?.length > 0 && (
                    <div style={{ ...cardStyle, marginBottom: 16 }}>
                        <div style={{ ...labelStyle, marginBottom: 12 }}>Badges</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {passport.badges.map((b, i) => (
                                <span key={i} style={{
                                    fontSize: 12, fontWeight: 600,
                                    background: 'var(--color-surface-raised)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 8, padding: '4px 12px',
                                    color: 'var(--color-text)',
                                }}>{b}</span>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ ...cardStyle, marginBottom: 16 }}>
                    <div style={{ ...labelStyle, marginBottom: 12 }}>Scan to Verify</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ background: '#fff', padding: 8, borderRadius: 8 }}>
                            <QRCode value={shareUrl} size={100} level="M" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: 'var(--color-text)', marginBottom: 4 }}>
                                This credential is verifiable by any third party at:
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-primary)', wordBreak: 'break-all' }}>{shareUrl}</div>
                            {passport.verification_hash && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={labelStyle}>Credential Hash</div>
                                    <div style={{
                                        fontSize: 10, fontFamily: 'monospace',
                                        color: 'var(--color-text-subtle)',
                                        wordBreak: 'break-all', marginTop: 2,
                                    }}>{passport.verification_hash.slice(0, 32)}…</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={handleShare}
                        style={{
                            flex: 1, padding: '12px 20px',
                            background: 'var(--color-primary)', color: '#fff',
                            border: 'none', borderRadius: 10, fontWeight: 700,
                            fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        {copied ? '✓ Link Copied' : '↗ Share Passport'}
                    </button>
                    <button
                        onClick={handleVerify}
                        disabled={verifying}
                        style={{
                            flex: 1, padding: '12px 20px',
                            background: 'var(--color-surface-raised)', color: 'var(--color-text)',
                            border: '1px solid var(--color-border)', borderRadius: 10,
                            fontWeight: 700, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        {verifying ? '⏳ Verifying…' : '🔍 Verify Credential'}
                    </button>
                    <a
                        href="/"
                        style={{
                            flex: 1, padding: '12px 20px',
                            background: 'var(--color-surface-raised)', color: 'var(--color-text)',
                            border: '1px solid var(--color-border)', borderRadius: 10,
                            fontWeight: 700, fontSize: 14, cursor: 'pointer',
                            textDecoration: 'none', textAlign: 'center', display: 'block',
                        }}
                    >
                        Book This Provider
                    </a>
                </div>

                {verifyResult && (
                    <div style={{
                        marginTop: 16, padding: '14px 18px', borderRadius: 12,
                        background: verifyResult.error ? 'var(--color-surface-raised)' : '#10b98115',
                        border: `1px solid ${verifyResult.error ? 'var(--color-border)' : '#10b98140'}`,
                    }}>
                        {verifyResult.error ? (
                            <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', margin: 0 }}>{verifyResult.error}</p>
                        ) : (
                            <>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
                                    ✓ Credential Verified
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                                    Status: {verifyResult.status || 'valid'} · Hash: {verifyResult.credential_hash?.slice(0, 16) || verifyResult.hash?.slice(0, 16) || 'confirmed'}…
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--color-text-subtle)' }}>
                    Last updated {passport.last_computed_at
                        ? new Date(passport.last_computed_at).toLocaleDateString()
                        : 'recently'} · Powered by Truvornex
                </div>
            </div>
        </div>
    );
}
