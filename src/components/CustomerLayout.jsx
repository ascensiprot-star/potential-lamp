import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import SimonZonePulse from '@/components/simon/SimonZonePulse';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import {
    Home, Compass, Sparkles, BarChart3, User, Moon, Sun,
    Bell, Search, Menu, X, Briefcase,
    Heart, MapPin, Clock, Star, Settings, HelpCircle,
    MessageSquare, Repeat, Gift, Zap, ChevronRight,
    PanelLeftClose, PanelLeftOpen, LogIn, LogOut,
    Wallet, ShoppingBag, PiggyBank, Globe, Car, Users, Calendar,
} from 'lucide-react';

const NAV_ITEMS = [
    { path: '/',            icon: Home,        label: 'Home',       exact: true },
    { path: '/services',    icon: Compass,     label: 'Explore' },
    { path: '/marketplace', icon: ShoppingBag, label: 'Market' },
    { path: '/wallet',      icon: Wallet,      label: 'Wallet' },
    { path: '/ai',          icon: Sparkles,    label: 'Simon AI' },
    { path: '/profile',     icon: User,        label: 'Profile' },
];

const MORE_ITEMS = [
    { path: '/chat',                   icon: MessageSquare, label: 'Messages'      },
    { path: '/committee',              icon: PiggyBank,     label: 'Committee'     },
    { path: '/neighborhood',           icon: Globe,         label: 'Neighborhood'  },
    { path: '/transport',              icon: Car,           label: 'Transport'     },
    { path: '/events',                 icon: Calendar,      label: 'Events'        },
    { path: '/community',              icon: Users,         label: 'Community'     },
    { path: '/favorites',              icon: Heart,         label: 'Saved'         },
    { path: '/booking-history',        icon: Clock,         label: 'Booking History'},
    { path: '/loyalty',                icon: Star,          label: 'Loyalty'       },
    { path: '/bundles',                icon: Briefcase,     label: 'Group Deals'   },
    { path: '/spending',               icon: BarChart3,     label: 'Spending'      },
    { path: '/recurring',              icon: Repeat,        label: 'Recurring'     },
    { path: '/gift-cards',             icon: Gift,          label: 'Gift Cards'    },
    { path: '/emergency',              icon: Zap,           label: 'Emergency'     },
    { path: '/saved-addresses',        icon: MapPin,        label: 'Addresses'     },
    { path: '/help',                   icon: HelpCircle,    label: 'Help'          },
    { path: '/notification-settings',  icon: Bell,          label: 'Notifications' },
    { path: '/privacy',                icon: Settings,      label: 'Settings'      },
];

export default function CustomerLayout() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const { isAuthenticated, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() =>
        localStorage.getItem('truvornex-sidebar-collapsed') === 'true'
    );
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
    const searchRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleCollapsed = () => {
        setCollapsed(c => {
            localStorage.setItem('truvornex-sidebar-collapsed', String(!c));
            return !c;
        });
    };

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);
    useEffect(() => { if (searchOpen && searchRef.current) searchRef.current.focus(); }, [searchOpen]);
    useEffect(() => { setSidebarOpen(false); setSearchOpen(false); }, [pathname]);

    const isActive = (item) =>
        item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + '/');

    const handleSearch = (e) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (q) { navigate(`/services?q=${encodeURIComponent(q)}`); setSearchOpen(false); setSearchQuery(''); }
    };

    /* ── Sidebar ──────────────────────────────────────────────────── */
    const SidebarInner = ({ onClose }) => {
        const isMobile = !!onClose;
        const slim = !isMobile && collapsed;

        return (
            <div className="flex flex-col h-full overflow-hidden" style={{ width: '100%' }}>
                {/* Logo */}
                <div className="flex items-center justify-between px-3 py-3.5"
                    style={{ borderBottom: '1px solid var(--color-border)', minHeight: 52, flexShrink: 0 }}>
                    <Link to="/" onClick={onClose} className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'var(--color-primary)', boxShadow: 'var(--shadow-xs)', transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M3 4h10M3 8h7M3 12h8" stroke="var(--color-on-primary)" strokeWidth="1.8" strokeLinecap="round"/>
                                <circle cx="13" cy="12" r="2.5" fill="var(--color-on-primary)" fillOpacity="0.8"/>
                            </svg>
                        </div>
                        {!slim && (
                            <div className="min-w-0">
                                <h1 className="text-xs font-black" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>TRUVORNEX</h1>
                                <p className="text-[9px]" style={{ color: 'var(--color-text-subtle)', letterSpacing: '0.02em' }}>Service Platform</p>
                            </div>
                        )}
                    </Link>
                    {/* Mobile close / Desktop collapse */}
                    {isMobile ? (
                        <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center"
                            style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }}>
                            <X className="h-3.5 w-3.5" />
                        </button>
                    ) : (
                        <button onClick={toggleCollapsed}
                            className="h-7 w-7 rounded-md flex items-center justify-center transition-all"
                            style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-subtle)')}>
                            {collapsed
                                ? <PanelLeftOpen className="h-3.5 w-3.5" />
                                : <PanelLeftClose className="h-3.5 w-3.5" />}
                        </button>
                    )}
                </div>

                {/* Role switcher */}
                {!slim && (
                    <div className="px-2.5 py-2" style={{ borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                        <div className="flex rounded-lg p-0.5 gap-0.5" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <span className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                                Customer
                            </span>
                            <button onClick={() => { navigate('/provider'); onClose?.(); }}
                                className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-0.5"
                                style={{ color: 'var(--color-text-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                Provider <ChevronRight style={{ width: 9, height: 9 }} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search pill */}
                {!slim && (
                    <div className="px-2.5 py-2" style={{ borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
                        <button onClick={() => { setSearchOpen(true); onClose?.(); }}
                            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs"
                            style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-subtle)', border: '1px solid var(--color-border)', transition: 'border-color 0.18s' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                            <Search className="h-3 w-3 shrink-0" />
                            <span>Search services…</span>
                            <span className="ml-auto text-[10px] px-1 py-0.5 rounded font-mono"
                                style={{ backgroundColor: 'var(--color-surface-highest)', color: 'var(--color-text-subtle)' }}>⌘K</span>
                        </button>
                    </div>
                )}

                {/* Simon Zone Pulse */}
                {!slim && <SimonZonePulse />}

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-2 no-scrollbar" style={{ padding: slim ? '8px 6px' : '8px 6px' }}>
                    <div className="space-y-0.5">
                        {NAV_ITEMS.map((item, i) => {
                            const active = isActive(item);
                            return (
                                <Link key={item.path} to={item.path} onClick={onClose}
                                    className="relative flex items-center rounded-lg transition-all duration-150"
                                    title={slim ? item.label : undefined}
                                    style={{
                                        padding: slim ? '8px' : '8px 10px',
                                        gap: slim ? 0 : 10,
                                        justifyContent: slim ? 'center' : 'flex-start',
                                        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        backgroundColor: active ? 'var(--color-surface-high)' : 'transparent',
                                        fontSize: 13,
                                        fontWeight: active ? 600 : 450,
                                        animation: `navSlideIn 0.32s cubic-bezier(0.19,1,0.22,1) ${i * 0.045}s both`,
                                    }}
                                    onMouseEnter={e => !active && (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                                    onMouseLeave={e => !active && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full"
                                        style={{ backgroundColor: 'var(--color-primary)', marginLeft: -1, boxShadow: '0 0 8px rgba(255,255,255,0.35)' }} />}
                                    <item.icon style={{ width: 15, height: 15, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                                    {!slim && <span style={{ letterSpacing: '-0.01em' }}>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>

                    {!slim && (
                        <>
                            <div className="px-2.5 pt-4 pb-1.5">
                                <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>More</span>
                            </div>
                            <div className="space-y-0.5">
                                {MORE_ITEMS.map((item, i) => (
                                    <Link key={item.path} to={item.path} onClick={onClose}
                                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all"
                                        style={{ color: 'var(--color-text-muted)', letterSpacing: '-0.01em', animation: `navSlideIn 0.3s cubic-bezier(0.19,1,0.22,1) ${(NAV_ITEMS.length + i) * 0.03}s both` }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                        <item.icon style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.5 }} />
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Slim mode: more items as icons */}
                    {slim && (
                        <div className="space-y-0.5 mt-2 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                            {MORE_ITEMS.slice(0, 6).map(item => (
                                <Link key={item.path} to={item.path}
                                    title={item.label}
                                    className="flex items-center justify-center rounded-lg transition-all"
                                    style={{ padding: '7px', color: 'var(--color-text-subtle)' }}
                                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-subtle)')}>
                                    <item.icon style={{ width: 13, height: 13 }} />
                                </Link>
                            ))}
                        </div>
                    )}
                </nav>

                {/* Bottom row */}
                <div className="py-2" style={{ borderTop: '1px solid var(--color-border)', flexShrink: 0, padding: slim ? '8px 6px' : '8px 6px' }}>
                    {/* Sign In / Sign Out */}
                    {!isAuthenticated ? (
                        <button onClick={() => { navigate('/login'); onClose?.(); }}
                            className="w-full flex items-center rounded-lg transition-all mb-0.5"
                            title={slim ? 'Sign In' : undefined}
                            style={{ padding: slim ? '8px' : '8px 10px', gap: slim ? 0 : 10, justifyContent: slim ? 'center' : 'flex-start', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <LogIn style={{ width: 13, height: 13, flexShrink: 0 }} />
                            {!slim && <span>Sign In</span>}
                        </button>
                    ) : (
                        <button onClick={() => { logout(); onClose?.(); }}
                            className="w-full flex items-center rounded-lg transition-all mb-0.5"
                            title={slim ? 'Sign Out' : undefined}
                            style={{ padding: slim ? '8px' : '8px 10px', gap: slim ? 0 : 10, justifyContent: slim ? 'center' : 'flex-start', color: 'var(--color-text-muted)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                            <LogOut style={{ width: 13, height: 13, flexShrink: 0 }} />
                            {!slim && <span>Sign Out</span>}
                        </button>
                    )}
                    <button onClick={toggleTheme}
                        className="w-full flex items-center rounded-lg transition-all"
                        title={slim ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
                        style={{
                            padding: slim ? '8px' : '8px 10px',
                            gap: slim ? 0 : 10,
                            justifyContent: slim ? 'center' : 'flex-start',
                            color: 'var(--color-text-muted)',
                            fontSize: 12,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                        {theme === 'dark'
                            ? <Sun style={{ width: 13, height: 13, flexShrink: 0 }} />
                            : <Moon style={{ width: 13, height: 13, flexShrink: 0 }} />}
                        {!slim && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>
                </div>
            </div>
        );
    };

    const sidebarW = collapsed ? 56 : 224;

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
            onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSidebarOpen(false); } }}>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 h-full flex-col z-40 transition-all"
                style={{
                    width: sidebarW,
                    backgroundColor: 'var(--color-surface)',
                    borderRight: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'width 0.22s cubic-bezier(0.25,1,0.5,1)',
                    overflow: 'hidden',
                }}>
                <SidebarInner />
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-1"
                style={scrolled ? {
                    backgroundColor: 'var(--color-glass)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderBottom: '1px solid var(--color-border)',
                } : { backgroundColor: 'transparent' }}>
                <div className="flex items-center">
                    {/* Hamburger — full 44×44 tap target */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 12 }}>
                        <Menu style={{ width: 20, height: 20 }} />
                    </button>
                    <Link to="/" className="flex items-center gap-1.5 ml-1" style={{ touchAction: 'manipulation' }}>
                        <div className="h-5 w-5 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: 'var(--color-primary)' }}>
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                <path d="M3 4h10M3 8h7M3 12h8" stroke="var(--color-on-primary)" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <span className="text-xs font-black" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>TRUVORNEX</span>
                    </Link>
                </div>
                <div className="flex items-center">
                    {/* Search — 44×44 */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Search style={{ width: 18, height: 18 }} />
                    </button>
                    {/* Theme — 44×44 */}
                    <button
                        onClick={toggleTheme}
                        style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {theme === 'dark' ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
                    </button>
                    {/* Provider — 44×44 tap area with pill label */}
                    <button
                        onClick={() => navigate('/provider')}
                        style={{ height: 44, paddingLeft: 10, paddingRight: 10, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Briefcase style={{ width: 9, height: 9 }} />
                            Provider
                        </span>
                    </button>
                </div>
            </header>

            {/* Mobile Drawer */}
            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 z-50" style={{ animation: 'fadeIn 0.15s ease' }}>
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setSidebarOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-64 flex flex-col"
                        style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', zIndex: 51, animation: 'slideInLeft 0.28s cubic-bezier(0.19,1,0.22,1)' }}>
                        <SidebarInner onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* Search Overlay */}
            {searchOpen && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center pt-20 md:pt-28 px-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(24px)', animation: 'fadeIn 0.12s ease' }}>
                    <div className="w-full max-w-lg" style={{ animation: 'scaleIn 0.18s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ width: 15, height: 15, color: 'var(--color-text-subtle)' }} />
                            <input ref={searchRef} type="text"
                                placeholder="Search services, providers…"
                                className="w-full h-12 pl-10 pr-12 text-sm outline-none"
                                style={{
                                    backgroundColor: 'var(--color-surface)',
                                    color: 'var(--color-text)',
                                    border: '1px solid var(--color-border-accent)',
                                    borderRadius: 12, boxShadow: 'var(--shadow-glow)',
                                    fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em',
                                }}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)} />
                            <button type="button" onClick={() => setSearchOpen(false)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center"
                                style={{ color: 'var(--color-text-subtle)', backgroundColor: 'var(--color-surface-high)' }}>
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </form>
                        <div className="mt-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--color-text-subtle)' }}>Trending</p>
                            <div className="flex flex-wrap gap-1.5">
                                {['Cleaning', 'Plumbing', 'Chef', 'Moving', 'Fitness', 'Tutoring'].map(tag => (
                                    <button key={tag}
                                        onClick={() => { navigate(`/services?q=${encodeURIComponent(tag)}`); setSearchOpen(false); }}
                                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                                        style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)', e.currentTarget.style.color = 'var(--color-primary)')}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main */}
            <main className="pt-14 md:pt-0 pb-20 md:pb-6 transition-all"
                style={{ minHeight: '100vh' }}>
                <div style={{ marginLeft: isDesktop ? sidebarW : 0, transition: 'margin-left 0.22s cubic-bezier(0.25,1,0.5,1)' }}>
                    <div key={pathname} className="max-w-4xl mx-auto px-3 md:px-7 py-4 md:py-7 page-enter">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center h-14 pb-safe"
                style={{
                    backgroundColor: 'var(--color-glass)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderTop: '1px solid var(--color-border)',
                    animation: 'slideInBottom 0.42s cubic-bezier(0.19,1,0.22,1) 0.05s both',
                }}>
                {NAV_ITEMS.map((item, i) => {
                    const active = isActive(item);
                    return (
                        <Link key={item.path} to={item.path}
                            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-150"
                            style={{ animation: `fadeInUp 0.38s cubic-bezier(0.19,1,0.22,1) ${i * 0.05}s both` }}>
                            <div className="h-7 w-7 flex items-center justify-center rounded-lg"
                                style={{ backgroundColor: active ? 'var(--color-surface-high)' : 'transparent' }}>
                                <item.icon style={{ width: 17, height: 17, color: active ? 'var(--color-primary)' : 'var(--color-text-subtle)', strokeWidth: active ? 2.2 : 1.7 }} />
                            </div>
                            <span className="text-[9px] font-medium leading-none"
                                style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-subtle)', fontWeight: active ? 700 : 500 }}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
