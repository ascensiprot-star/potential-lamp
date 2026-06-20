import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Search, SlidersHorizontal, MapPin, X, ChevronRight,
    Sparkle, Zap, Droplets, Truck, Heart, ChefHat, Dumbbell,
    GraduationCap, PawPrint, Camera, Monitor, Leaf, Star
} from 'lucide-react';

const CATEGORY_PILLS = ['All', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Beauty', 'Chef', 'Fitness', 'Tutoring', 'Pet Care', 'Photography', 'Tech', 'Gardening'];

const CATEGORY_ICONS = {
    'Cleaning': { icon: Sparkle, color: '#3b82f6' },
    'Plumbing': { icon: Droplets, color: '#06b6d4' },
    'Electrical': { icon: Zap, color: '#f59e0b' },
    'Moving': { icon: Truck, color: '#8b5cf6' },
    'Beauty': { icon: Heart, color: '#ec4899' },
    'Chef': { icon: ChefHat, color: '#ef4444' },
    'Fitness': { icon: Dumbbell, color: '#22c55e' },
    'Tutoring': { icon: GraduationCap, color: '#f97316' },
    'Pet Care': { icon: PawPrint, color: '#84cc16' },
    'Photography': { icon: Camera, color: '#a855f7' },
    'Tech': { icon: Monitor, color: '#0ea5e9' },
    'Gardening': { icon: Leaf, color: '#16a34a' },
};

const MOCK_CATEGORIES = Object.entries(CATEGORY_ICONS).map(([name, { icon, color }], id) => ({
    id: id + 1, name, icon, color, slug: name.toLowerCase().replace(' ', '-'), count: Math.floor(Math.random() * 80 + 20)
}));

export default function Services() {
    const location = useLocation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ rating: 0, maxDistance: 50, available: false });
    const searchRef = useRef(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q') || '';
        setSearch(q);
        if (searchRef.current && q) searchRef.current.focus();
    }, [location.search]);

    const filteredCategories = MOCK_CATEGORIES.filter(c =>
        (!search || c.name.toLowerCase().includes(search.toLowerCase())) &&
        (activeCategory === 'All' || c.name.toLowerCase() === activeCategory.toLowerCase())
    );

    const handleSearch = (e) => {
        e.preventDefault();
        const q = search.trim();
        if (q) navigate(`/services?q=${encodeURIComponent(q)}`);
        else navigate('/services');
    };

    return (
        <div className="pb-8 space-y-6">
            {/* Header */}
            <div className="fade-in">
                <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: 'var(--color-primary)' }}>
                    Explore Services
                </h1>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Find trusted providers in your neighborhood
                </p>
            </div>

            {/* Search + filter row */}
            <div className="flex gap-2 fade-in-delay-1">
                <form onSubmit={handleSearch} className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                        style={{ color: 'var(--color-text-subtle)' }} />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search services or providers…"
                        className="w-full h-11 pl-10 pr-4 rounded-xl text-sm outline-none"
                        style={{
                            backgroundColor: 'var(--color-surface-high)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                        }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </form>
                <button onClick={() => setFilterOpen(true)}
                    className="h-11 w-11 rounded-xl flex items-center justify-center transition-colors"
                    style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <SlidersHorizontal className="h-4 w-4" />
                </button>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {CATEGORY_PILLS.map(pill => (
                    <button key={pill} onClick={() => setActiveCategory(pill)}
                        className="shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-all"
                        style={activeCategory === pill
                            ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }
                            : { backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                        {pill}
                    </button>
                ))}
            </div>

            {/* Category grid */}
            {filteredCategories.length > 0 ? (
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-4"
                        style={{ color: 'var(--color-text-subtle)' }}>
                        {activeCategory === 'All' ? 'All Categories' : activeCategory} ({filteredCategories.length})
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 stagger">
                        {filteredCategories.map((cat, i) => {
                            const Icon = cat.icon;
                            return (
                                <Link key={cat.id} to={`/category/${cat.slug}`}
                                    className="group flex items-center gap-3 p-4 rounded-2xl hover-lift transition-all fade-in"
                                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', animationDelay: `${i * 0.035}s` }}>
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: `${cat.color}18` }}>
                                        <Icon style={{ width: 20, height: 20, color: cat.color }} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-primary)' }}>{cat.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>{cat.count}+ providers</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: 'var(--color-text-subtle)' }} />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl p-12 text-center"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <Search className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--color-text-subtle)' }} />
                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                        No results for "{search}"
                    </p>
                    <button onClick={() => { setSearch(''); setActiveCategory('All'); navigate('/services'); }}
                        className="text-xs underline transition-opacity hover:opacity-70"
                        style={{ color: 'var(--color-text-subtle)' }}>
                        Clear search
                    </button>
                </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link to="/nearby"
                    className="flex items-center gap-4 p-4 rounded-2xl group hover-lift"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--color-accent-light)' }}>
                        <MapPin className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>Near Me</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Providers available now</p>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto" style={{ color: 'var(--color-text-subtle)' }} />
                </Link>
                <Link to="/recommendations"
                    className="flex items-center gap-4 p-4 rounded-2xl group hover-lift"
                    style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                        <Star className="h-5 w-5" style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>Top Rated</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Best providers this week</p>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto" style={{ color: 'var(--color-text-subtle)' }} />
                </Link>
            </div>

            {/* Filter Drawer */}
            {filterOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setFilterOpen(false)} />
                    <div className="fixed top-0 right-0 bottom-0 w-full max-w-xs sm:max-w-sm z-[51] flex flex-col"
                        style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
                        <div className="flex items-center justify-between p-5"
                            style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>Filters</h3>
                            <button onClick={() => setFilterOpen(false)} className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                                style={{ color: 'var(--color-text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-high)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                            {/* Rating */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
                                    style={{ color: 'var(--color-text-subtle)' }}>Minimum Rating</p>
                                <div className="flex gap-2">
                                    {[0, 3, 4, 4.5].map(r => (
                                        <button key={r} onClick={() => setFilters(f => ({ ...f, rating: r }))}
                                            className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all"
                                            style={filters.rating === r
                                                ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }
                                                : { backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                                            {r === 0 ? 'Any' : `${r}★`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Distance */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
                                    style={{ color: 'var(--color-text-subtle)' }}>
                                    Max Distance: <span style={{ color: 'var(--color-primary)' }}>{filters.maxDistance} km</span>
                                </p>
                                <input type="range" min={1} max={50} value={filters.maxDistance}
                                    onChange={e => setFilters(f => ({ ...f, maxDistance: Number(e.target.value) }))}
                                    className="w-full" style={{ accentColor: 'var(--color-primary)' }} />
                            </div>

                            {/* Available now */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Available Now</p>
                                <button onClick={() => setFilters(f => ({ ...f, available: !f.available }))}
                                    className="relative h-6 w-11 rounded-full transition-colors"
                                    style={{ backgroundColor: filters.available ? 'var(--color-primary)' : 'var(--color-surface-highest)' }}>
                                    <span className="absolute top-1 h-4 w-4 rounded-full transition-all"
                                        style={{
                                            backgroundColor: filters.available ? 'var(--color-on-primary)' : 'var(--color-text-subtle)',
                                            left: filters.available ? '24px' : '4px'
                                        }} />
                                </button>
                            </div>
                        </div>
                        <div className="p-5" style={{ borderTop: '1px solid var(--color-border)' }}>
                            <button className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
                                onClick={() => setFilterOpen(false)}>
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
