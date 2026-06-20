import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    AreaChart, Area
} from 'recharts';
import {
    Activity, AlertCircle, Layers, TrendingUp, TrendingDown,
    ArrowRight, ShieldCheck, CheckCircle, MapPin, Users, Calendar,
    MessageSquare, Vote, Zap, Package, Star,
    Heart, Wrench, BarChart2, RefreshCw
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

const OS_MODULES = [
    { icon: MessageSquare, label: 'Community Feed',  href: '/community',  color: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-300', desc: 'Posts & skill swaps' },
    { icon: Calendar,      label: 'Local Events',    href: '/events',     color: 'bg-sky-100 dark:bg-sky-900/30',    text: 'text-sky-600 dark:text-sky-300',    desc: 'Concerts & meetups' },
    { icon: Vote,          label: 'Polls',           href: '/community',  color: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-300', desc: 'Neighborhood votes' },
    { icon: Zap,           label: 'Emergency',       href: '/neighborhood/emergency',  color: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-600 dark:text-red-300',    desc: 'Urgent dispatch' },
    { icon: Layers,        label: 'Group Deals',     href: '/neighborhood/group-buy',  color: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-300', desc: 'Save with neighbors' },
    { icon: RefreshCw,     label: 'Skill Swap',      href: '/neighborhood/skill-swap', color: 'bg-teal-100 dark:bg-teal-900/30',   text: 'text-teal-600 dark:text-teal-300',    desc: 'Trade skills & time' },
    { icon: ShieldCheck,   label: 'Jury',            href: '/neighborhood/jury',       color: 'bg-slate-100 dark:bg-slate-800',    text: 'text-slate-600 dark:text-slate-300',  desc: 'Resolve disputes' },
    { icon: Package,       label: 'Services',        href: '/services',   color: 'bg-zinc-100 dark:bg-zinc-800',     text: 'text-zinc-600 dark:text-zinc-300',   desc: 'Book any service' },
    { icon: Star,          label: 'Recommendations', href: '/recommendations', color: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-300', desc: 'AI picks for you' },
    { icon: Heart,         label: 'Loyalty',         href: '/loyalty',    color: 'bg-rose-100 dark:bg-rose-900/30',  text: 'text-rose-600 dark:text-rose-300',   desc: 'Points & rewards' },
];

const QUICK_ACTIONS = [
    { label: 'Report issue', icon: AlertCircle, action: 'report',  color: 'text-amber-600' },
    { label: 'Request help',  icon: Heart,      action: 'help',    color: 'text-rose-600'  },
    { label: 'Share update',  icon: MessageSquare, action: 'post', color: 'text-violet-600'},
    { label: 'Book service',  icon: Wrench,     action: 'book',    color: 'text-sky-600'   },
];

function StatCard({ label, value, sub, icon: Icon, accent, trend }) {
    return (
        <div className={`rounded-2xl p-5 border ${accent ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-bold uppercase tracking-widest ${accent ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400'}`}>{label}</span>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${accent ? 'bg-white/10 dark:bg-black/10' : 'bg-zinc-50 dark:bg-zinc-800'}`}>
                    <Icon className={`h-4 w-4 ${accent ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`} />
                </div>
            </div>
            <div className={`text-3xl font-black tracking-tight ${accent ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'}`}>{value}</div>
            {sub && <div className="text-xs mt-1.5 text-zinc-400">{sub}</div>}
            {trend != null && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(trend).toFixed(0)}% this week
                </div>
            )}
        </div>
    );
}

function PulseBar({ label, value, max, color = 'bg-zinc-900 dark:bg-zinc-100' }) {
    const pct = max > 0 ? Math.round(value / max * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 w-24 shrink-0 truncate">{label}</span>
            <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 w-6 text-right">{value}</span>
        </div>
    );
}

function GapBadge({ category, demand, supply }) {
    const ratio = supply === 0 ? 99 : demand / supply;
    const level = ratio > 3 ? 'critical' : ratio > 2 ? 'high' : 'moderate';
    const styles = { critical:'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300', high:'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300', moderate:'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' };
    const labels = { critical:'Critical Gap', high:'High Demand', moderate:'Moderate Gap' };
    return (
        <div className={`rounded-xl border px-4 py-3 ${styles[level]}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm capitalize">{category.replace('_', ' ')}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">{labels[level]}</span>
            </div>
            <div className="flex items-center gap-4 text-xs opacity-80">
                <span>{demand} pending requests</span>
                <span>{supply} available providers</span>
            </div>
        </div>
    );
}

export default function NeighborhoodDashboard() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [providers, setProviders] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [posts, setPosts] = useState([]);
    const [events, setEvents] = useState([]);
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [alertDismissed, setAlertDismissed] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [bookRes, provRes, bundleRes, postRes, evtRes, pollRes] = await Promise.allSettled([
                supabase.from('bookings').select('id,status,date,time_slot,service_name,created_at').order('created_at', { ascending: false }).limit(100),
                supabase.from('providers').select('id,category_slugs,is_active,rating').eq('is_active', true).limit(200),
                supabase.from('service_bundles').select('id,title,status,zone_name,current_participants,max_participants,discount_percentage').limit(20),
                supabase.from('community_posts').select('id,type,title,body,author_name,created_date,upvotes,reply_count').order('created_date', { ascending: false }).limit(10),
                supabase.from('events').select('id,title,date,category,venue_name,is_free,ticket_price,tickets_sold,total_tickets').order('date', { ascending: true }).limit(5),
                supabase.from('neighborhood_polls').select('id,question,options,created_by_name,created_at').order('created_at', { ascending: false }).limit(3),
            ]);
            if (bookRes.value?.data) setBookings(bookRes.value.data);
            if (provRes.value?.data) setProviders(provRes.value.data);
            if (bundleRes.value?.data) setBundles(bundleRes.value.data);
            if (postRes.value?.data) setPosts(postRes.value.data);
            if (evtRes.value?.data) setEvents(evtRes.value.data);
            if (pollRes.value?.data) setPolls(pollRes.value.data);
            setLoading(false);
        };
        load();
    }, []);

    const metrics = useMemo(() => {
        const pending = bookings.filter(b => b.status === 'pending');
        const confirmed = bookings.filter(b => b.status === 'confirmed');
        const completed = bookings.filter(b => b.status === 'completed');
        const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        const today = new Date().toISOString().split('T')[0];
        const prevWeekStart = format(subDays(new Date(), 14), 'yyyy-MM-dd');
        const prevWeekEnd = format(subDays(new Date(), 7), 'yyyy-MM-dd');

        const demandMap = {};
        pending.concat(confirmed).forEach(b => {
            const cat = b.service_name?.split(' ')[0]?.toLowerCase() || 'other';
            demandMap[cat] = (demandMap[cat] || 0) + 1;
        });
        const supplyMap = {};
        providers.forEach(p => (p.category_slugs || []).forEach(slug => { supplyMap[slug] = (supplyMap[slug] || 0) + 1; }));

        const demandChartData = Object.entries(demandMap).sort((a,b) => b[1]-a[1]).slice(0,8)
            .map(([name, demand]) => ({ name: name.charAt(0).toUpperCase()+name.slice(1), demand, supply: supplyMap[name]||0 }));

        const gaps = Object.entries(demandMap)
            .filter(([cat,demand]) => demand > 1 && demand > (supplyMap[cat]||0)*2)
            .sort((a,b) => b[1]-a[1]).slice(0,5)
            .map(([cat,demand]) => ({ category:cat, demand, supply:supplyMap[cat]||0 }));

        const dailyMap = {};
        for (let i=13; i>=0; i--) {
            const d = format(subDays(new Date(),i),'yyyy-MM-dd');
            dailyMap[d] = { date: format(subDays(new Date(),i),'MMM d'), count:0 };
        }
        bookings.forEach(b => { if (dailyMap[b.date]) dailyMap[b.date].count++; });

        const thisWeek = bookings.filter(b => b.date >= weekAgo && b.date <= today).length;
        const prevWeek = bookings.filter(b => b.date >= prevWeekStart && b.date <= prevWeekEnd).length;
        const trend = prevWeek > 0 ? (thisWeek - prevWeek) / prevWeek * 100 : null;

        const avgRating = providers.length > 0
            ? (providers.reduce((s,p) => s + (p.rating || 0), 0) / providers.length).toFixed(1)
            : '—';

        const categoryActivity = Object.entries(demandMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
        const maxDemand = categoryActivity[0]?.[1] || 1;

        return {
            totalProviders: providers.length,
            pending: pending.length, confirmed: confirmed.length,
            formingBundles: bundles.filter(b => b.status === 'forming').length,
            completedTotal: completed.length,
            demandChartData, gaps,
            dailyTrend: Object.values(dailyMap),
            trend, avgRating, categoryActivity, maxDemand,
            recent: [...bookings].slice(0,8),
        };
    }, [bookings, providers, bundles]);

    const upcomingEvents = events.filter(e => !e.date || new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));
    const totalPollVotes = polls.reduce((s,p) => s + (p.options||[]).reduce((ss,o) => ss+(o.votes||0),0), 0);

    if (loading) return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({length:4}).map((_,i) => <div key={i} className="skeleton-wave h-28 rounded-2xl" />)}</div>
            <div className="skeleton-wave h-48 rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">{Array.from({length:4}).map((_,i) => <div key={i} className="skeleton-wave h-20 rounded-xl" />)}</div>
        </div>
    );

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="relative h-2.5 w-2.5">
                            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                            <div className="relative h-2.5 w-2.5 bg-emerald-500 rounded-full" />
                        </div>
                        <h1 className="font-black text-2xl tracking-tight text-zinc-900 dark:text-white">Neighborhood OS</h1>
                    </div>
                    <p className="text-zinc-400 dark:text-zinc-500 text-sm">Your neighborhood's operating system — live intelligence & community hub</p>
                </div>
                <button onClick={() => window.location.reload()} className="h-8 w-8 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* OS Pulse Banner */}
            {!alertDismissed && metrics.gaps.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">Neighborhood Alert</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            {metrics.gaps.length} service gap{metrics.gaps.length>1?'s':''} detected — high demand with low provider supply. Consider sharing this with local pros.
                        </p>
                    </div>
                    <button onClick={() => setAlertDismissed(true)} className="text-amber-400 hover:text-amber-600 transition-colors text-lg leading-none">×</button>
                </div>
            )}

            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard accent label="Active Providers" value={metrics.totalProviders || '—'} sub="Verified & live" icon={ShieldCheck} />
                <StatCard label="Open Requests" value={metrics.pending} sub="Awaiting match" icon={Activity} trend={metrics.trend} />
                <StatCard label="Group Deals" value={metrics.formingBundles} sub="Forming now" icon={Layers} />
                <StatCard label="Jobs Completed" value={metrics.completedTotal} sub="Platform-wide" icon={CheckCircle} />
            </div>

            {/* OS Modules Grid */}
            <div>
                <h2 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">Neighborhood Modules</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {OS_MODULES.map(m => (
                        <Link key={m.href+m.label} to={m.href}
                            className="flex flex-col items-start gap-2 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all group">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${m.color}`}>
                                <m.icon className={`h-4 w-4 ${m.text}`} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">{m.label}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{m.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* 3-column live widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Community Activity */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
                            <span className="text-xs font-bold">Community Pulse</span>
                        </div>
                        <Link to="/community" className="text-[10px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-0.5">View all <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                    <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                        {posts.length === 0 ? (
                            <div className="px-4 py-8 text-center text-xs text-zinc-400">No posts yet</div>
                        ) : posts.slice(0,5).map(p => (
                            <div key={p.id} className="px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <p className="text-xs font-medium text-zinc-900 dark:text-white line-clamp-1">{p.title || p.body}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-zinc-400">{p.author_name}</span>
                                    {p.upvotes > 0 && <span className="text-[10px] text-rose-400">♥ {p.upvotes}</span>}
                                    {p.reply_count > 0 && <span className="text-[10px] text-zinc-400">{p.reply_count} replies</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-sky-500" />
                            <span className="text-xs font-bold">Upcoming Events</span>
                        </div>
                        <Link to="/events" className="text-[10px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-0.5">See all <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                    <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                        {upcomingEvents.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Calendar className="h-6 w-6 mx-auto mb-2 text-zinc-200 dark:text-zinc-700" strokeWidth={1.5} />
                                <p className="text-xs text-zinc-400">No events yet</p>
                                <Link to="/events" className="text-[10px] font-semibold text-zinc-900 dark:text-white underline underline-offset-2 mt-1 inline-block">Create one</Link>
                            </div>
                        ) : upcomingEvents.slice(0,5).map(ev => (
                            <div key={ev.id} className="px-4 py-2.5 flex items-center gap-2.5">
                                <Calendar className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-zinc-900 dark:text-white line-clamp-1">{ev.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {ev.date && <span className="text-[10px] text-zinc-400">{ev.date}</span>}
                                        <span className="text-[10px] font-semibold text-emerald-600">{ev.is_free || !ev.ticket_price ? 'Free' : `$${ev.ticket_price}`}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Active Polls */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Vote className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs font-bold">Active Polls</span>
                            {totalPollVotes > 0 && <span className="text-[10px] text-zinc-400">{totalPollVotes} votes</span>}
                        </div>
                        <Link to="/community" className="text-[10px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-0.5">Vote <ArrowRight className="h-3 w-3" /></Link>
                    </div>
                    <div className="p-3 space-y-2">
                        {polls.length === 0 ? (
                            <div className="py-6 text-center">
                                <Vote className="h-6 w-6 mx-auto mb-2 text-zinc-200 dark:text-zinc-700" strokeWidth={1.5} />
                                <p className="text-xs text-zinc-400">No polls yet</p>
                                <Link to="/community" className="text-[10px] font-semibold text-zinc-900 dark:text-white underline underline-offset-2 mt-1 inline-block">Create a poll</Link>
                            </div>
                        ) : polls.map(poll => {
                            const total = (poll.options||[]).reduce((s,o) => s+(o.votes||0), 0);
                            const top = (poll.options||[]).reduce((a,b) => (a.votes||0)>=(b.votes||0)?a:b, {});
                            return (
                                <Link to="/community" key={poll.id}
                                    className="block p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <p className="text-xs font-medium text-zinc-900 dark:text-white line-clamp-2 mb-1.5">{poll.question}</p>
                                    {(poll.options||[]).slice(0,2).map((opt,i) => {
                                        const pct = total > 0 ? Math.round((opt.votes||0)/total*100) : 0;
                                        return (
                                            <div key={i} className="mb-1">
                                                <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5">
                                                    <span className="truncate">{opt.text}</span>
                                                    <span className="font-semibold ml-1">{pct}%</span>
                                                </div>
                                                <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-400 rounded-full" style={{ width:`${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <p className="text-[10px] text-zinc-400 mt-1">{total} votes · tap to vote</p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Service Activity by Category */}
            {metrics.categoryActivity.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-sm text-zinc-900 dark:text-white">Service Demand by Category</h2>
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Active requests</span>
                    </div>
                    <div className="space-y-3">
                        {metrics.categoryActivity.map(([cat,count]) => (
                            <PulseBar key={cat} label={cat.charAt(0).toUpperCase()+cat.slice(1)} value={count} max={metrics.maxDemand} />
                        ))}
                    </div>
                </div>
            )}

            {/* Booking Trend Chart */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-sm text-zinc-900 dark:text-white">Booking Activity — Last 14 Days</h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${metrics.trend != null && metrics.trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                        {metrics.trend != null ? `${metrics.trend >= 0 ? '+' : ''}${metrics.trend.toFixed(0)}% vs prev week` : 'Tracking…'}
                    </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={metrics.dailyTrend} margin={{ left:-10 }}>
                        <defs>
                            <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#18181b" stopOpacity={0.12} />
                                <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                        <XAxis dataKey="date" tick={{ fontSize:10 }} interval={3} />
                        <YAxis tick={{ fontSize:10 }} allowDecimals={false} />
                        <Tooltip formatter={v => [v, 'Bookings']} />
                        <Area type="monotone" dataKey="count" stroke="#18181b" strokeWidth={2} fill="url(#actGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Demand vs Supply */}
            {metrics.demandChartData.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-sm text-zinc-900 dark:text-white">Demand vs Supply by Service</h2>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-zinc-900 dark:bg-zinc-100 inline-block" /> Demand</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-600 inline-block" /> Supply</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={metrics.demandChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize:10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize:11 }} width={80} />
                            <Tooltip />
                            <Bar dataKey="demand" fill="#18181b" radius={[0,4,4,0]} />
                            <Bar dataKey="supply" fill="#d4d4d8" radius={[0,4,4,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Service Gap Alerts */}
            {metrics.gaps.length > 0 && (
                <div>
                    <div className="flex items-center gap-2.5 mb-4">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <h2 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">Service Gap Alerts</h2>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">{metrics.gaps.length} gaps</span>
                    </div>
                    <div className="space-y-2.5">
                        {metrics.gaps.map((gap,i) => <GapBadge key={i} category={gap.category} demand={gap.demand} supply={gap.supply} />)}
                    </div>
                    <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
                        <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                            These gaps represent <strong>provider opportunities</strong>. Share this with local professionals to grow supply in underserved categories.
                        </p>
                    </div>
                </div>
            )}

            {/* Active Bundles */}
            {bundles.filter(b => ['forming','confirmed'].includes(b.status)).length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">Active Group Deals</h2>
                        <Link to="/bundles" className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                            Manage <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {bundles.filter(b => ['forming','confirmed'].includes(b.status)).slice(0,3).map(b => (
                            <Link key={b.id} to="/bundles" className="card-premium p-4 block group">
                                <div className="flex items-start justify-between mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${b.status==='confirmed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>{b.status}</span>
                                    <span className="text-xs font-bold text-blue-600">Save {b.discount_percentage||20}%</span>
                                </div>
                                <h3 className="font-semibold text-sm mb-1 text-zinc-900 dark:text-white">{b.title}</h3>
                                {b.zone_name && <p className="text-xs text-zinc-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{b.zone_name}</p>}
                                <div className="mt-3">
                                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width:`${((b.current_participants||1)/(b.max_participants||5))*100}%` }} />
                                    </div>
                                    <p className="text-[10px] text-zinc-400 mt-1">{b.current_participants||1}/{b.max_participants} participants</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Platform Activity */}
            {metrics.recent.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-zinc-400" />
                        <h2 className="font-semibold text-sm text-zinc-900 dark:text-white">Recent Platform Activity</h2>
                    </div>
                    <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                        {metrics.recent.map((b,i) => {
                            const statusColors = {
                                pending:'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300',
                                confirmed:'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300',
                                completed:'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300',
                                cancelled:'text-zinc-400 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-500',
                                in_progress:'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300',
                            };
                            return (
                                <div key={b.id||i} className="flex items-center gap-3 px-5 py-3">
                                    <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
                                        {b.service_name?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{b.service_name || 'Service'}</p>
                                        <p className="text-xs text-zinc-400">{b.date}{b.time_slot && ` at ${b.time_slot}`}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[b.status] || 'text-zinc-500 bg-zinc-100'}`}>{b.status}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
