import { useSimon } from '@/lib/SimonContext';

export default function SimonZonePulse() {
    const { zoneHealth, ready } = useSimon();
    if (!ready || !zoneHealth) return null;

    const color = zoneHealth.health === 'active' ? '#22c55e'
        : zoneHealth.health === 'moderate' ? '#f59e0b'
        : 'var(--color-text-subtle)';

    const label = zoneHealth.health === 'active' ? 'Active'
        : zoneHealth.health === 'moderate' ? 'Moderate'
        : 'Quiet';

    return (
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ position: 'relative', width: 7, height: 7, flexShrink: 0, display: 'inline-block' }}>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: color, opacity: 0.3, animation: 'pingRing 2s ease-out infinite' }} />
                    <span style={{ position: 'absolute', inset: '1px', borderRadius: '50%', backgroundColor: color }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                        Zone {label}
                        <span style={{ fontWeight: 400, color: 'var(--color-text-subtle)' }}> · {zoneHealth.activeProviders} providers</span>
                    </div>
                    {zoneHealth.trendingServices?.length > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--color-text-subtle)', marginTop: 1, lineHeight: 1.3 }}>
                            Trending: {zoneHealth.trendingServices.slice(0, 2).join(', ')}
                        </div>
                    )}
                </div>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#7c6fcd', letterSpacing: '0.05em', flexShrink: 0 }}>SIMON</span>
            </div>
        </div>
    );
}
