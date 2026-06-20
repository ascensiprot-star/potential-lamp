import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, MapPin, List, Map as MapIcon, SlidersHorizontal, Star, ArrowLeft, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProviderCard from '../components/ProviderCard';
import MapView from '../components/MapView';
import useGeolocation from '../hooks/useGeolocation';
import { supabase } from '@/api/supabaseClient';

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SkeletonRow = () => (
    <div className="card-premium p-0 overflow-hidden flex gap-0">
        <div className="skeleton-wave w-24 h-24 shrink-0 rounded-l-2xl" />
        <div className="p-4 flex-1 space-y-2">
            <div className="skeleton-wave h-4 rounded w-1/2" />
            <div className="skeleton-wave h-3 rounded w-1/3" />
            <div className="skeleton-wave h-3 rounded w-2/3" />
        </div>
    </div>
);

export default function CategoryProviders() {
    const { slug } = useParams();
    const [category, setCategory] = useState(null);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('distance');
    const [view, setView] = useState('both');
    const { location: userLoc, loading: locLoading, permissionDenied } = useGeolocation();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const [{ data: cats }, { data: allProviders }] = await Promise.all([
                supabase.from('service_categories').select('*').eq('slug', slug).limit(1),
                supabase.from('providers').select('*').eq('status', 'approved'),
            ]);
            setCategory(cats?.[0] || null);
            const filtered = (allProviders || []).filter(p =>
                p.category_slugs?.includes(slug)
            );
            setProviders(filtered);
            setLoading(false);
        };
        load();
    }, [slug]);

    const withDistance = providers
        .map(p => ({
            ...p,
            distance: userLoc && p.latitude ? getDistance(userLoc[0], userLoc[1], p.latitude, p.longitude) : 9999,
        }))
        .filter(p => !search || p.business_name?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()));

    const sorted = [...withDistance].sort((a, b) => {
        if (sortBy === 'distance') return a.distance - b.distance;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'reviews') return (b.review_count || 0) - (a.review_count || 0);
        return 0;
    });

    return (
        <div className="pb-24 md:pb-8">
            {/* Header */}
            <div className="mb-8">
                <Link to="/services" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-900 transition-colors mb-4">
                    <ArrowLeft className="h-3.5 w-3.5" /> All Services
                </Link>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="font-inter font-black text-3xl tracking-tight">
                            {loading ? <span className="skeleton-wave inline-block w-48 h-8 rounded" /> : (category?.name || slug)}
                        </h1>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-zinc-400 text-sm">
                                {loading ? '...' : `${sorted.length} provider${sorted.length !== 1 ? 's' : ''} found`}
                            </span>
                            {!locLoading && !permissionDenied && userLoc && (
                                <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                                    <Navigation className="h-3 w-3" /> Distance sorted by your location
                                </span>
                            )}
                            {permissionDenied && (
                                <span className="text-xs text-orange-500">Enable location for distance sorting</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass rounded-2xl p-3 mb-6 flex items-center gap-2 flex-wrap shadow-premium">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search providers..."
                        className="w-full h-9 pl-9 pr-3 bg-transparent text-sm placeholder:text-zinc-400 focus:outline-none text-zinc-900"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40 h-9 text-xs border-0 bg-white/60 rounded-xl">
                        <SlidersHorizontal className="h-3 w-3 mr-1 text-zinc-400" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="distance">Nearest First</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                        <SelectItem value="reviews">Most Reviews</SelectItem>
                    </SelectContent>
                </Select>
                <div className="hidden md:flex border border-zinc-200 rounded-xl overflow-hidden bg-white">
                    {['both', 'map', 'list'].map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-3 h-9 text-xs font-medium transition-colors ${view === v ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        >
                            {v === 'map' ? <MapIcon className="h-3.5 w-3.5" /> : v === 'list' ? <List className="h-3.5 w-3.5" /> : 'Both'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
            ) : sorted.length === 0 ? (
                <div className="card-premium p-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                        <Search className="h-6 w-6 text-zinc-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No providers found</h3>
                    <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                        {search ? `No providers matching "${search}" in this category.` : 'No providers have registered in this category yet.'}
                    </p>
                    {search && (
                        <button onClick={() => setSearch('')} className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 underline">
                            Clear search
                        </button>
                    )}
                </div>
            ) : (
                <div className={`grid gap-5 ${view === 'both' ? 'lg:grid-cols-2' : ''}`}>
                    {(view === 'both' || view === 'map') && (
                        <div className="rounded-2xl overflow-hidden shadow-premium border border-zinc-100">
                            <MapView providers={sorted} userLocation={userLoc} className="h-[440px] lg:h-[600px]" />
                        </div>
                    )}
                    {(view === 'both' || view === 'list') && (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {sorted.map(p => (
                                <ProviderCard key={p.id} provider={p} distance={p.distance < 9999 ? p.distance : null} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}