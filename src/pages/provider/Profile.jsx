import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { LogOut, Camera, MapPin, Navigation, CheckCircle, Image, X, Info } from 'lucide-react';

const ALL_ICONS = ['scissors', 'stethoscope', 'wrench', 'zap', 'book', 'truck', 'dumbbell', 'utensils', 'shopping', 'droplets', 'paintbrush', 'car'];

const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 };
const sectionTitle = { fontWeight: 700, fontSize: 14, color: 'var(--color-primary)', marginBottom: 4 };

const btnBase = {
    border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
    transition: 'opacity 0.15s', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
};

export default function ProviderProfile() {
    const [provider, setProvider] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [categories, setCategories] = useState([]);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const logoRef = useRef();
    const coverRef = useRef();

    useEffect(() => {
        setCreating(true);
        setForm({ user_email: '', business_name: '', description: '', phone: '', address: '', city: '', latitude: 40.7128, longitude: -74.006, category_slugs: [], chat_enabled: false });
        setCategories([]);
        setLoading(false);
    }, []);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const toggleCategory = (slug) => {
        const current = form.category_slugs || [];
        set('category_slugs', current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug]);
    };

    const uploadImage = async () => {
        toast.error('Image upload requires Supabase storage to be configured.');
    };

    const getMyLocation = () => {
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                set('latitude', latitude); set('longitude', longitude);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
                    const data = await res.json();
                    const city = data.address?.city || data.address?.town || data.address?.village || '';
                    const address = data.display_name?.split(',').slice(0, 3).join(',') || '';
                    if (city) set('city', city);
                    if (address) set('address', address);
                } catch (_) { }
                setGeoLoading(false);
                toast.success('Location updated!');
            },
            () => { setGeoLoading(false); toast.error('Could not get location'); },
            { enableHighAccuracy: true }
        );
    };

    const save = async () => {
        if (!form.business_name) { toast.error('Business name is required'); return; }
        setSaving(true);
        if (creating) {
            setProvider({ ...form });
            setCreating(false);
            toast.success('Profile created! Pending admin approval.');
        } else {
            setProvider({ ...provider, ...form });
            toast.success('Profile saved!');
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="space-y-4 max-w-2xl">
            <div className="skeleton-wave h-48 rounded-2xl" />
            <div className="skeleton-wave h-12 rounded-xl" />
            <div className="skeleton-wave h-12 rounded-xl" />
        </div>
    );

    return (
        <div className="max-w-2xl pb-8 space-y-4">
            <div>
                <h1 className="font-black text-xl tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>
                    {creating ? 'Set Up Your Business' : 'Business Profile'}
                </h1>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Fill in your details to start receiving bookings</p>
            </div>

            {creating && (
                <div className="flex items-start gap-3 rounded-xl p-3.5"
                    style={{ backgroundColor: 'var(--color-info-bg)', border: '1px solid rgba(147,197,253,0.2)' }}>
                    <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--color-info)' }} />
                    <p className="text-xs" style={{ color: 'var(--color-info)' }}>
                        <strong>Welcome!</strong> Once submitted, our team will review and approve your profile within 24 hours.
                    </p>
                </div>
            )}

            {/* Cover Photo + Logo */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="relative h-36 cursor-pointer group"
                    style={{ backgroundColor: 'var(--color-surface-high)' }}
                    onClick={() => coverRef.current.click()}>
                    {form.cover_image ? (
                        <img src={form.cover_image} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Image className="h-7 w-7" style={{ color: 'var(--color-text-subtle)' }} />
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Click to add cover photo</span>
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                        {uploadingCover
                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Camera className="h-6 w-6 text-white" />}
                    </div>
                    <input ref={coverRef} type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files[0] && uploadImage(e.target.files[0], 'cover_image', setUploadingCover)} />
                </div>

                <div className="px-5 pb-5 -mt-9 relative">
                    <div className="relative inline-block">
                        <div className="h-18 w-18 rounded-2xl overflow-hidden cursor-pointer group"
                            style={{ width: 72, height: 72, border: '3px solid var(--color-surface)', backgroundColor: 'var(--color-surface-high)', boxShadow: 'var(--shadow-md)' }}
                            onClick={() => logoRef.current.click()}>
                            {form.logo_url ? (
                                <img src={form.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="font-black text-2xl" style={{ color: 'var(--color-text-muted)' }}>
                                        {form.business_name?.[0]?.toUpperCase() || '?'}
                                    </span>
                                </div>
                            )}
                            <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                                {uploadingLogo
                                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : <Camera className="h-4 w-4 text-white" />}
                            </div>
                        </div>
                        {form.verified && (
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center"
                                style={{ border: '2px solid var(--color-surface)' }}>
                                <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                        )}
                        <input ref={logoRef} type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files[0] && uploadImage(e.target.files[0], 'logo_url', setUploadingLogo)} />
                    </div>
                </div>
            </div>

            {/* Business Info */}
            <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <h2 style={sectionTitle}>Business Information</h2>
                {[
                    { label: 'Business Name *', key: 'business_name', placeholder: "e.g. John's Plumbing" },
                    { label: 'Phone Number', key: 'phone', placeholder: '+1 (555) 000-0000', type: 'tel' },
                ].map(f => (
                    <div key={f.key}>
                        <label style={labelStyle}>{f.label}</label>
                        <Input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                            placeholder={f.placeholder} className="h-10 rounded-xl" />
                    </div>
                ))}
                <div>
                    <label style={labelStyle}>Description</label>
                    <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
                        placeholder="Tell customers what makes your business special..."
                        className="resize-none rounded-xl" rows={3} />
                </div>
            </div>

            {/* Location */}
            <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between">
                    <h2 style={sectionTitle}>Location</h2>
                    <button style={{ ...btnBase, backgroundColor: 'var(--color-surface-high)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-strong)', padding: '5px 10px', fontSize: 11 }}
                        onClick={getMyLocation} disabled={geoLoading}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <Navigation className={`h-3 w-3 ${geoLoading ? 'animate-spin' : ''}`} />
                        {geoLoading ? 'Getting…' : 'Use My Location'}
                    </button>
                </div>
                {[
                    { label: 'Address *', key: 'address', placeholder: '123 Main Street' },
                    { label: 'City', key: 'city', placeholder: 'New York' },
                ].map(f => (
                    <div key={f.key}>
                        <label style={labelStyle}>{f.label}</label>
                        <Input value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                            placeholder={f.placeholder} className="h-10 rounded-xl" />
                    </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                    {[{ label: 'Latitude', key: 'latitude' }, { label: 'Longitude', key: 'longitude' }].map(f => (
                        <div key={f.key}>
                            <label style={labelStyle} className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{f.label}
                            </label>
                            <Input type="number" step="any" value={form[f.key] || ''} onChange={e => set(f.key, Number(e.target.value))}
                                className="h-10 rounded-xl font-mono text-xs" />
                        </div>
                    ))}
                </div>
                <div>
                    <label style={labelStyle}>Service Radius (km)</label>
                    <Input type="number" value={form.service_radius_km || 10} onChange={e => set('service_radius_km', Number(e.target.value))}
                        className="h-10 rounded-xl" />
                </div>
            </div>

            {/* Service Categories */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <h2 style={sectionTitle}>Service Categories</h2>
                <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                    Select all categories that describe your services. This determines where you appear in searches.
                </p>
                <div className="flex flex-wrap gap-2">
                    {categories.map(c => {
                        const sel = (form.category_slugs || []).includes(c.slug);
                        return (
                            <button key={c.slug} onClick={() => toggleCategory(c.slug)}
                                style={{
                                    ...btnBase,
                                    padding: '6px 12px', fontSize: 12,
                                    backgroundColor: sel ? 'var(--color-primary)' : 'var(--color-surface-high)',
                                    color: sel ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                                    border: `1px solid ${sel ? 'transparent' : 'var(--color-border-strong)'}`,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                                {sel && <span>✓</span>}
                                {c.name}
                            </button>
                        );
                    })}
                </div>
                {(form.category_slugs || []).length === 0 && (
                    <div className="flex items-start gap-2 rounded-xl p-3 mt-3"
                        style={{ backgroundColor: 'var(--color-warning-bg)', border: '1px solid rgba(252,211,77,0.2)' }}>
                        <span className="text-xs" style={{ color: 'var(--color-warning)' }}>
                            ⚠️ Please select at least one category so customers can find you.
                        </span>
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <h2 style={{ ...sectionTitle, marginBottom: 16 }}>Settings</h2>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>Enable Chat</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Allow customers to message you directly</p>
                    </div>
                    <Switch checked={form.chat_enabled || false} onCheckedChange={v => set('chat_enabled', v)} />
                </div>
            </div>

            {/* Status banner */}
            {provider && provider.status !== 'approved' && (() => {
                const cfg = provider.status === 'pending'
                    ? { bg: 'var(--color-warning-bg)', border: 'rgba(252,211,77,0.2)', color: 'var(--color-warning)', text: '⏳ Your profile is pending admin review. Usually takes 24 hours.' }
                    : provider.status === 'rejected'
                    ? { bg: 'var(--color-error-bg)', border: 'rgba(252,165,165,0.2)', color: 'var(--color-error)', text: '❌ Your profile was rejected. Please update and save again.' }
                    : { bg: 'var(--color-surface-high)', border: 'var(--color-border)', color: 'var(--color-text-muted)', text: '⚠️ Your profile is suspended. Contact support.' };
                return (
                    <div className="rounded-xl p-3.5" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <p className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.text}</p>
                    </div>
                );
            })()}

            {/* Submit */}
            <button className="w-full h-11 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: (saving || !form.business_name) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: (saving || !form.business_name) ? 0.5 : 1 }}
                onClick={save} disabled={saving || !form.business_name}
                onMouseEnter={e => { if (!saving && form.business_name) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { if (!saving && form.business_name) e.currentTarget.style.opacity = '1'; }}>
                {saving ? 'Saving…' : creating ? '✓ Submit Profile' : '✓ Save Changes'}
            </button>
        </div>
    );
}
