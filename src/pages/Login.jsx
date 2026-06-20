import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Zap, ArrowRight, Loader2, CheckCircle, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

/* ─── Animated particle logo for the login left panel ─────────── */
function PanelParticles() {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const state = { particles: [], mouseX: -9999, mouseY: -9999, ripples: [], raf: null };

        const genParticles = (W, H) => {
            const scale = Math.min(W * 0.60, H * 0.48) / 32;
            const ox = W * 0.5;
            const oy = H * 0.44;
            const STEP = 0.34, HALF_T = 1.5;
            const pts = [];
            const fillBand = (x1, x2, cy) => {
                for (let x = x1; x <= x2; x += STEP)
                    for (let y = cy - HALF_T; y <= cy + HALF_T; y += STEP)
                        pts.push({ tx: ox + (x - 16) * scale, ty: oy + (y - 16) * scale });
            };
            const fillDisk = (cx, cy, r) => {
                for (let x = cx - r; x <= cx + r; x += STEP)
                    for (let y = cy - r; y <= cy + r; y += STEP)
                        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
                            pts.push({ tx: ox + (x - 16) * scale, ty: oy + (y - 16) * scale });
            };
            fillBand(8, 24, 10); fillBand(8, 22, 16); fillBand(8, 20, 22);
            fillDisk(24, 22, 4);
            return pts.map(p => ({
                ...p,
                x: p.tx + (Math.random() - 0.5) * W * 0.7,
                y: p.ty + (Math.random() - 0.5) * H * 0.7,
                vx: 0, vy: 0,
                size: 1.6 + Math.random() * 2.0,
                baseOpacity: 0.22 + Math.random() * 0.32,
                phase: Math.random() * Math.PI * 2,
            }));
        };

        const resize = () => {
            canvas.width  = canvas.parentElement?.offsetWidth  || 600;
            canvas.height = canvas.parentElement?.offsetHeight || 800;
            state.particles = genParticles(canvas.width, canvas.height);
        };
        resize();
        window.addEventListener('resize', resize);

        const getBounds = () => canvas.getBoundingClientRect();
        const onMove  = e => { const r = getBounds(); state.mouseX = e.clientX - r.left; state.mouseY = e.clientY - r.top; };
        const onLeave = () => { state.mouseX = -9999; state.mouseY = -9999; };
        const spawnRipple = (x, y) => {
            state.ripples.push({ x, y, r: 0, maxR: Math.min(canvas.width, canvas.height) * 0.58, str: 11 });
            if (state.ripples.length > 4) state.ripples.shift();
        };
        const onClick = e => { const r = getBounds(); spawnRipple(e.clientX - r.left, e.clientY - r.top); };
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseleave', onLeave);
        canvas.addEventListener('click', onClick);

        const initId = setTimeout(() => spawnRipple(canvas.width * 0.5, canvas.height * 0.44), 900);
        const autoId = setInterval(() => spawnRipple(canvas.width * 0.5, canvas.height * 0.44), 4500);

        const animate = (now) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const rp of state.ripples) rp.r += 7;
            state.ripples = state.ripples.filter(rp => rp.r < rp.maxR);
            for (const p of state.particles) {
                p.vx = (p.vx + (p.tx - p.x) * 0.038) * 0.80;
                p.vy = (p.vy + (p.ty - p.y) * 0.038) * 0.80;
                const mdx = p.x - state.mouseX, mdy = p.y - state.mouseY;
                const md = Math.sqrt(mdx * mdx + mdy * mdy);
                if (md < 120 && md > 0.5) { const f = (1 - md / 120) ** 2 * 6.5; p.vx += (mdx / md) * f; p.vy += (mdy / md) * f; }
                for (const rp of state.ripples) {
                    const rdx = p.x - rp.x, rdy = p.y - rp.y;
                    const rd = Math.sqrt(rdx * rdx + rdy * rdy);
                    if (rd < 1) continue;
                    const wd = Math.abs(rd - rp.r);
                    if (wd < 38) { const f = (1 - wd / 38) ** 2 * (1 - rp.r / rp.maxR) * rp.str; p.vx += (rdx / rd) * f; p.vy += (rdy / rd) * f; }
                }
                p.x += p.vx; p.y += p.vy;
                const pulse = Math.sin(now * 0.00075 + p.phase) * 0.11;
                ctx.globalAlpha = Math.max(0.04, Math.min(0.62, p.baseOpacity + pulse));
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = '#fff'; ctx.fill();
            }
            state.raf = requestAnimationFrame(animate);
        };
        state.raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(state.raf);
            clearTimeout(initId); clearInterval(autoId);
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseleave', onLeave);
            canvas.removeEventListener('click', onClick);
        };
    }, []);

    return (
        <canvas ref={ref} aria-hidden="true" style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            zIndex: 5, cursor: 'crosshair',
        }} />
    );
}

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || '/';
    const { user, checkUserAuth } = useAuth();

    const [tab, setTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('customer');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) navigate(from, { replace: true });
    }, [user, navigate, from]);

    useEffect(() => { setError(''); setSuccess(''); }, [tab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (tab === 'login') {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Login failed');
                await checkUserAuth();
                navigate(from, { replace: true });
            } else {
                if (!fullName.trim()) { setError('Please enter your full name.'); setLoading(false); return; }
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password, fullName: fullName.trim(), role }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Signup failed');
                setSuccess('Account created! You can now sign in.');
                setTab('login');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--color-bg)' }}>

            {/* ── Left Panel — Static ── */}
            <div className="hidden lg:flex lg:w-[52%]" style={{
                position: 'relative',
                overflow: 'hidden',
                flexDirection: 'column',
            }}>
                {/* Background */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #07070d 0%, #050508 45%, #080706 100%)' }} />
                {/* Fine grid */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                    pointerEvents: 'none',
                }} />
                {/* Glow */}
                <div style={{
                    position: 'absolute', top: -200, left: '40%', transform: 'translateX(-50%)',
                    width: 750, height: 600,
                    background: 'radial-gradient(ellipse, rgba(255,240,200,0.04) 0%, transparent 62%)',
                    pointerEvents: 'none',
                }} />

                {/* Animated particle logo — fills the full left panel */}
                <PanelParticles />

                {/* Truvornex wordmark — floats below the particle sculpture */}
                <div style={{
                    position: 'absolute', zIndex: 20,
                    bottom: '20%', left: 0, right: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    pointerEvents: 'none', textAlign: 'center',
                }}>
                    <p style={{
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: 'clamp(2.2rem, 4vw, 3rem)',
                        fontWeight: 900,
                        letterSpacing: '-0.04em',
                        color: 'rgba(255,255,255,0.90)',
                        lineHeight: 1,
                    }}>Truvornex</p>
                    <p style={{
                        fontSize: 10, letterSpacing: '0.28em',
                        color: 'rgba(255,255,255,0.22)',
                        textTransform: 'uppercase', marginTop: 10,
                        fontFamily: "'Inter', system-ui, sans-serif",
                    }}>Neighborhood OS</p>
                </div>

                {/* Spacer — keeps bottom bar pinned to bottom */}
                <div style={{ flex: 1 }} />

                {/* Bottom */}
                <div style={{
                    position: 'relative', zIndex: 10,
                    padding: '0 52px 36px',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 8px rgba(34,197,94,0.55)',
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontSize: 9.5, letterSpacing: '0.28em',
                        textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                        Launching in Hyderabad &amp; Helsinki
                    </span>
                </div>
            </div>

            {/* ── Right Panel — Sign In / Sign Up Form ── */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px 20px',
                backgroundColor: 'var(--color-bg)',
            }} className="lg:p-12">
                <div style={{ width: '100%', maxWidth: 400 }}>

                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 mb-7 lg:hidden">
                        <div style={{
                            height: 34, width: 34, borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--color-border-strong)',
                        }}>
                            <Zap style={{ width: 15, height: 15, color: 'var(--color-primary)' }} />
                        </div>
                        <span style={{ fontWeight: 700, letterSpacing: '0.1em', fontSize: 13, color: 'var(--color-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'uppercase' }}>Truvornex</span>
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{
                            fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em',
                            color: 'var(--color-primary)', marginBottom: 6,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>
                            {tab === 'login' ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', letterSpacing: '-0.005em' }}>
                            {tab === 'login'
                                ? 'Sign in to access your services and Simon AI'
                                : 'Join 2,400+ users on Truvornex today'}
                        </p>
                    </div>

                    {/* Tab toggle */}
                    <div style={{
                        display: 'flex', borderRadius: 12, padding: 4, marginBottom: 24,
                        background: 'var(--color-surface-high)', gap: 4,
                    }}>
                        {['login', 'signup'].map(t => (
                            <button key={t} onClick={() => setTab(t)} style={{
                                flex: 1, padding: '9px 0', fontSize: 12.5,
                                fontWeight: 600, borderRadius: 9, border: 'none',
                                cursor: 'pointer', transition: 'all 0.2s ease',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                ...(tab === t
                                    ? { background: 'transparent', border: '1px solid var(--color-border-strong)', color: 'var(--color-primary)', boxShadow: 'none' }
                                    : { background: 'transparent', border: 'none', color: 'var(--color-text-subtle)' }),
                            }}>
                                {t === 'login' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    {/* Success */}
                    {success && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '12px 14px', borderRadius: 12, marginBottom: 18,
                            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
                        }}>
                            <CheckCircle style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0, color: 'var(--color-success)' }} />
                            <p style={{ fontSize: 12, color: 'var(--color-success)' }}>{success}</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '12px 14px', borderRadius: 12, marginBottom: 18,
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                            fontSize: 12, color: 'var(--color-error)',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {tab === 'signup' && (
                            <div>
                                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Full Name</label>
                                <input
                                    type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                    placeholder="Alex Johnson" required={tab === 'signup'}
                                    style={{
                                        width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 13,
                                        outline: 'none', transition: 'border-color 0.2s',
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border-strong)',
                                        color: 'var(--color-primary)',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                                />
                            </div>
                        )}
                        {tab === 'signup' && (
                            <div>
                                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>I am a</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {['customer', 'provider'].map(r => (
                                        <button key={r} type="button" onClick={() => setRole(r)} style={{
                                            flex: 1, padding: '10px 0', fontSize: 12.5, fontWeight: 600,
                                            borderRadius: 12, border: 'none', cursor: 'pointer',
                                            textTransform: 'capitalize', transition: 'all 0.2s',
                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            ...(role === r
                                                ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' }
                                                : { background: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-muted)' }),
                                        }}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Email</label>
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com" required
                                style={{
                                    width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 13,
                                    outline: 'none', transition: 'border-color 0.2s',
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border-strong)',
                                    color: 'var(--color-primary)',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                                onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'} required minLength={tab === 'signup' ? 8 : 6}
                                    style={{
                                        width: '100%', padding: '11px 44px 11px 14px', borderRadius: 12, fontSize: 13,
                                        outline: 'none', transition: 'border-color 0.2s',
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border-strong)',
                                        color: 'var(--color-primary)',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                                />
                                <button type="button" onClick={() => setShowPw(s => !s)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                                    color: 'var(--color-text-muted)',
                                }}>
                                    {showPw
                                        ? <EyeOff style={{ width: 15, height: 15 }} />
                                        : <Eye style={{ width: 15, height: 15 }} />}
                                </button>
                            </div>
                        </div>

                        {tab === 'login' && (
                            <div style={{ textAlign: 'right', marginTop: -6 }}>
                                <button type="button" style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 11.5, color: 'var(--color-text-muted)',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    letterSpacing: '-0.005em',
                                }}>
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '13px 0', marginTop: 4,
                            borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            background: 'var(--color-primary)', color: 'var(--color-on-primary)',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 14px rgba(0,0,0,0.3)',
                        }}>
                            {loading
                                ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                                : <>{tab === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight style={{ width: 15, height: 15 }} /></>
                            }
                        </button>
                    </form>

                    {/* Switch tab link */}
                    <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {tab === 'login' ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => setTab(tab === 'login' ? 'signup' : 'login')} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700, color: 'var(--color-primary)',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>
                            {tab === 'login' ? 'Sign up free' : 'Sign in'}
                        </button>
                    </p>

                    {/* Browse as guest */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                        <span style={{ fontSize: 10.5, color: 'var(--color-text-subtle)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>or</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                    </div>
                    <button
                        onClick={() => navigate('/services')}
                        style={{
                            width: '100%', marginTop: 12, padding: '11px 0',
                            borderRadius: 14, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.005em',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            background: 'transparent',
                            border: '1px solid var(--color-border-strong)',
                            color: 'var(--color-text-muted)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-accent)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-strong)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                        Browse as guest <ChevronRight style={{ width: 13, height: 13 }} />
                    </button>

                    <p style={{ textAlign: 'center', marginTop: 22, fontSize: 10.5, color: 'var(--color-text-subtle)', lineHeight: 1.6 }}>
                        By continuing you agree to our Terms of Service and Privacy Policy.<br />
                        Powered by Simon AI · Truvornex © 2026
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
