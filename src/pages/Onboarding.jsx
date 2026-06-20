import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Cinematic timeline ──────────────────────────────────────────────────
   Architecture: pure CSS @keyframes driven by className toggling on a
   master rAF timeline. No React state transitions → zero repaints between
   animation frames → silky GPU-only compositing.
   ───────────────────────────────────────────────────────────────────────── */

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .cin-root {
    position: fixed; inset: 0; z-index: 99999;
    background: #000;
    font-family: 'Inter','SF Pro Display',system-ui,sans-serif;
    overflow: hidden;
    width: 100%; height: 100dvh;
    contain: strict;
  }

  /* ── Grain ── */
  .cin-grain {
    position: absolute; inset: 0; pointer-events: none; z-index: 40;
    mix-blend-mode: overlay; opacity: .45;
  }

  /* ── Scan lines ── */
  .cin-scan {
    position: absolute; inset: 0; pointer-events: none; z-index: 8;
    background-image: repeating-linear-gradient(
      0deg, transparent, transparent 2px,
      rgba(255,255,255,.012) 2px, rgba(255,255,255,.012) 4px
    );
  }

  /* ── Vignette ── */
  .cin-vignette {
    position: absolute; inset: 0; pointer-events: none; z-index: 9;
    background: radial-gradient(ellipse 100% 100% at 50% 50%,
      transparent 28%, rgba(0,0,0,.92) 100%);
  }

  /* ── Letterbox (removed — full screen like platform) ── */
  .cin-lb-top, .cin-lb-bot { display: none; }

  /* ── Flash overlay ── */
  .cin-flash {
    position: absolute; inset: 0; z-index: 60;
    background: #fff; pointer-events: none;
    opacity: 0;
  }
  .cin-flash.cut { animation: flashCut .18s ease-out forwards; }
  .cin-flash.white { animation: flashWhite .55s ease-out forwards; }
  @keyframes flashCut {
    0%  { opacity: .9 }
    100%{ opacity: 0 }
  }
  @keyframes flashWhite {
    0%  { opacity: 1 }
    60% { opacity: .15 }
    100%{ opacity: 0 }
  }

  /* ── Light sweep ── */
  .cin-sweep {
    position: absolute; top: -20%; bottom: -20%;
    width: 28%; left: -28%;
    background: linear-gradient(90deg,
      transparent 0%, rgba(255,255,255,.04) 40%,
      rgba(255,255,255,.13) 50%, rgba(255,255,255,.04) 60%, transparent 100%);
    transform: skewX(-10deg) translateZ(0);
    pointer-events: none; z-index: 7;
    will-change: left;
  }
  .cin-sweep.go { animation: sweep 1.1s cubic-bezier(.25,.46,.45,.94) forwards; }
  @keyframes sweep { to { left: 115%; } }

  /* ── Chromatic aberration on impact ── */
  .cin-ca {
    position: absolute; inset: 0; pointer-events: none; z-index: 6;
    opacity: 0;
  }
  .cin-ca.go {
    animation: caFlash .6s ease-out forwards;
  }
  @keyframes caFlash {
    0%   { opacity: 1; filter: url(#ca); }
    100% { opacity: 0; }
  }

  /* ── Scene wrapper ── */
  .cin-scene {
    position: absolute; inset: 0; z-index: 10;
    display: flex; align-items: center; justify-content: center;
    padding: clamp(64px,12vw,80px) clamp(16px,5vw,48px) clamp(48px,8vw,64px);
  }

  /* ═══ SCENE 1 — Studio card ══════════════════════════════════════════════ */
  .s1-wrap {
    text-align: center;
    opacity: 0;
    animation: s1In .9s cubic-bezier(.16,1,.3,1) .08s forwards;
  }
  .s1-wrap.out { animation: s1Out .5s ease-in forwards; }
  @keyframes s1In {
    from { opacity:0; filter:blur(12px); transform:scale(.93) translateZ(0); }
    to   { opacity:1; filter:blur(0);   transform:scale(1)   translateZ(0); }
  }
  @keyframes s1Out {
    to { opacity:0; filter:blur(6px); transform:scale(1.04) translateZ(0); }
  }
  .s1-line-top, .s1-line-bot {
    width: 1px; background: linear-gradient(180deg,transparent,rgba(255,255,255,.32));
    margin: 0 auto; height: 0;
  }
  .s1-line-top { animation: lineGrow clamp(0.4s,0.5s,0.6s) ease-out .3s forwards; }
  .s1-line-bot {
    background: linear-gradient(180deg,rgba(255,255,255,.32),transparent);
    animation: lineGrow .4s ease-out .7s forwards;
    margin-top: clamp(18px,4vw,26px);
  }
  @keyframes lineGrow { to { height: clamp(36px,7vw,56px); } }
  .s1-studio {
    font-size: clamp(1.2rem,5vw,2.5rem); font-weight: 800;
    letter-spacing: -.04em; color: #fff; line-height: 1;
    margin: clamp(18px,4vw,26px) 0 10px;
    opacity: 0; animation: fadeUp .55s ease-out .45s forwards;
  }
  .s1-presents {
    font-size: clamp(9px,2vw,11px); letter-spacing: .44em;
    color: rgba(255,255,255,.28); text-transform: uppercase; font-weight: 400;
    opacity: 0; animation: fadeUp .5s ease-out .65s forwards;
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(14px) translateZ(0); }
    to   { opacity:1; transform:translateY(0)    translateZ(0); }
  }

  /* ═══ SCENE 2 — Problem statements ═══════════════════════════════════════ */
  .s2-wrap { max-width: min(600px,90vw); width: 100%; }
  .s2-line { overflow: hidden; margin-bottom: clamp(10px,2.8vw,18px); }
  .s2-text {
    font-size: clamp(1rem,3.6vw,1.6rem); font-weight: 700;
    letter-spacing: -.03em; line-height: 1.2;
    background: linear-gradient(180deg,#fff 0%,rgba(255,255,255,.7) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    display: block;
    transform: translateY(110%) translateZ(0); opacity: 0;
    will-change: transform, opacity;
  }
  .s2-text.dim {
    background: linear-gradient(180deg,rgba(255,255,255,.78) 0%,rgba(255,255,255,.38) 100%);
    -webkit-background-clip: text; background-clip: text;
  }
  .s2-text.p0 { animation: slideUp .55s cubic-bezier(.16,1,.3,1) .1s forwards; }
  .s2-text.p1 { animation: slideUp .55s cubic-bezier(.16,1,.3,1) .52s forwards; }
  .s2-text.p2 { animation: slideUp .55s cubic-bezier(.16,1,.3,1) .92s forwards; }
  @keyframes slideUp {
    to { transform: translateY(0) translateZ(0); opacity:1; }
  }
  .s2-rule {
    height: 1px; margin-top: clamp(20px,5vw,36px);
    background: linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);
    transform: scaleX(0); transform-origin: left;
    animation: ruleIn .6s ease-out 1.5s forwards;
  }
  @keyframes ruleIn { to { transform: scaleX(1); } }
  .s2-wrap.out .s2-text { animation: fadeOut .4s ease-in forwards !important; }
  .s2-wrap.out .s2-rule { animation: fadeOut .4s ease-in forwards !important; }
  @keyframes fadeOut { to { opacity:0; } }

  /* ═══ SCENE 3 — TRUVORNEX reveal ═════════════════════════════════════════ */
  .s3-wrap { text-align: center; width: 100%; }
  .s3-wordmark {
    display: block;
    font-size: clamp(3.5rem,14vw,110px); font-weight: 900;
    letter-spacing: -.04em; line-height: 1;
    background: linear-gradient(180deg,#fff 0%,rgba(255,255,255,.55) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: clamp(12px,3vw,20px);
    opacity: 0; filter: blur(40px);
    transform: scale(.82) translateZ(0);
    will-change: transform, filter, opacity;
    animation: wordmarkIn 1.6s cubic-bezier(.16,1,.3,1) .1s forwards;
  }
  @keyframes wordmarkIn {
    to { opacity:1; filter:blur(0); transform:scale(1) translateZ(0); }
  }
  .s3-wordmark.out {
    animation: wordmarkOut .7s cubic-bezier(.4,0,1,1) forwards;
  }
  @keyframes wordmarkOut {
    to { opacity:0; filter:blur(16px); transform:scale(1.08) translateZ(0); }
  }
  .s3-rule {
    width: clamp(140px,42vw,400px); height: 1px; margin: 0 auto clamp(12px,3vw,18px);
    background: linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
    transform: scaleX(0); transform-origin: center;
    animation: ruleIn .7s ease-out 1s forwards;
  }
  .s3-sub {
    font-size: clamp(9px,2.2vw,13px); letter-spacing: .38em;
    text-transform: uppercase; font-weight: 300;
    color: rgba(255,255,255,.34);
    opacity: 0; transform: translateY(10px) translateZ(0);
    animation: fadeUp .9s cubic-bezier(.16,1,.3,1) 1.1s forwards;
  }

  /* ═══ SCENE 4 — Fast cuts ════════════════════════════════════════════════ */
  .s4-scene { text-align: center; width: 100%; padding: 0 clamp(8px,4vw,40px); }
  .s4-counter {
    font-size: clamp(9px,2vw,11px); letter-spacing: .35em;
    color: rgba(255,255,255,.18); text-transform: uppercase;
    margin-bottom: clamp(14px,3.5vw,22px); font-weight: 500;
    opacity: 0; animation: cutIn .18s ease-out forwards;
  }
  .s4-word {
    display: block;
    font-size: clamp(2.2rem,10vw,88px); font-weight: 900;
    letter-spacing: -.04em; line-height: .95;
    background: linear-gradient(180deg,#fff 0%,rgba(255,255,255,.6) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: clamp(8px,2vw,12px);
    opacity: 0; transform: translateY(22px) scale(.94) translateZ(0);
    will-change: transform, opacity;
    animation: cutIn .2s cubic-bezier(.16,1,.3,1) .02s forwards;
  }
  .s4-sub {
    font-size: clamp(10px,2.4vw,13px); font-weight: 300;
    letter-spacing: .2em; color: rgba(255,255,255,.26);
    text-transform: uppercase;
    opacity: 0; animation: cutIn .22s ease-out .06s forwards;
  }
  @keyframes cutIn {
    to { opacity: 1; transform: translateY(0) scale(1) translateZ(0); }
  }
  .s4-progress {
    position: absolute;
    bottom: clamp(20px,5vw,32px); left: 0; right: 0;
    display: flex; justify-content: center;
    gap: clamp(3px,1vw,5px); z-index: 15;
  }
  .s4-pip {
    height: 2px; border-radius: 1px;
    width: clamp(14px,3.5vw,22px);
    background: rgba(255,255,255,.08);
    transition: background .28s ease, box-shadow .28s ease;
  }
  .s4-pip.active {
    background: rgba(255,255,255,.7);
    box-shadow: 0 0 8px rgba(255,255,255,.5);
  }

  /* ═══ SCENE 5 — Final CTA ════════════════════════════════════════════════ */
  .s5-wrap {
    text-align: center;
    max-width: min(580px,92vw); width: 100%;
  }
  .s5-accent-top {
    width: 1px; height: 0; margin: 0 auto clamp(22px,5vw,34px);
    background: linear-gradient(180deg,transparent,rgba(255,255,255,.28));
    animation: accentGrow .7s ease-out .05s forwards;
  }
  @keyframes accentGrow { to { height: clamp(36px,7vw,58px); } }
  .s5-mask { overflow: hidden; }
  .s5-mask + .s5-mask { margin-top: 4px; margin-bottom: clamp(22px,5vw,34px); }
  .s5-h1 {
    display: block;
    font-size: clamp(1.8rem,7vw,3.9rem); font-weight: 900;
    letter-spacing: -.045em; line-height: 1.05;
    background: linear-gradient(180deg,#fff 0%,rgba(255,255,255,.88) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    transform: translateY(110%) translateZ(0); opacity: 0;
    animation: slideUp .75s cubic-bezier(.16,1,.3,1) .12s forwards;
    will-change: transform, opacity;
  }
  .s5-h1.dim {
    background: linear-gradient(180deg,rgba(255,255,255,.65) 0%,rgba(255,255,255,.32) 100%);
    -webkit-background-clip: text; background-clip: text;
    animation-delay: .26s;
  }
  .s5-rule {
    height: 1px; margin-bottom: clamp(14px,3.5vw,22px);
    background: linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
    transform: scaleX(0); transform-origin: center;
    animation: ruleIn .7s ease-out .55s forwards;
  }
  .s5-tagline {
    font-size: clamp(9px,2.1vw,11px); letter-spacing: .35em;
    color: rgba(255,255,255,.24); text-transform: uppercase; font-weight: 400;
    margin-bottom: clamp(30px,7vw,48px);
    opacity: 0; animation: fadeUp .6s ease-out .62s forwards;
  }
  .s5-btns {
    display: flex; flex-direction: column;
    gap: clamp(10px,2.5vw,12px); width: 100%;
    opacity: 0; transform: translateY(18px) translateZ(0);
    animation: fadeUp .65s cubic-bezier(.16,1,.3,1) .9s forwards;
    will-change: transform, opacity;
  }
  .s5-btn-primary, .s5-btn-ghost {
    width: 100%; border: none; cursor: pointer;
    font-family: inherit; letter-spacing: -.02em;
    border-radius: clamp(10px,2.5vw,14px);
    min-height: 52px; padding: clamp(14px,3.5vw,16px) 0;
    font-size: clamp(13px,3vw,15px); font-weight: 700;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: box-shadow .22s ease, transform .22s ease, background .22s ease, color .22s ease;
    will-change: transform;
  }
  .s5-btn-primary {
    background: #fff; color: #000;
    box-shadow: 0 0 32px rgba(255,255,255,.13);
  }
  .s5-btn-primary:hover { box-shadow: 0 0 52px rgba(255,255,255,.28); transform: translateY(-2px); }
  .s5-btn-primary:active { transform: translateY(0) scale(.98); }
  .s5-btn-ghost {
    background: rgba(255,255,255,.04); color: rgba(255,255,255,.68);
    border: 1px solid rgba(255,255,255,.15); backdrop-filter: blur(8px);
  }
  .s5-btn-ghost:hover { background: rgba(255,255,255,.09); color: #fff; }
  .s5-btn-ghost:active { transform: scale(.98); }
  .s5-accent-bot {
    width: 1px; height: 0; margin: clamp(28px,6vw,48px) auto 0;
    background: linear-gradient(180deg,rgba(255,255,255,.18),transparent);
    animation: accentGrow .6s ease-out .95s forwards;
  }

  /* ── Logo (top-right) ── */
  .cin-logo {
    position: absolute;
    top: clamp(12px,3vw,18px); right: clamp(12px,3vw,20px);
    z-index: 55; display: flex; flex-direction: row-reverse; align-items: center; gap: 9px;
    pointer-events: none;
  }
  .cin-logo-icon {
    width: clamp(34px,9vw,42px); height: clamp(34px,9vw,42px);
    border-radius: 10px;
    background: rgba(255,255,255,.13);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(255,255,255,.18);
    flex-shrink: 0;
  }
  .cin-logo-text {
    display: flex; flex-direction: column; line-height: 1;
    text-align: right;
  }
  .cin-logo-name {
    font-size: clamp(12px,3vw,15px); font-weight: 900;
    letter-spacing: -.03em; color: rgba(255,255,255,.95);
    white-space: nowrap;
  }
  .cin-logo-sub {
    font-size: clamp(8px,2vw,10px); font-weight: 400;
    letter-spacing: .06em; color: rgba(255,255,255,.38);
    white-space: nowrap; margin-top: 2px;
  }

  /* ── Skip ── */
  .cin-skip {
    position: absolute;
    bottom: clamp(20px,5vw,32px); right: clamp(16px,4vw,28px);
    z-index: 55; background: none; border: none; cursor: pointer;
    color: rgba(255,255,255,.2); font-family: inherit;
    font-size: clamp(10px,2vw,11px); letter-spacing: .15em;
    font-weight: 500; text-transform: uppercase;
    padding: 10px 4px; min-height: 44px; min-width: 44px;
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    transition: color .2s ease;
  }
  .cin-skip:hover { color: rgba(255,255,255,.55); }

  /* ── Master exit ── */
  .cin-root.exit { animation: rootExit .65s cubic-bezier(.4,0,1,1) forwards; }
  @keyframes rootExit {
    to { opacity: 0; }
  }
`;

const CUTS = [
    { word: 'SERVICES',      sub: 'Book in 60 seconds' },
    { word: 'TRANSPORT',     sub: 'Rides on demand' },
    { word: 'COMMITTEE',     sub: 'Community fund' },
    { word: 'MARKETPLACE',   sub: 'Local commerce' },
    { word: 'BLOOD NETWORK', sub: 'Life, shared' },
    { word: 'TOOL LIBRARY',  sub: 'Borrow anything' },
    { word: 'NEIGHBORHOOD',  sub: 'One OS for all' },
    { word: 'SIMON AI',      sub: 'Your intelligent city' },
];

function useGrain(ref) {
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let live = true, raf;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        const tick = () => {
            if (!live) return;
            const { width: w, height: h } = canvas;
            const img = ctx.createImageData(w, h);
            const d = img.data;
            for (let i = 0; i < d.length; i += 4) {
                const v = (Math.random() * 255) | 0;
                d[i] = d[i + 1] = d[i + 2] = v;
                d[i + 3] = (Math.random() * 22) | 0;
            }
            ctx.putImageData(img, 0, 0);
            raf = requestAnimationFrame(tick);
        };
        tick();
        return () => { live = false; window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
    }, []);
}

export default function Onboarding() {
    const navigate = useNavigate();
    const rootRef   = useRef(null);
    const flashRef  = useRef(null);
    const sweepRef  = useRef(null);
    const grainRef  = useRef(null);
    const sceneRef  = useRef(null);
    const skipRef   = useRef(null);
    const pipsRef   = useRef(null);
    const timers    = useRef([]);
    useGrain(grainRef);

    const T = (fn, ms) => {
        const id = setTimeout(fn, ms); timers.current.push(id); return id;
    };

    const flash = useCallback((type = 'cut') => {
        const el = flashRef.current;
        if (!el) return;
        el.className = 'cin-flash';
        void el.offsetWidth;
        el.className = `cin-flash ${type}`;
    }, []);

    const sweep = useCallback(() => {
        const el = sweepRef.current;
        if (!el) return;
        el.className = 'cin-sweep';
        void el.offsetWidth;
        el.className = 'cin-sweep go';
    }, []);

    const showSkip = useCallback((v) => {
        if (skipRef.current) skipRef.current.style.display = v ? 'block' : 'none';
    }, []);

    const exit = useCallback((dest) => {
        localStorage.setItem('truvornex_intro_seen', '1');
        timers.current.forEach(clearTimeout);
        const root = rootRef.current;
        if (root) root.classList.add('exit');
        setTimeout(() => navigate(dest, { replace: true }), 600);
    }, [navigate]);

    const goFinal = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        showSkip(false);
        flash('cut');

        setTimeout(() => {
            const s = sceneRef.current;
            if (!s) return;
            s.innerHTML = scene5Html();
            sweep();
            const p = s.querySelector('.s5-btn-primary');
            const g = s.querySelector('.s5-btn-ghost');
            if (p) p.onclick = () => exit('/login');
            if (g) g.onclick = () => exit('/');
        }, 160);
    }, [flash, sweep, exit, showSkip]);

    // ── HTML builders (no state → instant, zero re-render) ──────────────────

    const scene1Html = () => `
        <div class="s1-wrap" id="s1w">
            <div class="s1-line-top"></div>
            <p class="s1-studio">XYLVANTHREX LABS</p>
            <p class="s1-presents">PRESENTS</p>
            <div class="s1-line-bot"></div>
        </div>`;

    const scene2Html = () => `
        <div class="s2-wrap" id="s2w">
            <div class="s2-line"><span class="s2-text p0">Your neighborhood has 200 service workers.</span></div>
            <div class="s2-line"><span class="s2-text dim p1">None of them have a digital identity.</span></div>
            <div class="s2-line"><span class="s2-text dim p2">None of their work is recorded anywhere.</span></div>
            <div class="s2-rule"></div>
        </div>`;

    const scene3Html = () => `
        <div class="s3-wrap" id="s3w">
            <span class="s3-wordmark" id="s3word">TRUVORNEX</span>
            <div class="s3-rule"></div>
            <p class="s3-sub">The neighborhood operating system</p>
        </div>`;

    const scene4Html = (cut) => `
        <div class="s4-scene">
            <p class="s4-counter">${String(cut + 1).padStart(2, '0')} / ${String(CUTS.length).padStart(2, '0')}</p>
            <span class="s4-word">${CUTS[cut].word}</span>
            <p class="s4-sub">${CUTS[cut].sub}</p>
        </div>`;

    const scene5Html = () => `
        <div class="s5-wrap">
            <div class="s5-accent-top"></div>
            <div class="s5-mask"><span class="s5-h1">Built for the neighborhoods</span></div>
            <div class="s5-mask"><span class="s5-h1 dim">the world forgot.</span></div>
            <div class="s5-rule"></div>
            <p class="s5-tagline">Your neighborhood, connected</p>
            <div class="s5-btns">
                <button class="s5-btn-primary">Sign Up Free</button>
                <button class="s5-btn-ghost">Explore first</button>
            </div>
            <div class="s5-accent-bot"></div>
        </div>`;

    const updatePips = useCallback((cut) => {
        const el = pipsRef.current;
        if (!el) return;
        [...el.children].forEach((pip, i) => {
            pip.className = 's4-pip' + (i <= cut ? ' active' : '');
        });
    }, []);

    // ── Master timeline ──────────────────────────────────────────────────────
    useEffect(() => {
        const s = sceneRef.current;
        if (!s) return;

        // S1 — Studio card (0 – 2.7s)
        s.innerHTML = scene1Html();
        T(() => {
            const w = document.getElementById('s1w');
            if (w) w.classList.add('out');
            sweep();
        }, 2000);
        T(() => { flash('cut'); }, 2550);

        // S2 — Problem (2.7 – 6s)
        T(() => {
            s.innerHTML = scene2Html();
            showSkip(true);
        }, 2700);
        T(() => {
            const w = document.getElementById('s2w');
            if (w) w.classList.add('out');
        }, 5600);
        T(() => flash('cut'), 5900);

        // S3 — TRUVORNEX (6 – 9.6s)
        T(() => {
            s.innerHTML = scene3Html();
        }, 6050);
        T(() => { flash('white'); sweep(); }, 6100);
        T(() => {
            const w = document.getElementById('s3word');
            if (w) w.classList.add('out');
        }, 9100);
        T(() => flash('cut'), 9400);

        // S4 — Fast cuts (9.6 – 14.2s)
        T(() => {
            s.innerHTML = scene4Html(0);
            // build pip bar
            const pips = pipsRef.current;
            if (pips) {
                pips.style.display = 'flex';
                pips.innerHTML = CUTS.map((_, i) =>
                    `<div class="s4-pip${i === 0 ? ' active' : ''}"></div>`
                ).join('');
            }
        }, 9600);

        CUTS.forEach((_, i) => {
            if (i === 0) return;
            T(() => {
                flash('cut');
                setTimeout(() => {
                    s.innerHTML = scene4Html(i);
                    updatePips(i);
                }, 90);
            }, 9600 + i * 570);
        });

        T(() => {
            const pips = pipsRef.current;
            if (pips) pips.style.display = 'none';
            showSkip(false);
            flash('cut');
        }, 14100);

        // S5 — Final CTA (14.3s+)
        T(() => {
            s.innerHTML = scene5Html();
            sweep();
            const p = s.querySelector('.s5-btn-primary');
            const g = s.querySelector('.s5-btn-ghost');
            if (p) p.onclick = () => exit('/login');
            if (g) g.onclick = () => exit('/');
        }, 14320);

        return () => timers.current.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const fn = (e) => { if (e.key === 'Escape') goFinal(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [goFinal]);

    return (
        <>
            <style>{CSS}</style>

            {/* SVG filter for chromatic aberration */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="ca" colorInterpolationFilters="sRGB">
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
                        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
                        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
                        <feBlend in="red" in2="green" mode="screen" result="rg"/>
                        <feBlend in="rg" in2="blue" mode="screen"/>
                    </filter>
                </defs>
            </svg>

            <div ref={rootRef} className="cin-root">
                {/* Grain */}
                <canvas ref={grainRef} className="cin-grain" />

                {/* Scan lines */}
                <div className="cin-scan" />

                {/* Vignette */}
                <div className="cin-vignette" />

                {/* Logo — top-right */}
                <div className="cin-logo">
                    <div className="cin-logo-icon">
                        <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M3 8h7M3 12h8" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round"/>
                            <circle cx="13" cy="12" r="2.5" fill="rgba(255,255,255,0.7)"/>
                        </svg>
                    </div>
                    <div className="cin-logo-text">
                        <span className="cin-logo-name">TRUVORNEX</span>
                        <span className="cin-logo-sub">Service Platform</span>
                    </div>
                </div>

                {/* Light sweep */}
                <div ref={sweepRef} className="cin-sweep" />

                {/* Flash */}
                <div ref={flashRef} className="cin-flash" />

                {/* Progress pips (scene 4) */}
                <div ref={pipsRef} className="s4-progress" style={{ display: 'none' }} />

                {/* Scene content — mutated directly, no React re-renders */}
                <div className="cin-scene">
                    <div ref={sceneRef} style={{ width: '100%', display: 'contents' }} />
                </div>

                {/* Skip */}
                <button
                    ref={skipRef}
                    className="cin-skip"
                    style={{ display: 'none' }}
                    onClick={goFinal}
                >
                    Skip →
                </button>
            </div>
        </>
    );
}
