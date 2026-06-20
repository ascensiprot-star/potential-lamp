import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useAuthModal } from '@/lib/AuthModalContext';
import { useTheme } from '@/lib/ThemeContext';

export default function AuthModal() {
    const { open, tab, setTab, closeModal, handleSuccess } = useAuthModal();
    const { setUser, setIsAuthenticated } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPw, setShowPw]     = useState(false);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState('');
    const [mounted, setMounted]   = useState(false);

    /* touch-drag state for mobile swipe-to-close */
    const dragStart = useRef(null);
    const sheetRef  = useRef(null);

    useEffect(() => { setError(''); setSuccess(''); }, [tab]);

    /* mount animation */
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
        } else {
            setMounted(false);
            setTimeout(() => {
                setEmail(''); setPassword(''); setFullName('');
                setError(''); setSuccess(''); setShowPw(false);
            }, 350);
        }
    }, [open]);

    /* lock body scroll when open */
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    /* ESC to close */
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && open) closeModal(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, closeModal]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (tab === 'signup' && !fullName.trim()) {
                setError('Please enter your full name.');
                setLoading(false);
                return;
            }
            const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/signup';
            const body = tab === 'login'
                ? { email, password }
                : { email, password, fullName };

            const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong.');

            if (tab === 'login') {
                setUser(data.user);
                setIsAuthenticated(true);
                handleSuccess();
            } else {
                setSuccess('Account created! You can now sign in.');
                setTab('login');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong.');
        }
        setLoading(false);
    };

    /* swipe-to-close (mobile sheet) */
    const onTouchStart = (e) => { dragStart.current = e.touches[0].clientY; };
    const onTouchEnd   = (e) => {
        if (dragStart.current === null) return;
        const delta = e.changedTouches[0].clientY - dragStart.current;
        dragStart.current = null;
        if (delta > 60) closeModal();
    };

    if (!open) return null;

    const inputStyle = {
        width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: 13,
        background: 'var(--color-surface)', border: '1.5px solid var(--color-border-strong)',
        color: 'var(--color-primary)', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
    };

    return (
        <>
            {/* ── Backdrop ──────────────────────────────────────────────── */}
            <div
                onClick={closeModal}
                style={{
                    position: 'fixed', inset: 0, zIndex: 900,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                    opacity: mounted ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            />

            {/* ── Mobile bottom sheet ──────────────────────────────────── */}
            <div
                ref={sheetRef}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="md:hidden"
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 901,
                    backgroundColor: 'var(--color-surface)',
                    borderTopLeftRadius: 24, borderTopRightRadius: 24,
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
                    border: '1px solid var(--color-border)',
                    transform: mounted ? 'translateY(0)' : 'translateY(100%)',
                    transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)',
                    maxHeight: '92dvh',
                    overflowY: 'auto',
                    paddingBottom: 'env(safe-area-inset-bottom, 16px)',
                }}
            >
                {/* drag indicator */}
                <div className="flex justify-center pt-3 pb-1">
                    <div style={{ width: 36, height: 4, borderRadius: 99, backgroundColor: 'var(--color-border-strong)' }} />
                </div>

                <div className="px-5 pb-6">
                    {/* header */}
                    <div className="flex items-center justify-between mb-5 mt-2">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(124,111,205,0.18)', border: '1px solid rgba(124,111,205,0.3)' }}>
                                <Sparkles style={{ width: 13, height: 13, color: '#7c6fcd' }} />
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>TRUVORNEX</span>
                        </div>
                        <button onClick={closeModal}
                            style={{ width: 32, height: 32, borderRadius: 99, border: '1px solid var(--color-border)', background: 'var(--color-surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                            <X style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                        </button>
                    </div>

                    <ModalForm
                        tab={tab} setTab={setTab}
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        fullName={fullName} setFullName={setFullName}
                        showPw={showPw} setShowPw={setShowPw}
                        loading={loading} error={error} success={success}
                        inputStyle={inputStyle}
                        handleSubmit={handleSubmit}
                    />
                </div>
            </div>

            {/* ── Desktop centered modal ───────────────────────────────── */}
            <div
                className="hidden md:flex items-center justify-center"
                style={{
                    position: 'fixed', inset: 0, zIndex: 901,
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        pointerEvents: 'all',
                        width: '100%', maxWidth: 440,
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: 24, padding: '28px 28px 24px',
                        boxShadow: isDark
                            ? '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)'
                            : '0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
                        border: '1px solid var(--color-border)',
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
                        transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.32,0.72,0,1)',
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(124,111,205,0.18)', border: '1px solid rgba(124,111,205,0.3)' }}>
                                <Sparkles style={{ width: 15, height: 15, color: '#7c6fcd' }} />
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>TRUVORNEX</span>
                        </div>
                        <button onClick={closeModal}
                            style={{ width: 32, height: 32, borderRadius: 99, border: '1px solid var(--color-border)', background: 'var(--color-surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                        </button>
                    </div>

                    <ModalForm
                        tab={tab} setTab={setTab}
                        email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword}
                        fullName={fullName} setFullName={setFullName}
                        showPw={showPw} setShowPw={setShowPw}
                        loading={loading} error={error} success={success}
                        inputStyle={inputStyle}
                        handleSubmit={handleSubmit}
                    />
                </div>
            </div>
        </>
    );
}

function ModalForm({ tab, setTab, email, setEmail, password, setPassword, fullName, setFullName, showPw, setShowPw, loading, error, success, inputStyle, handleSubmit }) {
    return (
        <>
            <div className="mb-5">
                <h2 className="font-black tracking-tight mb-1"
                    style={{ fontSize: 20, color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>
                    {tab === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {tab === 'login' ? 'Sign in to access Simon AI & your services' : 'Join 2,400+ users on Truvornex today'}
                </p>
            </div>

            {/* Tab toggle */}
            <div className="flex rounded-xl p-1 mb-5 gap-1" style={{ background: 'var(--color-surface-high)' }}>
                {['login', 'signup'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{
                            flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, borderRadius: 10,
                            border: 'none', cursor: 'pointer', transition: 'all 0.18s',
                            touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                            ...(tab === t
                                ? { background: 'var(--color-surface)', color: 'var(--color-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }
                                : { background: 'transparent', color: 'var(--color-text-subtle)' }),
                        }}>
                        {t === 'login' ? 'Sign In' : 'Sign Up'}
                    </button>
                ))}
            </div>

            {success && (
                <div className="flex items-start gap-2 p-3 rounded-xl mb-4"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <CheckCircle style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0, color: '#22c55e' }} />
                    <p style={{ fontSize: 12, color: '#22c55e' }}>{success}</p>
                </div>
            )}
            {error && (
                <div className="p-3 rounded-xl mb-4"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: 'var(--color-error)' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tab === 'signup' && (
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 5 }}>Full Name</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                            placeholder="Alex Johnson" required={tab === 'signup'}
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                        />
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 5 }}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com" required
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 5 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                            placeholder={tab === 'signup' ? 'Min. 8 characters' : '••••••••'} required minLength={6}
                            style={{ ...inputStyle, paddingRight: 42 }}
                            onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border-strong)'}
                        />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 2, touchAction: 'manipulation' }}>
                            {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                        </button>
                    </div>
                </div>

                {tab === 'login' && (
                    <div style={{ textAlign: 'right', marginTop: -4 }}>
                        <button type="button" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}>
                            Forgot password?
                        </button>
                    </div>
                )}

                <button type="submit" disabled={loading}
                    style={{
                        width: '100%', height: 46, borderRadius: 12, fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'var(--color-primary)', color: 'var(--color-on-primary)',
                        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s, transform 0.15s',
                        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                        marginTop: 4,
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.6' : '1'; }}>
                    {loading
                        ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                        : <>{tab === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight style={{ width: 14, height: 14 }} /></>
                    }
                </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 11, marginTop: 14, color: 'var(--color-text-subtle)' }}>
                {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => setTab(tab === 'login' ? 'signup' : 'login')}
                    style={{ fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}>
                    {tab === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
            </p>

            <p style={{ textAlign: 'center', fontSize: 10, marginTop: 10, color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
                By continuing you agree to our Terms of Service and Privacy Policy.
            </p>
        </>
    );
}
