import { useEffect, useState, useRef } from 'react';

export default function SplashScreen({ onComplete }) {
    const [phase, setPhase] = useState(0);
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let running = true;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        function drawGrain() {
            if (!running) return;
            const w = canvas.width, h = canvas.height;
            const imageData = ctx.createImageData(w, h);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const v = (Math.random() * 255) | 0;
                data[i] = data[i + 1] = data[i + 2] = v;
                data[i + 3] = (Math.random() * 8) | 0;
            }
            ctx.putImageData(imageData, 0, 0);
            rafRef.current = requestAnimationFrame(drawGrain);
        }
        drawGrain();

        return () => {
            running = false;
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    useEffect(() => {
        const t0 = setTimeout(() => setPhase(1), 80);
        const t1 = setTimeout(() => setPhase(2), 1000);
        const t2 = setTimeout(() => setPhase(3), 2400);
        const t3 = setTimeout(() => setPhase(4), 3900);
        const t4 = setTimeout(() => setPhase(5), 5400);
        const t5 = setTimeout(() => onComplete(), 6200);
        return () => [t0, t1, t2, t3, t4, t5].forEach(clearTimeout);
    }, [onComplete]);

    const exiting = phase === 5;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000',
            overflow: 'hidden',
            opacity: exiting ? 0 : 1,
            transition: exiting ? 'opacity 1s ease' : 'none',
        }}>
            {/* Film grain */}
            <canvas ref={canvasRef} style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                mixBlendMode: 'overlay', opacity: 0.3, zIndex: 30,
            }} />

            {/* Gradient light — black to white, centered */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 70% 55% at 50% 44%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 55%, transparent 80%)',
                opacity: phase >= 2 ? 1 : 0,
                transition: 'opacity 2.5s ease',
            }} />

            {/* Letterbox — top */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: phase >= 1 ? '10%' : '0%',
                background: '#000',
                transition: 'height 1.6s cubic-bezier(0.76,0,0.24,1)',
                zIndex: 20,
            }} />
            {/* Letterbox — bottom */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: phase >= 1 ? '10%' : '0%',
                background: '#000',
                transition: 'height 1.6s cubic-bezier(0.76,0,0.24,1)',
                zIndex: 20,
            }} />

            {/* Center content */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}>
                {/* Wordmark */}
                <h1 style={{
                    fontSize: 'clamp(32px, 8vw, 64px)',
                    fontWeight: 700,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    letterSpacing: '-0.05em',
                    lineHeight: 1,
                    color: '#fff',
                    margin: '0 0 18px',
                    textAlign: 'center',
                    opacity: phase >= 2 ? 1 : 0,
                    transition: 'opacity 2s cubic-bezier(0.16,1,0.3,1)',
                }}>
                    TRUVORNEX
                </h1>

                {/* Tagline */}
                <p style={{
                    fontSize: 'clamp(9px, 1.6vw, 11px)',
                    letterSpacing: '0.26em',
                    textTransform: 'uppercase',
                    fontWeight: 400,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: 'rgba(255,255,255,0.28)',
                    margin: 0,
                    textAlign: 'center',
                    opacity: phase >= 3 ? 1 : 0,
                    transition: 'opacity 2s ease',
                }}>
                    Your neighborhood, connected
                </p>

                {/* Loading bar */}
                <div style={{
                    position: 'absolute',
                    bottom: '15%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    opacity: phase >= 3 ? 1 : 0,
                    transition: 'opacity 1.4s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                }}>
                    <div style={{
                        width: 100, height: 1,
                        background: 'rgba(255,255,255,0.07)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: phase >= 3 ? '100%' : '0%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                            transition: 'width 2s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                    </div>
                    <span style={{
                        fontSize: 8,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.12)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                    }}>
                        Simon AI
                    </span>
                </div>
            </div>
        </div>
    );
}
