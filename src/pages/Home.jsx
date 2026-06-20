import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/lib/ThemeContext';
import { useSimon } from '@/lib/SimonContext';
import { useAuthModal } from '@/lib/AuthModalContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import useGeolocation from '@/hooks/useGeolocation';
import ZoneHeatmap from '@/components/ZoneHeatmap';
import {
    Search, Sparkles, MapPin, ChevronRight, Star,
    Sparkle, Zap, Wrench, Droplets, ChefHat, Truck,
    Heart, GraduationCap, Camera, Monitor, PawPrint, Dumbbell,
    CalendarDays, Leaf, ArrowRight, CheckCircle2, Shield,
    Navigation, Users, Ticket, Layers, Package, MessageSquare,
    ThumbsUp, Tag, BarChart3, TrendingUp,
    Cpu, Brain, TrendingDown, Bell, X, ChevronRight as Chevron,
    Activity, AlertCircle, Lightbulb, Plus, Send, Loader2, Megaphone, HelpCircle, Briefcase, RefreshCw,
    Wifi, Clock, AlertTriangle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// ── Simon proactive insight data ──────────────────────────────────────────────

const SIMON_INSIGHTS = [
    { icon: Activity, color: '#22c55e', tag: 'Demand Spike',    msg: 'Cleaning requests in your area are 3× higher than normal this weekend. Book early to lock in your usual provider.' },
    { icon: Lightbulb,color: '#f59e0b', tag: 'Simon Suggests',  msg: 'Based on seasonal patterns, it\'s the ideal week for a home HVAC tune-up — before summer demand peaks.' },
    { icon: Bell,     color: '#7c6fcd', tag: 'Smart Reminder',  msg: 'It\'s been ~3 weeks since your last deep clean. Simon has Maria R. available Thursday at 10 AM — want to rebook?' },
    { icon: TrendingUp,color:'#06b6d4', tag: 'Bundle Deal',     msg: '4 of your neighbors are booking movers the same week. Join the group bundle and save up to 30% on your move.' },
    { icon: Shield,   color: '#f43f5e', tag: 'Trust Alert',     msg: 'New in your area: Alex P. just became verified with 98% on-time rate. Simon thinks you\'ll love them for plumbing.' },
];

// ── Simon Proactive Widget ─────────────────────────────────────────────────────

const SIMON_TYPE_META = {
    demand:     { icon: Activity,    color: '#22c55e' },
    reminder:   { icon: Bell,        color: '#7c6fcd' },
    bundle:     { icon: TrendingUp,  color: '#06b6d4' },
    trust:      { icon: Shield,      color: '#f43f5e' },
    suggestion: { icon: Lightbulb,   color: '#f59e0b' },
};

function SimonInsightsWidget() {
    const navigate = useNavigate();
    const { insights: liveInsights, ready } = useSimon();
    const [idx, setIdx]           = useState(0);
    const [dismissed, setDismiss] = useState(false);
    const [animating, setAnimating] = useState(false);
    const intervalRef = useRef(null);
    const lenRef = useRef(SIMON_INSIGHTS.length);

    // Live insights mapped to display format; fall back to static while loading
    const INSIGHTS = ready && liveInsights.length > 0
        ? liveInsights.map(i => ({
            icon:  SIMON_TYPE_META[i.type]?.icon  || Activity,
            color: SIMON_TYPE_META[i.type]?.color || '#7c6fcd',
            tag:   i.tag,
            msg:   i.message,
        }))
        : SIMON_INSIGHTS;

    // Keep lenRef current so the interval closure stays accurate
    useEffect(() => { lenRef.current = INSIGHTS.length; }, [INSIGHTS.length]);

    // Reset carousel position when live data arrives
    useEffect(() => { if (ready) setIdx(0); }, [ready]);

    const rotate = (next) => {
        setAnimating(true);
        setTimeout(() => {
            setIdx(next);
            setAnimating(false);
        }, 220);
    };

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setIdx(prev => { const n = (prev + 1) % lenRef.current; rotate(n); return prev; });
        }, 5000);
        return () => clearInterval(intervalRef.current);
    }, []);

    const goTo = (n) => {
        clearInterval(intervalRef.current);
        rotate(n);
        intervalRef.current = setInterval(() => {
            setIdx(prev => { const n2 = (prev + 1) % lenRef.current; rotate(n2); return prev; });
        }, 5000);
    };

    if (dismissed) return null;

    const safeIdx = idx % INSIGHTS.length;
    const ins = INSIGHTS[safeIdx];
    const Icon = ins.icon;

    return (
        <section style={{
            borderRadius: 14, overflow: 'hidden',
            border: '1px solid var(--color-border-strong)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
        }}>
            {/* top bar */}
            <div className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-high)' }}>
                <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-md flex items-center justify-center"
                        style={{ background: 'rgba(124,111,205,0.2)' }}>
                        <Cpu style={{ width: 9, height: 9, color: '#7c6fcd' }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                        Simon AI · Live Intelligence
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                </div>
                <button onClick={() => setDismiss(true)}
                    style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', borderRadius: 6 }}>
                    <X style={{ width: 10, height: 10 }} />
                </button>
            </div>

            {/* insight body */}
            <div className="flex items-start gap-3 px-3 py-3"
                style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(4px)' : 'translateY(0)', transition: 'opacity 0.22s ease, transform 0.22s ease' }}>
                <div className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 34, height: 34, backgroundColor: `${ins.color}18`, border: `1px solid ${ins.color}30`, marginTop: 1 }}>
                    <Icon style={{ width: 15, height: 15, color: ins.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: ins.color }}>{ins.tag}</span>
                    </div>
                    <p style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--color-text-muted)' }}>{ins.msg}</p>
                    <button onClick={() => navigate('/ai')}
                        className="flex items-center gap-1 mt-2"
                        style={{ fontSize: 10, fontWeight: 600, color: '#7c6fcd', background: 'none', border: 'none', cursor: 'pointer', padding: 0, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        Ask Simon about this <ArrowRight style={{ width: 9, height: 9 }} />
                    </button>
                </div>
            </div>

            {/* dot nav */}
            <div className="flex items-center justify-center gap-1.5 pb-2.5">
                {INSIGHTS.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)}
                        style={{
                            width: i === safeIdx ? 14 : 5, height: 5, borderRadius: 99, border: 'none', cursor: 'pointer',
                            transition: 'width 0.25s ease, background-color 0.2s',
                            backgroundColor: i === safeIdx ? '#7c6fcd' : 'var(--color-border-strong)',
                            padding: 0, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                        }}
                    />
                ))}
            </div>
        </section>
    );
}

// ── Live Neighborhood Stats Component ─────────────────────────────────────────

function LiveNeighborhoodStats() {
    const { location } = useGeolocation();
    const [liveStats, setLiveStats] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        if (!location || location.length !== 2) return;

        const [lat, lng] = location;
        setConnected(true);
        setError(null);

        // Create SSE connection
        const eventSource = new EventSource(
            `/api/location/realtime/neighborhood?lat=${lat}&lng=${lng}`
        );
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLiveStats(data);
                setError(null);
            } catch (err) {
                console.error('Failed to parse SSE data:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            setConnected(false);
            setError('Connection lost');
            eventSource.close();
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [location]);

    if (!location) {
        return (
            <section style={{
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--color-border-strong)',
                backgroundColor: 'var(--color-surface)',
                boxShadow: 'var(--shadow-sm)',
            }}>
                <div className="px-3 py-2 text-center text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                    Enable location to see live neighborhood stats
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section style={{
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--color-border-strong)',
                backgroundColor: 'var(--color-surface)',
                boxShadow: 'var(--shadow-sm)',
            }}>
                <div className="px-3 py-2 text-center text-xs flex items-center justify-center gap-1.5" style={{ color: 'var(--color-error)' }}>
                    <AlertTriangle style={{ width: 12, height: 12 }} />
                    {error}
                </div>
            </section>
        );
    }

    return (
        <section style={{
            borderRadius: 14, overflow: 'hidden',
            border: '1px solid var(--color-border-strong)',
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
        }}>
            <div className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-high)' }}>
                <div className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-md flex items-center justify-center"
                        style={{ background: 'rgba(34,197,94,0.2)' }}>
                        <Wifi style={{ width: 9, height: 9, color: '#22c55e' }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)' }}>
                        Live Neighborhood Stats
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'} ${connected ? 'animate-pulse' : ''} ml-0.5`} />
                </div>
                {liveStats && (
                    <span style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>
                        Updated {new Date(liveStats.timestamp).toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="p-3">
                {liveStats ? (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <div className="text-2xl font-black mb-1" style={{ color: 'var(--color-primary)' }}>
                                {liveStats.providers_online_now}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                Providers Online Near You
                            </div>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <div className="text-2xl font-black mb-1" style={{ color: 'var(--color-primary)' }}>
                                {liveStats.accepting_jobs_now}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                Accepting Jobs Now
                            </div>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <Clock style={{ width: 16, height: 16, color: liveStats.surge_active ? '#ef4444' : '#22c55e' }} />
                                <span className="text-xl font-black" style={{ color: liveStats.surge_active ? '#ef4444' : '#22c55e' }}>
                                    {liveStats.demand_index}
                                </span>
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                Demand Index {liveStats.surge_active ? '(Surge!)' : ''}
                            </div>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                            <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
                                Top Services
                            </div>
                            <div className="flex flex-wrap justify-center gap-1">
                                {liveStats.top_available_categories?.slice(0, 3).map((cat, i) => (
                                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" style={{ color: 'var(--color-text-subtle)' }} />
                        <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                            Connecting to live stats...
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
}

// ── Static data ───────────────────────────────────────────────────────────────

const CATEGORIES = [
    { slug: 'cleaning',    label: 'Cleaning',     icon: Sparkle        },
    { slug: 'plumbing',    label: 'Plumbing',      icon: Droplets       },
    { slug: 'electrical',  label: 'Electrical',    icon: Zap            },
    { slug: 'moving',      label: 'Moving',        icon: Truck          },
    { slug: 'beauty',      label: 'Beauty',        icon: Heart          },
    { slug: 'chef',        label: 'Personal Chef', icon: ChefHat        },
    { slug: 'fitness',     label: 'Fitness',       icon: Dumbbell       },
    { slug: 'tutoring',    label: 'Tutoring',      icon: GraduationCap  },
    { slug: 'pet-care',    label: 'Pet Care',      icon: PawPrint       },
    { slug: 'photography', label: 'Photography',   icon: Camera         },
    { slug: 'tech',        label: 'Tech Support',  icon: Monitor        },
    { slug: 'garden',      label: 'Gardening',     icon: Leaf           },
];

const PROVIDERS = [
    { id: 1, name: 'Marcus V.',  role: 'Private Concierge', rating: 4.9, reviews: 142, badge: 'Top Rated', location: 'Upper East Side', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', online: true  },
    { id: 2, name: 'Elena Rose', role: 'Personal Chef',     rating: 4.8, reviews: 98,  badge: 'Premium',   location: 'Chelsea',         image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80', online: true  },
    { id: 3, name: 'David Chen', role: 'Wellness Coach',    rating: 5.0, reviews: 61,  badge: 'Rising',    location: 'Midtown',         image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80', online: false },
    { id: 4, name: 'Sarah K.',   role: 'Interior Designer', rating: 4.7, reviews: 203, badge: 'Verified',  location: 'Brooklyn',        image: 'https://images.unsplash.com/photo-1494790108755-2616b612b977?w=400&q=80', online: true  },
];

const STATS = [
    { value: '2,400+', label: 'Verified Providers' },
    { value: '98%',    label: 'Satisfaction Rate'  },
    { value: '15K+',   label: 'Jobs Completed'     },
    { value: '4.9★',   label: 'Avg Rating'         },
];

const HOW_IT_WORKS = [
    { icon: Search,       num: '01', title: 'Discover', desc: 'Browse verified providers across every category — AI-ranked for your needs.' },
    { icon: CalendarDays, num: '02', title: 'Book',     desc: 'Instantly book with real-time availability. No calls, no waiting.'         },
    { icon: CheckCircle2, num: '03', title: 'Done',     desc: 'Provider shows up, job gets done. Rate & earn loyalty points.'             },
];

const EVENTS = [
    { id: 1, title: 'Neighborhood Block Party',   date: 'Jul 4',  free: true,  price: 0,  attendees: 120, venue: 'Riverside Park'  },
    { id: 2, title: 'Home Renovation Workshop',   date: 'Jul 9',  free: false, price: 15, attendees: 28,  venue: 'Community Hall'  },
    { id: 3, title: 'Summer Food & Craft Market', date: 'Jul 12', free: false, price: 5,  attendees: 340, venue: 'Main Square'     },
];

const BUNDLES = [
    { id: 1, title: 'Spring Deep Clean',  service: 'Cleaning',    discount: 25, slots: 3, total: 8, price: 89  },
    { id: 2, title: 'Move-In Package',    service: 'Moving',      discount: 20, slots: 1, total: 5, price: 220 },
    { id: 3, title: 'Birthday Photo Pkg', service: 'Photography', discount: 30, slots: 2, total: 4, price: 160 },
];

const COMMUNITY = [
    { id: 1, emoji: '👍', author: 'J. Park',   title: "Best plumber I've ever hired",  body: 'Called Marcus at 8am, fixed by 10. Incredibly professional.', likes: 14, replies: 3 },
    { id: 2, emoji: '🔍', author: 'A. Torres', title: 'Lost: black Lab near 5th Ave',  body: 'Answers to Biscuit. Reward offered. Please DM.',               likes: 8,  replies: 7 },
    { id: 3, emoji: '💼', author: 'R. Chen',   title: 'Part-time dog walker needed',   body: 'Mon–Fri 7–9am. $18/hr. Must love dogs.',                       likes: 5,  replies: 2 },
];

const SPENDING = [
    { label: 'This month',  value: '$342',    delta: '+12%', up: true  },
    { label: 'Last month',  value: '$305',    delta: null,   up: null  },
    { label: 'Top service', value: 'Cleaning',delta: null,   up: null  },
    { label: 'Bookings',    value: '7',       delta: '+3',   up: true  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function SectionHeader({ title, href, label = 'See all' }) {
    return (
        <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>{title}</h2>
            <Link to={href} className="flex items-center gap-0.5 text-[11px] font-medium transition-colors"
                style={{ color: 'var(--color-text-subtle)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-subtle)')}>
                {label} <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
        </div>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { user } = useAuth();

    const [search, setSearch]               = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [visible, setVisible]             = useState(false);
    const [city, setCity]                   = useState(null);
    const [communityPosts, setCommunityPosts] = useState([]);
    const [communityLoading, setCommunityLoading] = useState(true);
    const [postDialog, setPostDialog] = useState(false);
    const [postForm, setPostForm] = useState({ type: 'general', title: '', body: '' });
    const [posting, setPosting] = useState(false);
    const [liveProviders, setLiveProviders] = useState([]);
    const [liveStats, setLiveStats]         = useState(null);
    const [quickBookProvider, setQuickBookProvider] = useState(null);

    // Load community posts from Supabase
    useEffect(() => {
        const loadPosts = async () => {
            const { data } = await supabase.from('community_posts').select('*').order('created_date', { ascending: false }).limit(5);
            if (data) setCommunityPosts(data);
            setCommunityLoading(false);
        };
        loadPosts();
    }, []);

    const createPost = async () => {
        if (!postForm.title || !postForm.body) { toast.error('Title and message required'); return; }
        if (!user) { toast.error('Please sign in first'); return; }
        setPosting(true);
        const { error } = await supabase.from('community_posts').insert([{
            type: postForm.type,
            title: postForm.title,
            body: postForm.body,
            author_email: user.email,
            author_name: user.full_name || user.email?.split('@')[0],
            author_id: user.id,
            upvotes: 0,
            reply_count: 0
        }]);
        if (!error) {
            toast.success('Posted!');
            setPostDialog(false);
            setPostForm({ type: 'general', title: '', body: '' });
            // Reload posts
            const { data } = await supabase.from('community_posts').select('*').order('created_date', { ascending: false }).limit(5);
            if (data) setCommunityPosts(data);
        } else {
            toast.error(error.message || 'Failed to post');
        }
        setPosting(false);
    };

    // Fetch live providers once on mount
    useEffect(() => {
        fetch('/api/providers/featured?limit=8')
            .then(r => r.json())
            .then(d => { if (d.providers?.length) setLiveProviders(d.providers); })
            .catch(() => {});
    }, []);

    // Platform stats — true SSE push (server sends updates when DB changes)
    useEffect(() => {
        let reconnectTimer = null;
        let es = null;

        function connectStats() {
            es = new EventSource('/api/realtime/platform-stats');
            es.addEventListener('platform_stats', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    if (d.stats) setLiveStats(d.stats);
                } catch (_) {}
            });
            es.onerror = () => {
                es.close();
                reconnectTimer = setTimeout(connectStats, 8000);
            };
        }

        connectStats();

        return () => {
            clearTimeout(reconnectTimer);
            es?.close();
        };
    }, []);

    useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'Accept-Language': 'en' } });
                    const data = await res.json();
                    setCity(data.address?.city || data.address?.town || data.address?.village || data.address?.county || null);
                } catch { /* silent */ }
            },
            () => {},
            { timeout: 6000 }
        );
    }, []);

    const handleSearch = (e) => { e.preventDefault(); if (search.trim()) navigate(`/services?q=${encodeURIComponent(search.trim())}`); };

    const anim = (d = 0) => ({
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity 0.5s cubic-bezier(0.19,1,0.22,1) ${d}s, transform 0.5s cubic-bezier(0.19,1,0.22,1) ${d}s`,
        willChange: 'opacity, transform',
    });

    const gradientText = isDark
        ? { background: 'linear-gradient(135deg,#ffffff 0%,rgba(255,255,255,0.4) 100%)' }
        : { background: 'linear-gradient(135deg,#080808 0%,rgba(8,8,8,0.45) 100%)' };

    /* row hover util */
    const rowHover = {
        onMouseEnter: e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-high)'),
        onMouseLeave: e => (e.currentTarget.style.backgroundColor = 'transparent'),
    };

    const cardHover = {
        onMouseEnter: e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)', e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'),
        onMouseLeave: e => (e.currentTarget.style.borderColor = 'var(--color-border)',        e.currentTarget.style.transform = 'translateY(0)',    e.currentTarget.style.boxShadow = 'none'),
    };

    return (
        <div className="w-full flex flex-col gap-4 md:gap-7">

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section className="pt-1 relative flex flex-col items-center text-center">
                {/* ambient */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.028) 0%,transparent 70%)', filter: 'blur(32px)' }} />

                {/* pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold mb-3"
                    style={{ ...anim(0), fontSize: 10, backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-strong)' }}>
                    <Sparkles style={{ width: 9, height: 9 }} />
                    AI-powered neighborhood services
                </div>

                {/* headline */}
                <h1 className="leading-tight mb-2" style={{
                    ...anim(0.04),
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    fontSize: 'clamp(2.1rem, 7vw, 3.5rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent-2) 80%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1.1,
                    textAlign: 'center',
                }}>
                    Your neighborhood, connected
                </h1>

                {/* short subtitle */}
                <p className="leading-relaxed mb-3"
                    style={{ ...anim(0.06), fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                    Real people, real skills — ready when you need them most.
                </p>

                {/* trust row */}
                <div className="flex items-center justify-center gap-2 mb-3" style={anim(0.08)}>
                    {['Verified', 'Insured', 'Instant Booking'].map((label) => (
                        <div key={label} className="flex items-center gap-1">
                            <CheckCircle2 style={{ width: 10, height: 10, color: '#22c55e', flexShrink: 0 }} />
                            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-muted)', letterSpacing: '0.01em' }}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* CTA buttons — stack on mobile, row on sm+ */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 w-full max-w-xs sm:max-w-none sm:w-auto" style={anim(0.1)}>
                    <button
                        onClick={() => navigate('/services')}
                        className="flex items-center justify-center gap-1.5 px-5 rounded-xl font-semibold transition-all"
                        style={{ fontSize: 12, height: 40, backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.18)', letterSpacing: '-0.01em' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <Zap style={{ width: 12, height: 12 }} />
                        Book a Service
                    </button>
                    <button
                        onClick={() => navigate('/provider/dashboard')}
                        className="flex items-center justify-center gap-1.5 px-5 rounded-xl font-semibold transition-all"
                        style={{ fontSize: 12, height: 40, backgroundColor: 'transparent', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)', cursor: 'pointer', letterSpacing: '-0.01em' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-high)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <Users style={{ width: 12, height: 12 }} />
                        Become a Provider
                    </button>
                </div>

                {/* city chip */}
                {city && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium mb-3"
                        style={{ fontSize: 10, backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-subtle)', border: '1px solid var(--color-border)' }}>
                        <Navigation style={{ width: 9, height: 9 }} /> {city}
                    </div>
                )}

                {/* search */}
                <form onSubmit={handleSearch} className="relative w-full max-w-md" style={anim(0.12)}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ width: 14, height: 14, color: 'var(--color-text-subtle)' }} />
                    <input type="text" placeholder="Search cleaning, plumbing, chef…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                        className="w-full outline-none"
                        style={{
                            height: 42, paddingLeft: 36, paddingRight: 80, fontSize: 13,
                            backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
                            border: `1px solid ${searchFocused ? 'var(--color-border-accent)' : 'var(--color-border-strong)'}`,
                            borderRadius: 10, boxShadow: searchFocused ? 'var(--shadow-glow), 0 0 0 3px rgba(255,255,255,0.05)' : 'var(--shadow-sm)',
                            transition: 'all 0.2s cubic-bezier(0.25,1,0.5,1)', fontFamily: 'Inter,sans-serif', letterSpacing: '-0.011em',
                        }} />
                    <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-semibold px-3 rounded-lg transition-opacity"
                        style={{ height: 30, backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        Search
                    </button>
                </form>

                {/* tags */}
                <div className="flex flex-wrap justify-center gap-1.5 mt-2.5" style={anim(0.16)}>
                    {['Cleaning', 'Plumbing', 'Chef', 'Moving', 'Fitness'].map(tag => (
                        <button key={tag} onClick={() => navigate(`/services?q=${encodeURIComponent(tag)}`)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                            style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)', e.currentTarget.style.color = 'var(--color-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)',        e.currentTarget.style.color = 'var(--color-text-muted)')}>
                            {tag}
                        </button>
                    ))}
                </div>
            </section>

            {/* ── Simon Proactive Intelligence ───────────────────────────── */}
            <SimonInsightsWidget />

            {/* ── Live Neighborhood Stats ─────────────────────────────────── */}
            <LiveNeighborhoodStats />

            {/* ── Zone Availability Heatmap ──────────────────────────────── */}
            <ZoneHeatmap />

            {/* ── Stats ─────────────────────────────────────────────────── */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(liveStats ? [
                    { value: liveStats.total_providers ? `${Number(liveStats.total_providers).toLocaleString()}+` : '2,400+', label: 'Verified Providers' },
                    { value: liveStats.avg_rating ? `${liveStats.avg_rating}★` : '4.9★', label: 'Avg Rating' },
                    { value: liveStats.completed_bookings ? `${Number(liveStats.completed_bookings).toLocaleString()}+` : '15K+', label: 'Jobs Completed' },
                    { value: liveStats.total_reviews ? `${Number(liveStats.total_reviews).toLocaleString()}+` : '8K+', label: 'Reviews' },
                ] : STATS).map((s, i) => (
                    <div key={s.label} className="rounded-xl relative overflow-hidden shimmer"
                        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '12px 14px', animation: `fadeInUp 0.45s cubic-bezier(0.19,1,0.22,1) ${i * 0.05}s both`, boxShadow: 'var(--shadow-sm)' }}>
                        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
                            style={{ background: isDark ? 'radial-gradient(circle at top right,rgba(255,255,255,0.055) 0%,transparent 70%)' : 'radial-gradient(circle at top right,rgba(0,0,0,0.04) 0%,transparent 70%)' }} />
                        <div className="text-lg font-black mb-0.5" style={{ letterSpacing: '-0.045em', color: 'var(--color-primary)' }}>{s.value}</div>
                        <div className="text-[10px]" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.005em' }}>{s.label}</div>
                    </div>
                ))}
            </section>

            {/* ── Categories ────────────────────────────────────────────── */}
            <section>
                <SectionHeader title="Browse by Category" href="/services" />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {CATEGORIES.map((cat, i) => (
                        <Link key={cat.slug} to={`/category/${cat.slug}`}
                            className="flex flex-col items-center gap-1.5 rounded-xl text-center"
                            style={{ padding: '10px 6px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none', animation: `fadeInUp 0.45s cubic-bezier(0.19,1,0.22,1) ${i * 0.022}s both`, transition: 'all 0.22s cubic-bezier(0.25,1,0.5,1)', willChange: 'transform' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)', e.currentTarget.style.backgroundColor = 'var(--color-surface-high)', e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)',        e.currentTarget.style.backgroundColor = 'var(--color-surface)',      e.currentTarget.style.transform = 'translateY(0)',    e.currentTarget.style.boxShadow = 'none')}>
                            <div className="flex items-center justify-center rounded-lg"
                                style={{ width: 30, height: 30, backgroundColor: 'var(--color-surface-high)', transition: 'background-color 0.2s' }}>
                                <cat.icon style={{ width: 14, height: 14, color: 'var(--color-text-muted)' }} />
                            </div>
                            <span className="text-[10px] font-semibold leading-tight" style={{ color: 'var(--color-text-muted)' }}>{cat.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── Events ────────────────────────────────────────────────── */}
            <section>
                <SectionHeader title={city ? `Events in ${city}` : 'Events Near You'} href="/events" label="Browse all" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {EVENTS.map((ev, i) => (
                        <div key={ev.id} onClick={() => navigate('/events')}
                            className="rounded-xl cursor-pointer transition-all duration-200"
                            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '12px 14px', animation: `fadeInUp 0.45s cubic-bezier(0.19,1,0.22,1) ${i * 0.06}s both` }}
                            {...cardHover}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex items-center justify-center rounded-lg shrink-0"
                                        style={{ width: 28, height: 28, backgroundColor: 'var(--color-surface-high)' }}>
                                        <Ticket style={{ width: 13, height: 13, color: 'var(--color-text-muted)' }} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold leading-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{ev.title}</div>
                                        <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{ev.venue}</div>
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                    style={{ backgroundColor: ev.free ? 'rgba(110,231,183,0.1)' : 'var(--color-surface-high)', color: ev.free ? 'var(--color-success)' : 'var(--color-text-muted)', border: `1px solid ${ev.free ? 'rgba(110,231,183,0.2)' : 'var(--color-border)'}` }}>
                                    {ev.free ? 'Free' : `$${ev.price}`}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                    <CalendarDays style={{ width: 9, height: 9 }} />{ev.date}
                                </span>
                                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
                                    <Users style={{ width: 9, height: 9 }} />{ev.attendees} going
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => navigate('/events')}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-lg text-[12px] font-semibold transition-all"
                    style={{ padding: '8px', backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)', e.currentTarget.style.borderColor = 'var(--color-border-accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)', e.currentTarget.style.borderColor = 'var(--color-border)')}>
                    <CalendarDays style={{ width: 12, height: 12 }} /> Create or browse events
                </button>
            </section>

            {/* ── Service Bundles ───────────────────────────────────────── */}
            <section style={anim(0.1)}>
                <SectionHeader title="Service Bundles" href="/bundles" label="All bundles" />
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <Layers style={{ width: 13, height: 13, color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <span className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                            Group up with neighbors and <strong style={{ color: 'var(--color-primary)' }}>save up to 30%</strong> on shared bookings.
                        </span>
                    </div>
                    {BUNDLES.map((b, i) => (
                        <div key={b.id} onClick={() => navigate('/bundles')}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer transition-colors"
                            style={{ borderBottom: i < BUNDLES.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                            {...rowHover}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex items-center justify-center rounded-lg shrink-0"
                                    style={{ width: 26, height: 26, backgroundColor: 'var(--color-surface-high)' }}>
                                    <Package style={{ width: 12, height: 12, color: 'var(--color-text-muted)' }} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[12px] font-600 truncate" style={{ color: 'var(--color-primary)', fontWeight: 600, letterSpacing: '-0.01em' }}>{b.title}</div>
                                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{b.service} · {b.slots} of {b.total} slots left</div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[12px] font-bold" style={{ color: 'var(--color-primary)' }}>${b.price}</div>
                                <div className="text-[10px] font-semibold" style={{ color: 'var(--color-success)' }}>−{b.discount}%</div>
                            </div>
                        </div>
                    ))}
                    <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <button onClick={() => navigate('/bundles')}
                            className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
                            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                            <Tag style={{ width: 10, height: 10 }} /> Start your own bundle <ArrowRight style={{ width: 10, height: 10 }} />
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Marketplace ───────────────────────────────────────────── */}
            <section style={anim(0.14)}>
                <SectionHeader title="Marketplace" href="/services" label="Explore" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                        { icon: TrendingUp, title: 'Trending Now',     desc: 'Most-booked services this week',          href: '/services?sort=trending', badge: 'Hot'     },
                        { icon: Sparkles,   title: 'AI Picks for You', desc: 'Curated by Simon AI for your activity',   href: '/recommendations',        badge: 'Smart'   },
                        { icon: Star,       title: 'Top Rated',        desc: 'Providers with 4.8+ ratings nearby',     href: '/services?sort=rating',   badge: 'Premium' },
                    ].map((item, i) => (
                        <div key={i} onClick={() => navigate(item.href)}
                            className="rounded-xl cursor-pointer relative overflow-hidden"
                            style={{ padding: '14px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', transition: 'all 0.22s cubic-bezier(0.25,1,0.5,1)', willChange: 'transform' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)', e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)',        e.currentTarget.style.transform = 'translateY(0)',    e.currentTarget.style.boxShadow = 'none')}>
                            <div className="absolute top-0 right-0 w-14 h-14 pointer-events-none"
                                style={{ background: isDark ? 'radial-gradient(circle at top right,rgba(255,255,255,0.03) 0%,transparent 70%)' : 'radial-gradient(circle at top right,rgba(0,0,0,0.02) 0%,transparent 70%)' }} />
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, backgroundColor: 'var(--color-surface-high)' }}>
                                    <item.icon style={{ width: 13, height: 13, color: 'var(--color-text-muted)' }} />
                                </div>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-subtle)', border: '1px solid var(--color-border)' }}>
                                    {item.badge}
                                </span>
                            </div>
                            <div className="text-[12px] font-bold mb-1" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{item.title}</div>
                            <p className="text-[10px] leading-relaxed m-0" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Community ─────────────────────────────────────────────── */}
            <section style={anim(0.18)}>
                <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-sm font-bold" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>{city ? `Community · ${city}` : 'Community'}</h2>
                    <div className="flex items-center gap-2">
                        {user && (
                            <button onClick={() => setPostDialog(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
                                style={{ background: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                <Plus className="h-3 w-3" /> Post
                            </button>
                        )}
                        <Link to="/community" className="flex items-center gap-0.5 text-[11px] font-medium transition-colors"
                            style={{ color: 'var(--color-text-subtle)', textDecoration: 'none' }}>
                            Open board <ChevronRight style={{ width: 12, height: 12 }} />
                        </Link>
                    </div>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {communityLoading ? (
                        <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-subtle)' }}>Loading...</div>
                    ) : communityPosts.length === 0 ? (
                        <div className="p-6 text-center">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--color-text-subtle)' }} />
                            <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>No posts yet. Be the first!</p>
                        </div>
                    ) : (
                        communityPosts.map((post, i) => (
                            <div key={post.id} onClick={() => navigate('/community')}
                                className="flex gap-2.5 px-3.5 py-2.5 cursor-pointer transition-colors"
                                style={{ borderBottom: i < communityPosts.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                                {...rowHover}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                            style={{ background: post.type === 'job' ? 'var(--color-surface-high)' : post.type === 'announcement' ? 'rgba(59,130,246,0.1)' : 'var(--color-surface-high)', color: 'var(--color-text-muted)' }}>
                                            {post.type || 'post'}
                                        </span>
                                        {post.neighborhood && (
                                            <span className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>
                                                <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{post.neighborhood}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] font-bold truncate mb-0.5" style={{ color: 'var(--color-primary)', letterSpacing: '-0.01em' }}>{post.title}</div>
                                    <p className="text-[10px] m-0 truncate" style={{ color: 'var(--color-text-muted)' }}>{post.body}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>{post.author_name || post.author_email?.split('@')[0]}</span>
                                        <span className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>
                                            <ThumbsUp style={{ width: 8, height: 8 }} />{post.upvotes || 0}
                                        </span>
                                        <span className="flex items-center gap-1 text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>
                                            <MessageSquare style={{ width: 8, height: 8 }} />{post.reply_count || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Jobs · Lost & Found · Announcements</span>
                        <button onClick={() => user ? setPostDialog(true) : navigate('/login')}
                            className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
                            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                            Post something <ArrowRight style={{ width: 10, height: 10 }} />
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Financial Overview ────────────────────────────────────── */}
            <section style={anim(0.22)}>
                <SectionHeader title="Financial Overview" href="/spending" label="Full report" />
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {/* 2-col mobile / 4-col desktop grid with inner dividers */}
                    <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {SPENDING.map((item, i) => (
                            <div key={i} className="p-3.5"
                                style={{
                                    /* right border: every item except last in each row */
                                    borderRight: (i % 2 !== 1) ? '1px solid var(--color-border)' : 'none',
                                    /* bottom border on mobile 2-col: first row (0,1) */
                                    borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                                }}>
                                <div className="text-[10px] mb-1" style={{ color: 'var(--color-text-subtle)' }}>{item.label}</div>
                                <div className="text-base font-extrabold" style={{ letterSpacing: '-0.03em', color: 'var(--color-primary)' }}>{item.value}</div>
                                {item.delta && (
                                    <div className="flex items-center gap-1 text-[10px] font-semibold mt-0.5" style={{ color: 'var(--color-success)' }}>
                                        <TrendingUp style={{ width: 9, height: 9 }} />{item.delta}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                            <BarChart3 style={{ width: 11, height: 11, color: 'var(--color-text-subtle)' }} />
                            <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>Synced from your bookings</span>
                        </div>
                        <button onClick={() => navigate('/spending')}
                            className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
                            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                            AI Insights <Sparkles style={{ width: 10, height: 10 }} />
                        </button>
                    </div>
                </div>
            </section>

            {/* ── How it Works ──────────────────────────────────────────── */}
            <section className="rounded-xl relative overflow-hidden"
                style={{ ...anim(0.26), backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '18px 20px' }}>
                <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
                    style={{ background: isDark ? 'radial-gradient(circle at top right,rgba(255,255,255,0.02) 0%,transparent 65%)' : 'radial-gradient(circle at top right,rgba(0,0,0,0.02) 0%,transparent 65%)' }} />
                <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>How Truvornex Works</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {HOW_IT_WORKS.map((step, i) => (
                        <div key={i} className="flex gap-2.5"
                            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: `opacity 0.5s cubic-bezier(0.19,1,0.22,1) ${0.26 + i * 0.08}s, transform 0.5s cubic-bezier(0.19,1,0.22,1) ${0.26 + i * 0.08}s` }}>
                            <div className="flex items-center justify-center rounded-lg shrink-0"
                                style={{ width: 30, height: 30, backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)' }}>
                                <step.icon style={{ width: 13, height: 13, color: 'var(--color-text-muted)' }} />
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[9px] font-bold tracking-widest" style={{ color: 'var(--color-text-subtle)' }}>{step.num}</span>
                                    <span className="text-[12px] font-bold" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{step.title}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed m-0" style={{ color: 'var(--color-text-muted)' }}>{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Featured Providers ────────────────────────────────────── */}
            <section>
                <SectionHeader title={`Top-Rated Providers${city ? ` in ${city}` : ''}`} href="/nearby" label="View all" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(liveProviders.length > 0 ? liveProviders : PROVIDERS).map((p, i) => {
                        const isLive   = liveProviders.length > 0;
                        const name     = isLive ? (p.full_name || p.business_name || 'Provider') : p.name;
                        const role     = isLive ? (p.category_slug || 'Service Provider') : p.role;
                        const rating   = isLive ? (parseFloat(p.avg_rating) || 0).toFixed(1) : p.rating;
                        const reviews  = isLive ? (p.review_count || 0) : p.reviews;
                        const image    = isLive ? (p.avatar_url || p.cover_image_url) : p.image;
                        const online   = isLive ? p.is_online : p.online;
                        const badge    = isLive ? (p.tier || 'Verified') : p.badge;
                        const href     = isLive ? `/providers/${p.user_id || p.id}` : `/providers/${p.id}`;
                        const trust    = isLive ? (p.trust_score || 0) : null;
                        return (
                            <Link key={p.id || i} to={href}
                                className="rounded-xl overflow-hidden block group"
                                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none', animation: `fadeInUp 0.45s cubic-bezier(0.19,1,0.22,1) ${i * 0.06}s both`, transition: 'transform 0.24s cubic-bezier(0.25,1,0.5,1), box-shadow 0.24s cubic-bezier(0.25,1,0.5,1), border-color 0.24s', willChange: 'transform' }}
                                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)', e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)', e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
                                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)',    e.currentTarget.style.boxShadow = 'none',                     e.currentTarget.style.borderColor = 'var(--color-border)')}>
                                <div className="relative overflow-hidden" style={{ height: 100, backgroundColor: 'var(--color-surface-high)' }}>
                                    {image ? (
                                        <img src={image} alt={name}
                                            className="w-full h-full object-cover transition-all duration-700"
                                            style={{ filter: 'grayscale(0.35)' }}
                                            onMouseEnter={e => (e.currentTarget.style.filter = 'grayscale(0)',    e.currentTarget.style.transform = 'scale(1.05)')}
                                            onMouseLeave={e => (e.currentTarget.style.filter = 'grayscale(0.35)', e.currentTarget.style.transform = 'scale(1)')} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-border-strong)', letterSpacing: '-0.04em' }}>
                                                {name?.charAt(0)?.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 55%)' }} />
                                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {badge}
                                    </span>
                                    {online && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-success)' }} />}
                                    {trust > 0 && (
                                        <span className="absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1 py-0.5 rounded"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#22c55e' }}>
                                            {trust}pts
                                        </span>
                                    )}
                                </div>
                                <div className="p-2.5">
                                    <div className="text-[11px] font-bold mb-0.5 truncate" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{name}</div>
                                    <div className="text-[10px] mb-1.5 truncate" style={{ color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{role?.replace(/_/g, ' ')}</div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Star style={{ width: 9, height: 9, fill: rating >= 4 ? '#f59e0b' : 'var(--color-text-subtle)', color: rating >= 4 ? '#f59e0b' : 'var(--color-text-subtle)' }} />
                                            <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text)' }}>{rating || '—'}</span>
                                            {reviews > 0 && <span className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>({reviews})</span>}
                                        </div>
                                        {online ? (
                                            <span className="text-[9px] font-semibold" style={{ color: '#22c55e' }}>Available</span>
                                        ) : (
                                            <span className="text-[9px]" style={{ color: 'var(--color-text-subtle)' }}>Offline</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* ── Quick Links ───────────────────────────────────────────── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={anim(0.32)}>
                <Link to="/nearby"
                    className="flex items-center justify-between rounded-xl transition-all duration-200 group"
                    style={{ padding: '14px 16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
                    {...cardHover}>
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center rounded-lg shrink-0"
                            style={{ width: 34, height: 34, backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border-strong)' }}>
                            <MapPin style={{ width: 15, height: 15, color: 'var(--color-text-muted)' }} />
                        </div>
                        <div>
                            <div className="text-[12px] font-semibold" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Providers Near You</div>
                            <p className="text-[10px] mt-0.5 m-0" style={{ color: 'var(--color-text-muted)' }}>{city ? `Available in ${city} now` : 'Available in your area now'}</p>
                        </div>
                    </div>
                    <ArrowRight className="transition-transform group-hover:translate-x-1" style={{ width: 14, height: 14, color: 'var(--color-text-subtle)', flexShrink: 0 }} />
                </Link>

                <Link to="/ai"
                    className="flex items-center justify-between rounded-xl transition-all duration-200 group relative overflow-hidden"
                    style={{ padding: '14px 16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-strong)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-accent)', e.currentTarget.style.transform = 'translateY(-1px)', e.currentTarget.style.boxShadow = 'var(--shadow-glow)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-strong)', e.currentTarget.style.transform = 'translateY(0)',    e.currentTarget.style.boxShadow = 'none')}>
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: isDark ? 'radial-gradient(circle at top left,rgba(255,255,255,0.025) 0%,transparent 55%)' : 'radial-gradient(circle at top left,rgba(0,0,0,0.02) 0%,transparent 55%)' }} />
                    <div className="flex items-center gap-2.5 relative">
                        <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 34, height: 34, backgroundColor: 'var(--color-primary)' }}>
                            <Sparkles style={{ width: 15, height: 15, color: 'var(--color-on-primary)' }} />
                        </div>
                        <div>
                            <div className="text-[12px] font-semibold" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Meet Simon AI</div>
                            <p className="text-[10px] mt-0.5 m-0" style={{ color: 'var(--color-text-muted)' }}>Smart booking & recommendations</p>
                        </div>
                    </div>
                    <ArrowRight className="relative transition-transform group-hover:translate-x-1" style={{ width: 14, height: 14, color: 'var(--color-text-subtle)', flexShrink: 0 }} />
                </Link>
            </section>

            {/* ── Provider CTA ──────────────────────────────────────────── */}
            <section className="rounded-xl relative overflow-hidden"
                style={{ ...anim(0.38), backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', padding: '18px 20px' }}>
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 80% 0%,rgba(255,255,255,0.07) 0%,transparent 60%)' }} />
                <div className="relative flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold mb-2"
                            style={{ backgroundColor: 'rgba(128,128,128,0.18)', color: 'var(--color-on-primary)', opacity: 0.85 }}>
                            <Shield style={{ width: 8, height: 8 }} /> Join 2,400+ providers
                        </div>
                        <h2 className="font-black mb-1" style={{ fontSize: 15, letterSpacing: '-0.03em' }}>Are you a service provider?</h2>
                        <p className="text-[11px] leading-relaxed mb-3" style={{ opacity: 0.65, maxWidth: 400 }}>
                            Earn more with Truvornex. Set your hours, manage bookings, grow your business.
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] mb-3" style={{ opacity: 0.6 }}>
                            {['Free to join', 'Instant payouts', 'AI-powered tools', 'Dedicated support'].map(f => (
                                <span key={f} className="flex items-center gap-1">
                                    <CheckCircle2 style={{ width: 8, height: 8 }} />{f}
                                </span>
                            ))}
                        </div>
                        <button onClick={() => navigate('/provider')}
                            className="inline-flex items-center gap-1.5 rounded-lg text-[12px] font-bold transition-all"
                            style={{ padding: '7px 14px', backgroundColor: 'var(--color-on-primary)', color: 'var(--color-primary)', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9', e.currentTarget.style.transform = 'translateY(-1px)')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1',   e.currentTarget.style.transform = 'translateY(0)')}>
                            Start as Provider <ArrowRight style={{ width: 12, height: 12 }} />
                        </button>
                    </div>
                    <div className="hidden sm:flex items-center justify-center rounded-xl shrink-0"
                        style={{ width: 60, height: 60, backgroundColor: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Wrench style={{ width: 24, height: 24, opacity: 0.45 }} />
                    </div>
                </div>
            </section>

            {/* Post Dialog */}
            <Dialog open={postDialog} onOpenChange={setPostDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>New Community Post</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-1">
                        <Input placeholder="Title *" value={postForm.title} onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))} className="rounded-xl" />
                        <Textarea placeholder="What's on your mind? *" value={postForm.body} onChange={e => setPostForm(p => ({ ...p, body: e.target.value }))} className="rounded-xl resize-none" rows={3} />
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => setPostDialog(false)}>Cancel</Button>
                            <Button className="flex-1 h-10 rounded-xl gap-2" onClick={createPost} disabled={posting}>
                                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {posting ? 'Posting...' : 'Post'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
