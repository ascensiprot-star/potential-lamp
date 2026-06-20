import { useState, useRef, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

/* ─── Slide data ─────────────────────────────────────────────── */
const SLIDES = [
    {
        id: 0,
        overline: 'Welcome',
        title: 'Your neighborhood,\nconnected',
        body: 'Truvornex connects you with trusted local service providers — powered by Simon AI, built for your community.',
    },
    {
        id: 1,
        overline: 'One App',
        title: 'Every home need,\ncovered',
        body: 'From emergency plumbing at 2 am to weekly cleaning — book any local service 24/7, in seconds.',
    },
    {
        id: 2,
        overline: 'Community First',
        title: 'Trust built by\nneighbors',
        body: "Finding trustworthy help shouldn't take hours. Real people, real reviews, real results.",
    },
    {
        id: 3,
        overline: 'Get Started',
        title: 'Ready to join your\nneighborhood?',
        body: 'Free to join. No hidden fees. It only takes 30 seconds to get started.',
        isCta: true,
    },
];

const SLIDE_DURATION = 5200; // ms per slide before auto-advance

/* ─── Logo particle generator ────────────────────────────────── */
// Fills the favicon logo shape (32×32) with a dense grid of particles.
// Each line is a thick filled band; the circle is a solid filled disk.
// Result: a bold particle sculpture, not a wireframe outline.
function generateParticles(W, H) {
    // Large, centered logo — unmissable on every screen size
    const scale = Math.min(W * 0.55, H * 0.42) / 32;
    const ox = W * 0.5;   // always centered horizontally
    const oy = H * 0.26;  // upper-center vertically — kept high so text never overlaps
    const STEP     = 0.34;       // grid spacing in logo-space units
    const HALF_T   = 1.5;        // half-thickness of each line band

    const pts = [];

    // Helper: fill a thick horizontal band between x1→x2, centered at cy
    const fillBand = (x1, x2, cy) => {
        for (let x = x1; x <= x2; x += STEP) {
            for (let y = cy - HALF_T; y <= cy + HALF_T; y += STEP) {
                pts.push({
                    tx: ox + (x - 16) * scale,
                    ty: oy + (y - 16) * scale,
                });
            }
        }
    };

    // Helper: fill a solid disk
    const fillDisk = (cx, cy, r) => {
        for (let x = cx - r; x <= cx + r; x += STEP) {
            for (let y = cy - r; y <= cy + r; y += STEP) {
                if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
                    pts.push({
                        tx: ox + (x - 16) * scale,
                        ty: oy + (y - 16) * scale,
                    });
                }
            }
        }
    };

    // Three horizontal lines from favicon (stroke-width ≈ 2 → HALF_T covers it)
    fillBand(8, 24, 10);   // top line
    fillBand(8, 22, 16);   // middle line
    fillBand(8, 20, 22);   // bottom line

    // Filled circle (cx=24, cy=22, r=4)
    fillDisk(24, 22, 4);

    // Scatter particles from random positions — they spring into formation on load
    return pts.map(p => ({
        tx:          p.tx,
        ty:          p.ty,
        x:           p.tx + (Math.random() - 0.5) * W * 0.55,
        y:           p.ty + (Math.random() - 0.5) * H * 0.55,
        vx:          0,
        vy:          0,
        size:        2.0 + Math.random() * 2.4,       // large, unmissable
        baseOpacity: 0.24 + Math.random() * 0.34,     // bright and visible
        phase:       Math.random() * Math.PI * 2,     // offset for breathing
    }));
}

/* ─── Canvas particle system ─────────────────────────────────── */
// Fully self-contained — listens to window events, never triggers
// React re-renders during animation. Zero props change on mousemove.
function LogoParticles() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Mutable state stored in a plain object to avoid React overhead
        const state = {
            particles: [],
            mouseX: -9999,
            mouseY: -9999,
            ripples: [],   // [ { x, y, r, maxR, str } ]
            raf: null,
        };

        // Resize → regenerate particle targets
        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            const fresh = generateParticles(canvas.width, canvas.height);
            // Preserve current positions if particles already exist
            if (state.particles.length === fresh.length) {
                fresh.forEach((p, i) => {
                    p.x  = state.particles[i].x;
                    p.y  = state.particles[i].y;
                    p.vx = state.particles[i].vx;
                    p.vy = state.particles[i].vy;
                });
            }
            state.particles = fresh;
        };
        resize();
        window.addEventListener('resize', resize);

        // Track pointer (mouse + touch)
        const onMouseMove  = e => { state.mouseX = e.clientX; state.mouseY = e.clientY; };
        const onMouseLeave = ()  => { state.mouseX = -9999; state.mouseY = -9999; };
        const onTouchMove  = e => {
            if (e.touches.length) {
                state.mouseX = e.touches[0].clientX;
                state.mouseY = e.touches[0].clientY;
            }
        };
        const onTouchEnd = () => { state.mouseX = -9999; state.mouseY = -9999; };

        // Ripple on click or tap — radiating wave of repulsion
        const spawnRipple = (x, y) => {
            const maxR = Math.min(canvas.width, canvas.height) * 0.55;
            state.ripples.push({ x, y, r: 0, maxR, str: 9 });
            // Cap to 4 simultaneous ripples to stay performant
            if (state.ripples.length > 4) state.ripples.shift();
        };
        const onClick      = e => spawnRipple(e.clientX, e.clientY);
        const onTouchStart = e => {
            if (e.touches.length) spawnRipple(e.touches[0].clientX, e.touches[0].clientY);
        };

        window.addEventListener('mousemove',  onMouseMove);
        window.addEventListener('mouseleave', onMouseLeave);
        window.addEventListener('touchmove',  onTouchMove,  { passive: true });
        window.addEventListener('touchend',   onTouchEnd);
        window.addEventListener('click',      onClick);
        window.addEventListener('touchstart', onTouchStart, { passive: true });

        // Automatic ripples from logo centre — make interactivity unmistakably obvious
        const initRipple = setTimeout(() => {
            const cx = canvas.width  * 0.5;
            const cy = canvas.height * 0.26;
            state.ripples.push({ x: cx, y: cy, r: 0, maxR: Math.min(canvas.width, canvas.height) * 0.60, str: 14 });
        }, 900);
        const autoRippleId = setInterval(() => {
            const cx = canvas.width  * 0.5;
            const cy = canvas.height * 0.26;
            state.ripples.push({ x: cx, y: cy, r: 0, maxR: Math.min(canvas.width, canvas.height) * 0.56, str: 10 });
            if (state.ripples.length > 4) state.ripples.shift();
        }, 4000);

        // Physics constants
        const STIFFNESS     = 0.038;  // spring return speed
        const DAMPING       = 0.80;   // velocity decay
        const REPEL_RADIUS  = 110;    // px — cursor influence radius
        const REPEL_STRENGTH = 5.5;   // repulsion force

        // Wave-front band width (px) — particles inside this get pushed
        const WAVE_BAND = 38;
        const WAVE_SPEED = 7; // px per frame

        // 60 FPS animation loop — breathing + mouse repulsion + ripple wave
        const animate = (now) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Advance and expire ripples
            for (const rp of state.ripples) rp.r += WAVE_SPEED;
            state.ripples = state.ripples.filter(rp => rp.r < rp.maxR);

            for (const p of state.particles) {
                // Spring force back toward target
                p.vx = (p.vx + (p.tx - p.x) * STIFFNESS) * DAMPING;
                p.vy = (p.vy + (p.ty - p.y) * STIFFNESS) * DAMPING;

                // Continuous mouse/touch repulsion
                const mdx  = p.x - state.mouseX;
                const mdy  = p.y - state.mouseY;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < REPEL_RADIUS && mdist > 0.5) {
                    const f = Math.pow(1 - mdist / REPEL_RADIUS, 2) * REPEL_STRENGTH;
                    p.vx += (mdx / mdist) * f;
                    p.vy += (mdy / mdist) * f;
                }

                // Ripple wave-front force — particles near the expanding ring get blasted
                for (const rp of state.ripples) {
                    const rdx  = p.x - rp.x;
                    const rdy  = p.y - rp.y;
                    const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
                    if (rdist < 1) continue;
                    const waveDelta = Math.abs(rdist - rp.r);
                    if (waveDelta < WAVE_BAND) {
                        // Force peaks at wave front, fades toward edges of band
                        // Also fades as ripple expands (energy dissipates)
                        const bandFade   = 1 - waveDelta / WAVE_BAND;
                        const ageFade    = 1 - rp.r / rp.maxR;
                        const f = bandFade * bandFade * ageFade * rp.str;
                        p.vx += (rdx / rdist) * f;
                        p.vy += (rdy / rdist) * f;
                    }
                }

                p.x += p.vx;
                p.y += p.vy;

                // Ambient breathing — staggered sine per particle
                const pulse = Math.sin(now * 0.00075 + p.phase) * 0.13;
                const alpha = Math.max(0.05, Math.min(0.68, p.baseOpacity + pulse));

                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }

            state.raf = requestAnimationFrame(animate);
        };
        state.raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(state.raf);
            clearTimeout(initRipple);
            clearInterval(autoRippleId);
            window.removeEventListener('resize',      resize);
            window.removeEventListener('mousemove',   onMouseMove);
            window.removeEventListener('mouseleave',  onMouseLeave);
            window.removeEventListener('touchmove',   onTouchMove);
            window.removeEventListener('touchend',    onTouchEnd);
            window.removeEventListener('click',       onClick);
            window.removeEventListener('touchstart',  onTouchStart);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: 1,
                opacity: 1,
            }}
        />
    );
}

/* ─── Auto-advance progress bar ──────────────────────────────── */
// Renders a thin animated fill inside the active slide dot.
// `timerKey` forces a CSS animation restart on each navigation.
function ProgressDot({ active, done, onClick, timerKey }) {
    return (
        <button
            onClick={onClick}
            aria-label="Go to slide"
            style={{
                position: 'relative',
                height: 3,
                width: active ? 40 : 4,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                background: active ? 'rgba(255,255,255,0.1)' : done
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(255,255,255,0.08)',
                transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
                minHeight: 20,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            {active && (
                <div
                    key={timerKey}
                    style={{
                        position: 'absolute', inset: 0,
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.82)',
                        transformOrigin: 'left center',
                        animation: `dotFill ${SLIDE_DURATION}ms linear forwards`,
                    }}
                />
            )}
        </button>
    );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function IntroFlow({ onComplete }) {
    const [current,  setCurrent]  = useState(0);
    const [visible,  setVisible]  = useState(true);
    const [leaving,  setLeaving]  = useState(false);
    const [timerKey, setTimerKey] = useState(0); // bumped on each slide change

    const locked       = useRef(false);
    const touchStartX  = useRef(null);
    const autoTimer    = useRef(null);

    const slide  = SLIDES[current];
    const isLast = current === SLIDES.length - 1;

    /* Slide transition — cross-dissolve */
    const transition = (nextIdx, fromUser = false) => {
        if (locked.current) return;
        locked.current = true;

        // Reset auto-advance timer on manual navigation
        if (fromUser) resetAutoTimer(nextIdx);

        setVisible(false);
        setTimeout(() => {
            setCurrent(nextIdx);
            setTimerKey(k => k + 1);
            setVisible(true);
            setTimeout(() => { locked.current = false; }, 480);
        }, 340);
    };

    const next  = (fromUser = false) => isLast ? finish() : transition(current + 1, fromUser);
    const goTo  = idx => {
        if (idx === current || idx < 0 || idx >= SLIDES.length) return;
        transition(idx, true);
    };
    const finish = () => {
        clearTimeout(autoTimer.current);
        setLeaving(true);
        setTimeout(() => {
            localStorage.setItem('truvornex-intro-v2', '1');
            onComplete();
        }, 700);
    };

    /* Auto-advance timer */
    const resetAutoTimer = (nextIdx) => {
        clearTimeout(autoTimer.current);
        if (nextIdx >= SLIDES.length - 1) return; // no timer on last slide
        autoTimer.current = setTimeout(() => {
            if (!locked.current) transition(nextIdx + 1);
        }, SLIDE_DURATION + 360); // +360 accounts for transition duration
    };

    // Initial timer + restart on slide change
    useEffect(() => {
        if (isLast) return;
        clearTimeout(autoTimer.current);
        autoTimer.current = setTimeout(() => {
            next();
        }, SLIDE_DURATION);
        return () => clearTimeout(autoTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current]);

    /* Swipe gestures */
    const onTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd   = e => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (delta < -50) next(true);
        else if (delta > 50 && current > 0) goTo(current - 1);
    };

    /* ── Render ── */
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                width: '100%', height: '100dvh',
                background: '#000',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                opacity: leaving ? 0 : 1,
                transition: leaving ? 'opacity 0.7s ease' : 'none',
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* ── Particle logo background ─────────── */}
            <LogoParticles />

            {/* ── Interaction hint — fades in then out ─ */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: '52%', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 8, textAlign: 'center', pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    animation: 'hintFadeInOut 4.5s ease forwards 1.2s',
                    opacity: 0,
                }}
            >
                <style>{`@keyframes hintFadeInOut{0%{opacity:0}12%{opacity:1}72%{opacity:1}100%{opacity:0}}`}</style>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                    marginBottom: 6,
                }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
                    </div>
                    <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, color: 'rgba(255,255,255,0.38)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                        Move cursor · Tap to interact
                    </span>
                </div>
            </div>

            {/* ── Ambient gradient — white top light ── */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse 110% 55% at 50% -8%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 55%, transparent 80%)',
                }}
            />

            {/* ── Vignette + bottom scrim ──────────── */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 100%)',
                }}
            />
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '45%', zIndex: 4, pointerEvents: 'none',
                    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.75) 80%, #000 100%)',
                }}
            />

            {/* ── Skip button ──────────────────────── */}
            <button
                onClick={finish}
                style={{
                    position: 'absolute', top: 20, right: 20, zIndex: 30,
                    fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.22)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, minHeight: 44, minWidth: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                    transition: 'color 0.25s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.22)'}
            >
                Skip
            </button>

            {/* ── Slide content — cross-dissolve ───── */}
            <div
                style={{
                    position: 'relative', zIndex: 10,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-start',
                    padding: '0 clamp(24px, 6vw, 56px) clamp(20px, 4vh, 36px)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(18px)',
                    transition: 'opacity 0.44s cubic-bezier(0.16,1,0.3,1), transform 0.44s cubic-bezier(0.16,1,0.3,1)',
                }}
            >
                <div style={{ width: '100%' }}>
                    {/* Overline */}
                    <p style={{
                        fontSize: 'clamp(9px, 2.2vw, 11px)',
                        fontWeight: 600,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.28)',
                        marginBottom: 'clamp(12px, 2.5vw, 18px)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                        {slide.overline}
                    </p>

                    {/* Title */}
                    <h1 style={{
                        fontSize: 'clamp(2.2rem, 10vw, 4rem)',
                        fontWeight: 700,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        letterSpacing: '-0.04em',
                        lineHeight: 1.06,
                        color: '#fff',
                        marginBottom: 'clamp(14px, 3.5vw, 22px)',
                        whiteSpace: 'pre-line',
                    }}>
                        {slide.title}
                    </h1>

                    {/* Body */}
                    <p style={{
                        fontSize: 'clamp(13px, 3.2vw, 15px)',
                        lineHeight: 1.75,
                        color: 'rgba(255,255,255,0.33)',
                        letterSpacing: '-0.01em',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        maxWidth: '38ch',
                    }}>
                        {slide.body}
                    </p>
                </div>
            </div>

            {/* ── Bottom nav ───────────────────────── */}
            <div
                style={{
                    position: 'relative', zIndex: 20,
                    padding: '0 clamp(24px, 6vw, 56px)',
                    paddingBottom: 'max(36px, env(safe-area-inset-bottom, 36px))',
                    paddingTop: 20,
                }}
            >
                {/* Progress dots with animated fill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                    {SLIDES.map((_, i) => (
                        <ProgressDot
                            key={i}
                            active={i === current}
                            done={i < current}
                            timerKey={timerKey}
                            onClick={() => goTo(i)}
                        />
                    ))}
                </div>

                {/* CTA button — full width */}
                <button
                    onClick={() => next(true)}
                    style={{
                        width: '100%',
                        height: 'clamp(50px, 13vw, 56px)',
                        borderRadius: 14,
                        fontSize: 'clamp(14px, 3.5vw, 16px)',
                        fontWeight: 600,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: '#fff',
                        color: '#000',
                        border: 'none',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.984)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {isLast ? 'Get Started' : 'Continue'}
                    <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
            </div>

            {/* ── Global keyframes ─────────────────── */}
            <style>{`
                @keyframes dotFill {
                    from { transform: scaleX(0); }
                    to   { transform: scaleX(1); }
                }
            `}</style>
        </div>
    );
}
