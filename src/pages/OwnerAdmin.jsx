import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Users, Store, CalendarDays, Tag, BarChart3, LogOut, CheckCircle, XCircle, Clock, RefreshCw, Eye, Trash2, Settings, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const OWNER_USER = 'truvornex_owner';
const OWNER_PASS = 'TX#Admin2024!@secure';

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    in_progress: 'bg-purple-100 text-purple-800',
    no_show: 'bg-gray-100 text-gray-800',
};

export default function OwnerAdmin() {
    const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('owner_auth') === 'true');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [tab, setTab] = useState('dashboard');
    const [providers, setProviders] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const login = () => {
        if (username === OWNER_USER && password === OWNER_PASS) {
            sessionStorage.setItem('owner_auth', 'true');
            setLoggedIn(true);
        } else {
            toast.error('Invalid credentials');
        }
    };

    const logout = () => { sessionStorage.removeItem('owner_auth'); setLoggedIn(false); };

    const loadAll = () => {
        setLoading(true);
        setProviders([]); setBookings([]); setServices([]); setCategories([]);
        setLoading(false);
    };

    useEffect(() => {
        if (!loggedIn) return;
        loadAll();
    }, [loggedIn]);

    if (!loggedIn) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center mb-8">
                        <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center mb-4">
                            <Shield className="h-7 w-7 text-zinc-900" />
                        </div>
                        <h1 className="text-white font-black text-2xl tracking-tight">Owner Panel</h1>
                        <p className="text-zinc-500 text-sm mt-1">Restricted access — Truvornex</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <div>
                            <label className="text-zinc-400 text-sm font-medium block mb-1.5">Username</label>
                            <Input
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-zinc-500 h-11 rounded-xl"
                                placeholder="Enter username"
                                onKeyDown={e => e.key === 'Enter' && login()}
                            />
                        </div>
                        <div>
                            <label className="text-zinc-400 text-sm font-medium block mb-1.5">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-zinc-500 h-11 rounded-xl"
                                placeholder="Enter password"
                                onKeyDown={e => e.key === 'Enter' && login()}
                            />
                        </div>
                        <Button onClick={login} className="w-full h-11 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold rounded-xl">
                            Sign In
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const stats = {
        totalProviders: providers.length,
        pendingProviders: providers.filter(p => p.status === 'pending').length,
        approvedProviders: providers.filter(p => p.status === 'approved').length,
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        revenue: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + (b.price || 0), 0),
        totalServices: services.length,
    };

    const TABS = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'providers', label: 'Providers', icon: Store },
        { id: 'bookings', label: 'Bookings', icon: CalendarDays },
        { id: 'services', label: 'Services', icon: Tag },
        { id: 'categories', label: 'Categories', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-zinc-950 font-inter">
            {/* Sidebar */}
            <div className="flex">
                <aside className="hidden md:flex w-56 min-h-screen bg-zinc-900 border-r border-zinc-800 flex-col">
                    <div className="p-5 border-b border-zinc-800">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
                                <Shield className="h-4 w-4 text-zinc-900" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Owner Panel</p>
                                <p className="text-zinc-500 text-xs">Truvornex Admin</p>
                            </div>
                        </div>
                    </div>
                    <nav className="flex-1 p-3 space-y-1">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <t.icon className="h-4 w-4" /> {t.label}
                            </button>
                        ))}
                    </nav>
                    <div className="p-3 border-t border-zinc-800">
                        <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                            <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                    </div>
                </aside>

                {/* Mobile top bar */}
                <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-900 border-b border-zinc-800 px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-white" />
                        <span className="text-white font-bold text-sm">Owner Panel</span>
                    </div>
                    <button onClick={logout} className="text-zinc-400"><LogOut className="h-4 w-4" /></button>
                </div>

                {/* Main */}
                <main className="flex-1 p-4 md:p-6 mt-14 md:mt-0">
                    {/* Mobile tabs */}
                    <div className="md:hidden flex gap-1 mb-4 overflow-x-auto pb-1">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex-shrink-0 px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${tab === t.id ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-white font-black text-2xl capitalize">{tab}</h1>
                        <button onClick={loadAll} className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>

                    {tab === 'dashboard' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Providers', value: stats.totalProviders, sub: `${stats.pendingProviders} pending`, icon: Store, color: 'text-blue-400' },
                                    { label: 'Approved', value: stats.approvedProviders, sub: 'active providers', icon: CheckCircle, color: 'text-green-400' },
                                    { label: 'Total Bookings', value: stats.totalBookings, sub: `${stats.pendingBookings} pending`, icon: CalendarDays, color: 'text-purple-400' },
                                    { label: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, sub: 'from completed', icon: TrendingUp, color: 'text-yellow-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                        <s.icon className={`h-5 w-5 ${s.color} mb-3`} />
                                        <p className="text-white font-black text-2xl">{s.value}</p>
                                        <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
                                        <p className="text-zinc-600 text-xs">{s.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Pending Providers */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-yellow-400" /> Pending Provider Approvals ({stats.pendingProviders})
                                </h2>
                                {providers.filter(p => p.status === 'pending').length === 0 ? (
                                    <p className="text-zinc-500 text-sm">All providers reviewed ✓</p>
                                ) : (
                                    <div className="space-y-2">
                                        {providers.filter(p => p.status === 'pending').map(p => (
                                            <ProviderRow key={p.id} provider={p} onUpdate={loadAll} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Recent bookings */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-purple-400" /> Recent Bookings
                                </h2>
                                <div className="space-y-2">
                                    {bookings.slice(0, 8).map(b => (
                                        <BookingRow key={b.id} booking={b} onUpdate={loadAll} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'providers' && (
                        <div className="space-y-3">
                            {loading ? <p className="text-zinc-500">Loading...</p> : providers.map(p => (
                                <ProviderRow key={p.id} provider={p} onUpdate={loadAll} showAll />
                            ))}
                        </div>
                    )}

                    {tab === 'bookings' && (
                        <div className="space-y-2">
                            {loading ? <p className="text-zinc-500">Loading...</p> : bookings.map(b => (
                                <BookingRow key={b.id} booking={b} onUpdate={loadAll} showAll />
                            ))}
                        </div>
                    )}

                    {tab === 'services' && (
                        <div className="space-y-2">
                            {loading ? <p className="text-zinc-500">Loading...</p> : services.map(s => (
                                <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{s.name}</p>
                                        <p className="text-zinc-500 text-xs mt-0.5">${s.price} · {s.duration_minutes}min · {s.category_slug} · {s.type}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {s.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'categories' && (
                        <CategoryManager categories={categories} onRefresh={loadAll} />
                    )}
                </main>
            </div>
        </div>
    );
}

function ProviderRow({ provider: p, onUpdate, showAll }) {

    return (
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {p.logo_url ? (
                    <img src={p.logo_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">{p.business_name?.[0]}</span>
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.business_name}</p>
                    <p className="text-zinc-500 text-xs truncate">{p.user_email} · {p.city}</p>
                </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status] || 'bg-zinc-700 text-zinc-300'}`}>{p.status}</span>
            <div className="flex gap-1.5 flex-wrap">
                {p.status === 'pending' && <>
                    <button onClick={approve} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"><CheckCircle className="h-3 w-3" />Approve</button>
                    <button onClick={reject} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"><XCircle className="h-3 w-3" />Reject</button>
                </>}
                {p.status === 'approved' && <button onClick={suspend} className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold transition-colors">Suspend</button>}
                {p.status === 'suspended' && <button onClick={approve} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors">Reactivate</button>}
                {showAll && <button onClick={del} className="text-zinc-600 hover:text-red-400 transition-colors p-1.5"><Trash2 className="h-4 w-4" /></button>}
            </div>
        </div>
    );
}

function BookingRow({ booking: b, onUpdate, showAll }) {
    return (
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{b.service_name} — {b.provider_name}</p>
                <p className="text-zinc-500 text-xs mt-0.5 truncate">{b.customer_email} · {b.date} {b.time_slot}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="text-white font-bold text-sm">${b.price || 0}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status] || 'bg-zinc-700 text-zinc-300'}`}>{b.status}</span>
                {showAll && <>
                    {b.status === 'pending' && <button onClick={() => updateStatus('confirmed')} className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold">Confirm</button>}
                    {['pending', 'confirmed'].includes(b.status) && <button onClick={() => updateStatus('cancelled')} className="px-2.5 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold">Cancel</button>}
                    {b.status === 'confirmed' && <button onClick={() => updateStatus('completed')} className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold">Complete</button>}
                </>}
            </div>
        </div>
    );
}

function CategoryManager({ categories, onRefresh }) {
    const [form, setForm] = useState({ name: '', slug: '', description: '', icon: 'wrench', is_active: true, sort_order: 0 });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!form.name || !form.slug) { toast.error('Name and slug required'); return; }
        setSaving(true);
        toast.success('Category created');
        setForm({ name: '', slug: '', description: '', icon: 'wrench', is_active: true, sort_order: 0 });
        setSaving(false);
        onRefresh();
    };


    return (
        <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h2 className="text-white font-bold mb-4">Add New Category</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Name (e.g. Plumbing)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
                    <Input placeholder="Slug (e.g. plumbing)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
                    <Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
                    <Input placeholder="Icon (wrench, scissors, etc)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
                    <Input type="number" placeholder="Sort Order" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500" />
                </div>
                <Button onClick={save} disabled={saving} className="mt-3 bg-white text-zinc-900 hover:bg-zinc-100">{saving ? 'Saving...' : 'Add Category'}</Button>
            </div>
            <div className="space-y-2">
                {categories.map(c => (
                    <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-white font-semibold text-sm">{c.name} <span className="text-zinc-600 font-normal">/{c.slug}</span></p>
                            <p className="text-zinc-500 text-xs mt-0.5">{c.description || 'No description'} · order {c.sort_order}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.is_active ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                        <button onClick={() => toggle(c)} className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 transition-colors">{c.is_active ? 'Disable' : 'Enable'}</button>
                        <button onClick={() => del(c.id)} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}