import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import {
    LayoutDashboard, Wrench, CalendarDays, DollarSign, User,
    Moon, Sun, Menu, X, Bot, Users, ChevronRight,
    TrendingUp, MessageSquare, Home, Zap, Bell
} from 'lucide-react';

const NAV_ITEMS = [
    { path: '/provider',             icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/provider/services',    icon: Wrench,          label: 'Services' },
    { path: '/provider/bookings',    icon: CalendarDays,    label: 'Bookings' },
    { path: '/provider/earnings',    icon: DollarSign,      label: 'Earnings' },
    { path: '/provider/profile',     icon: User,            label: 'Profile' },
];

const MORE_ITEMS = [
    { path: '/provider/copilot',     icon: Bot,             label: 'AI Copilot' },
    { path: '/provider/ai-insights', icon: TrendingUp,      label: 'AI Insights' },
    { path: '/provider/customers',   icon: Users,           label: 'Customers' },
    { path: '/provider/chat',        icon: MessageSquare,   label: 'Messages' },
    { path: '/provider/availability',icon: CalendarDays,    label: 'Availability' },
];

export default function ProviderLayout() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);
    useEffect(() => { setSidebarOpen(false); }, [pathname]);

    const isActive = (item) =>
        item.exact ? pathname === item.path : pathname === item.path || pathname.startsWith(item.path + '/');

    const SidebarInner = ({ onClose }) => (
        <>
            <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Link to="/provider" onClick={onClose} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--color-primary)' }}>
                        <Wrench className="h-3.5 w-3.5" style={{ color: 'var(--color-on-primary)' }} />
                    </div>
                    <div>
                        <h1 className="text-xs font-black" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>TRUVORNEX</h1>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)' }}>
                            Provider
                        </span>
                    </div>
                </Link>
                {onClose && (
                    <button onClick={onClose} className="md:hidden p-1 rounded-md" style={{ color: 'var(--color-text-subtle)' }}>
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex rounded-lg p-0.5 gap-0.5" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                    <button onClick={() => navigate('/')}
                        className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-0.5"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                        Customer
                    </button>
                    <span className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>
                        Provider
                    </span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar">
                <div className="space-y-0.5">
                    {NAV_ITEMS.map(item => {
                        const active = isActive(item);
                        return (
                            <Link key={item.path} to={item.path} onClick={onClose}
                                className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
                                style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', backgroundColor: active ? 'var(--color-surface-high)' : 'transparent' }}
                                onMouseEnter={e => !active && (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                                onMouseLeave={e => !active && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full" style={{ backgroundColor: 'var(--color-primary)', marginLeft: -1 }} />}
                                <item.icon style={{ width: 14, height: 14, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                                <span style={{ fontWeight: active ? 600 : 450, letterSpacing: '-0.01em' }}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="px-2.5 pt-4 pb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>Tools</span>
                </div>
                <div className="space-y-0.5">
                    {MORE_ITEMS.map(item => (
                        <Link key={item.path} to={item.path} onClick={onClose}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all"
                            style={{ color: 'var(--color-text-muted)' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                            <item.icon style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.5 }} />
                            <span style={{ letterSpacing: '-0.01em' }}>{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            <div className="px-3 py-2.5 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg mb-1"
                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)' }}>
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-success)', animation: 'rt-pulse 2s ease-in-out infinite' }} />
                    <p className="text-[11px] font-medium flex-1" style={{ color: 'var(--color-text-muted)' }}>AI Copilot Active</p>
                    <Zap style={{ width: 10, height: 10, color: 'var(--color-text-subtle)', flexShrink: 0 }} />
                </div>
                <button onClick={toggleTheme}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                    {theme === 'dark' ? <Sun style={{ width: 12, height: 12 }} /> : <Moon style={{ width: 12, height: 12 }} />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col z-40"
                style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
                <SidebarInner />
            </aside>

            <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 h-12"
                style={scrolled ? { backgroundColor: 'var(--color-glass)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--color-border)' }
                    : { backgroundColor: 'transparent' }}>
                <div className="flex items-center gap-2.5">
                    <button onClick={() => setSidebarOpen(true)}
                        className="h-7 w-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)' }}>
                        <Menu className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                            <Wrench className="h-3 w-3" style={{ color: 'var(--color-on-primary)' }} />
                        </div>
                        <span className="text-xs font-black" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>Provider</span>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    <button onClick={toggleTheme} className="h-7 w-7 rounded-md flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
                        {theme === 'dark' ? <Sun style={{ width: 13, height: 13 }} /> : <Moon style={{ width: 13, height: 13 }} />}
                    </button>
                    <button onClick={() => navigate('/')}
                        className="h-6 px-2.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ml-1"
                        style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                        <Home style={{ width: 9, height: 9 }} /> Customer
                    </button>
                </div>
            </header>

            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setSidebarOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-64 flex flex-col"
                        style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', zIndex: 51, animation: 'slideInLeft 0.28s cubic-bezier(0.19,1,0.22,1)' }}>
                        <SidebarInner onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <main className="md:ml-56 pt-12 md:pt-0 pb-20 md:pb-6" style={{ minHeight: '100vh' }}>
                <div className="max-w-4xl mx-auto px-4 md:px-7 py-5 md:py-7 page-enter">
                    <Outlet />
                </div>
            </main>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center h-14 pb-safe"
                style={{ backgroundColor: 'var(--color-glass)', backdropFilter: 'blur(24px)', borderTop: '1px solid var(--color-border)' }}>
                {NAV_ITEMS.map(item => {
                    const active = isActive(item);
                    return (
                        <Link key={item.path} to={item.path}
                            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-all duration-150">
                            <div className="h-6 w-6 flex items-center justify-center rounded-lg"
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
