import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LogOut, Camera, User, Mail, Phone, MapPin, Edit3 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const labelStyle = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--color-text-subtle)' };
const fieldStyle = { height: 44, padding: '0 12px', display: 'flex', alignItems: 'center', borderRadius: 12, backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-muted)' };

export default function CustomerProfile() {
    const { user: authUser, logout } = useAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const fileRef = useRef();

    useEffect(() => {
        if (!authUser) {
            setLoading(false);
            return;
        }
        // Initialize from auth context
        setUser(authUser);
        setForm({
            full_name: authUser.full_name || '',
            email: authUser.email || '',
            phone: authUser.phone || '',
            city: authUser.city || '',
            avatar_url: authUser.avatar_url || '',
        });
        setLoading(false);
    }, [authUser]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    full_name: form.full_name || null,
                    phone: form.phone || null,
                    city: form.city || null,
                    avatar_url: form.avatar_url || null,
                }),
            });
            if (!res.ok) throw new Error('Failed to save');
            const data = await res.json();
            setUser(data.user);
            setForm({
                full_name: data.user.full_name || '',
                email: data.user.email || '',
                phone: data.user.phone || '',
                city: data.user.city || '',
                avatar_url: data.user.avatar_url || '',
            });
            toast.success('Profile updated!');
            setEditMode(false);
        } catch (err) {
            toast.error('Failed to save profile');
        }
        setSaving(false);
    };

    const uploadAvatar = async () => {
        setUploadingAvatar(true);
        toast.error('Image upload requires Supabase storage to be configured.');
        setUploadingAvatar(false);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full animate-spin" style={{ border: '2px solid var(--color-border-strong)', borderTopColor: 'var(--color-primary)' }} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-surface-high)' }}>
                    <User className="h-8 w-8" style={{ color: 'var(--color-text-subtle)' }} />
                </div>
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-primary)' }}>Sign in to view your profile</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Connect your account to manage your profile.</p>
                <Button onClick={() => navigate('/login')}>Sign In</Button>
            </div>
        );
    }

    // Helper to display value or placeholder
    const displayValue = (val, placeholder = 'Not set') => val || placeholder;

    return (
        <div className="max-w-md mx-auto pb-24 md:pb-8">
            {/* Profile header card */}
            <div className="card-premium p-6 mb-4 text-center">
                <div className="relative inline-block mb-4">
                    <div className="h-24 w-24 rounded-full overflow-hidden cursor-pointer mx-auto group relative"
                        style={{ border: '3px solid var(--color-surface)', backgroundColor: 'var(--color-surface-high)', boxShadow: 'var(--shadow-float)' }}
                        onClick={() => fileRef.current.click()}>
                        {form.avatar_url ? (
                            <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User className="h-10 w-10" style={{ color: 'var(--color-text-subtle)' }} />
                            </div>
                        )}
                        <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                            {uploadingAvatar
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <Camera className="h-5 w-5 text-white" />}
                        </div>
                    </div>
                    <button onClick={() => fileRef.current.click()}
                        className="absolute bottom-0 right-0 h-7 w-7 rounded-full flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: 'var(--color-primary)', border: '2px solid var(--color-surface)', color: 'var(--color-on-primary)' }}>
                        <Camera className="h-3.5 w-3.5" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadAvatar(e.target.files[0])} />
                </div>

                <h1 className="font-black text-xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.03em' }}>{displayValue(user.full_name, 'Your Name')}</h1>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{user.email || 'No email'}</p>

                {!editMode && (
                    <Button variant="outline" size="sm" className="mt-3 rounded-xl gap-1.5" onClick={() => setEditMode(true)}>
                        <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                    </Button>
                )}
            </div>

            {/* Contact info */}
            <div className="card-premium p-6 mb-4 space-y-4">
                <h2 className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>Contact Information</h2>

                {[
                    { icon: User, label: 'Full Name', value: user.full_name, note: 'Name is managed by your account' },
                    { icon: Mail, label: 'Email', value: user.email },
                ].map(({ icon: Icon, label, value, note }) => (
                    <div key={label}>
                        <label style={labelStyle}><Icon className="h-3.5 w-3.5" />{label}</label>
                        <div style={fieldStyle}>{displayValue(value)}</div>
                        {note && <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>{note}</p>}
                    </div>
                ))}

                {/* Phone — editable */}
                <div>
                    <label style={labelStyle}><Phone className="h-3.5 w-3.5" />Phone Number</label>
                    {editMode ? (
                        <Input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="+1 (555) 000-0000" className="h-11 rounded-xl" />
                    ) : (
                        <div style={fieldStyle}>
                            {form.phone ? form.phone : <span style={{ color: 'var(--color-text-subtle)' }}>Not set — tap Edit Profile</span>}
                        </div>
                    )}
                </div>

                {/* City — editable */}
                <div>
                    <label style={labelStyle}><MapPin className="h-3.5 w-3.5" />City</label>
                    {editMode ? (
                        <Input value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                            placeholder="Your city" className="h-11 rounded-xl" />
                    ) : (
                        <div style={fieldStyle}>
                            {form.city ? form.city : <span style={{ color: 'var(--color-text-subtle)' }}>Not set — tap Edit Profile</span>}
                        </div>
                    )}
                </div>

                {editMode && (
                    <div className="flex gap-3 pt-1">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditMode(false)}>Cancel</Button>
                        <button className="flex-1 h-11 rounded-xl text-sm font-semibold"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
                            onClick={save} disabled={saving}
                            onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = '0.88'; }}
                            onMouseLeave={e => { if (!saving) e.currentTarget.style.opacity = '1'; }}>
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            <button onClick={handleLogout} className="w-full mt-4 rounded-xl h-10 text-sm font-medium flex items-center justify-center gap-2"
                style={{ color: 'var(--color-error)', backgroundColor: 'var(--color-error-bg)', border: '1px solid rgba(252,165,165,0.2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <LogOut className="h-4 w-4" /> Sign Out
            </button>
        </div>
    );
}
