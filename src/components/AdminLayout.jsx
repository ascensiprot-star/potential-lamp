import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, Building2, CalendarDays, Settings,
    BarChart3, Shield, Bell, FileText, Tags, CreditCard,
    Activity, FileBarChart, Brain, Wrench, Menu, X, Home, Zap, Eye
} from 'lucide-react';

const BASE = '/x7k9m2q4p8w1n5v3r6t0y/admin';

const NAV_GROUPS = [
    { label: 'Overview', items: [
        { path: BASE,                      icon: LayoutDashboard, label: 'Dashboard',    exact: true },
        { path: `${BASE}/analytics`,       icon: BarChart3,       label: 'Analytics' },
        { path: `${BASE}/financial`,       icon: CreditCard,      label: 'Financial' },
    ]},
    { label: 'Platform', items: [
        { path: `${BASE}/users`,           icon: Users,           label: 'Users' },
        { path: `${BASE}/providers`,       icon: Building2,       label: 'Providers' },
        { path: `${BASE}/bookings`,        icon: CalendarDays,    label: 'Bookings' },
        { path: `${BASE}/services`,        icon: Wrench,          label: 'Services' },
        { path: `${BASE}/customers`,       icon: Users,           label: 'Customers' },
    ]},
    { label: 'Finance', items: [
        { path: `${BASE}/invoices`,        icon: FileText,        label: 'Invoices' },
        { path: `${BASE}/payouts`,         icon: CreditCard,      label: 'Payouts' },
    ]},
    { label: 'Safety', items: [
        { path: `${BASE}/reviews`,         icon: Shield,          label: 'Reviews' },
        { path: `${BASE}/audit-logs`,      icon: FileBarChart,    label: 'Audit Logs' },
    ]},
    { label: 'Config', items: [
        { path: `${BASE}/notifications`,   icon: Bell,            label: 'Notifications' },
        { path: `${BASE}/categories`,      icon: Tags,            label: 'Categories' },
        { path: `${BASE}/content`,         icon: FileText,        label: 'Content' },
        { path: `${BASE}/platform-config`, icon: Settings,        label: 'Config' },
        { path: `${BASE}/settings`,        icon: Settings,        label: 'Settings' },
    ]},
    { label: 'AI', items: [
        { path: `${BASE}/ai-control`,      icon: Brain,           label: 'AI Control' },
        { path: `${BASE}/simon-oversight`, icon: Eye,             label: 'Simon Oversight' },
        { path: `${BASE}/system-health`,   icon: Activity,        label: 'System Health' },
    ]},
];

export default function AdminLayout() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
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

    const SidebarContent = ({ onClose }) => (
        <>
            <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Link to={BASE} onClick={onClose} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--color-primary)' }}>
                        <Shield className="h-3.5 w-3.5" style={{ color: 'var(--color-on-primary)' }} />
                    </div>
                    <div>
                        <h1 className="text-xs font-black" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>TRUVORNEX</h1>
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)' }}>
                            Admin
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
                <button onClick={() => navigate('/')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                    style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                    <Home className="h-3 w-3" />
                    Back to Customer App
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label} className="mb-3">
                        <div className="px-2.5 py-1">
                            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>
                                {group.label}
                            </span>
                        </div>
                        <div className="space-y-0.5">
                            {group.items.map(item => {
                                const active = isActive(item);
                                return (
                                    <Link key={item.path} to={item.path} onClick={onClose}
                                        className="relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                                        style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', backgroundColor: active ? 'var(--color-surface-high)' : 'transparent' }}
                                        onMouseEnter={e => !active && (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.color = 'var(--color-text)')}
                                        onMouseLeave={e => !active && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = 'var(--color-text-muted)')}>
                                        {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-full" style={{ backgroundColor: 'var(--color-primary)', marginLeft: -1 }} />}
                                        <item.icon style={{ width: 12, height: 12, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
                                        <span style={{ fontWeight: active ? 600 : 450, letterSpacing: '-0.01em' }}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="px-3 py-2.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)' }}>
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-success)', animation: 'rt-pulse 2s ease-in-out infinite' }} />
                    <p className="text-[11px] font-medium flex-1" style={{ color: 'var(--color-text-muted)' }}>Simon AI Active</p>
                    <Zap style={{ width: 10, height: 10, color: 'var(--color-text-subtle)', flexShrink: 0 }} />
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            <aside className="hidden md:flex fixed left-0 top-0 h-full w-52 flex-col z-40"
                style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}>
                <SidebarContent />
            </aside>

            <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 h-12"
                style={scrolled ? { backgroundColor: 'var(--color-glass)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--color-border)' }
                    : { backgroundColor: 'var(--color-bg)' }}>
                <div className="flex items-center gap-2.5">
                    <button onClick={() => setSidebarOpen(true)}
                        className="h-7 w-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)' }}>
                        <Menu className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                            <Shield className="h-3 w-3" style={{ color: 'var(--color-on-primary)' }} />
                        </div>
                        <span className="text-xs font-black" style={{ color: 'var(--color-primary)', letterSpacing: '-0.04em' }}>Admin</span>
                    </div>
                </div>
                <button onClick={() => navigate('/')}
                    className="h-6 px-2.5 rounded-full text-[10px] font-semibold flex items-center gap-1"
                    style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                    <Home style={{ width: 9, height: 9 }} /> App
                </button>
            </header>

            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setSidebarOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-60 flex flex-col"
                        style={{ backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', zIndex: 51, animation: 'slideInLeft 0.28s cubic-bezier(0.19,1,0.22,1)' }}>
                        <SidebarContent onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <main className="md:ml-52 pt-12 md:pt-0 pb-6" style={{ minHeight: '100vh' }}>
                <div className="max-w-5xl mx-auto px-4 md:px-7 py-5 md:py-7">
                    <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium"
                        style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)', color: 'var(--color-text-muted)' }}>
                        <Shield className="h-3 w-3 shrink-0" style={{ opacity: 0.5 }} />
                        <span>Admin Panel — changes affect all platform users and data</span>
                    </div>
                    <div className="page-enter">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
