import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SimonBookingHint from '@/components/simon/SimonBookingHint';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { CheckCircle, Clock, MapPin, ArrowLeft, ArrowRight, Calendar as CalendarIcon, Plus } from 'lucide-react';

const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

export default function BookService() {
    const { providerId, serviceId } = useParams();
    const navigate = useNavigate();
    const [provider, setProvider] = useState(null);
    const [service, setService] = useState(null);
    const [variants, setVariants] = useState([]);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [existingBookings, setExistingBookings] = useState([]);
    const [date, setDate] = useState(null);
    const [slot, setSlot] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);

    useEffect(() => {
        setProvider(null); setService(null);
        setVariants([]);
        setExistingBookings([]);
        setLoading(false);
    }, [providerId, serviceId]);

    const isSlotBooked = (dateStr, timeSlot) => existingBookings.some(b => b.date === dateStr && b.time_slot === timeSlot);
    const totalPrice = (service?.price || 0) + selectedAddons.reduce((s, a) => s + (a.price_modifier || 0), 0);
    const toggleAddon = (v) => setSelectedAddons(prev => prev.some(a => a.id === v.id) ? prev.filter(a => a.id !== v.id) : [...prev, v]);

    const handleBook = async () => {
        if (!date || !slot) { toast.error('Please select a date and time'); return; }
        setSubmitting(true);
        setSuccess(true);
        setSubmitting(false);
    };

    if (loading) return (
        <div className="max-w-lg mx-auto space-y-4 pb-24">
            <div className="skeleton-wave h-24 rounded-2xl" />
            <div className="skeleton-wave h-72 rounded-2xl" />
        </div>
    );

    if (success) return (
        <div className="max-w-md mx-auto text-center py-20 pb-24">
            <div className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                <CheckCircle className="h-10 w-10" style={{ color: 'var(--color-on-primary)' }} />
            </div>
            <h1 className="font-black text-2xl mb-3" style={{ color: 'var(--color-primary)' }}>Booking Confirmed!</h1>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Your booking for <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{service?.name}</span> has been submitted.
                The provider will confirm shortly.
            </p>
            <div className="glass rounded-2xl p-4 text-left mt-6 mb-8 space-y-2 shadow-premium">
                {[
                    { label: 'Service', value: service?.name },
                    { label: 'Provider', value: provider?.business_name },
                    { label: 'Scheduled', value: date ? `${date.toLocaleDateString()} at ${slot}` : '' },
                ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                        <span style={{ color: 'var(--color-text-subtle)' }}>{label}</span>
                        <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{value}</span>
                    </div>
                ))}
                <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>Total</span>
                    <span className="font-black" style={{ color: 'var(--color-primary)' }}>${service?.price}</span>
                </div>
            </div>
            <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/dashboard')} className="rounded-xl">View My Bookings</Button>
                <Button variant="outline" onClick={() => navigate('/')} className="rounded-xl">Back to Home</Button>
            </div>
        </div>
    );

    const stepStyle = (n) => ({
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        height: 36, borderRadius: 12, fontSize: 12, fontWeight: 600,
        border: 'none', cursor: n <= step ? 'pointer' : 'default',
        transition: 'all 0.2s',
        backgroundColor: step === n ? 'var(--color-primary)' : 'transparent',
        color: step === n ? 'var(--color-on-primary)' : step > n ? 'var(--color-text-muted)' : 'var(--color-text-subtle)',
        fontFamily: 'inherit',
    });

    return (
        <div className="max-w-lg mx-auto pb-24 md:pb-8">
            <Link to={`/providers/${providerId}`}
                className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
                style={{ color: 'var(--color-text-subtle)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-subtle)')}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Provider
            </Link>

            {/* Service summary card */}
            <div className="card-premium p-5 mb-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-subtle)' }}>Booking</p>
                        <h1 className="font-black text-xl" style={{ color: 'var(--color-primary)' }}>{service?.name || 'Service'}</h1>
                        <p className="text-xs mt-1 flex items-center gap-3" style={{ color: 'var(--color-text-muted)' }}>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{provider?.business_name || 'Provider'}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(service?.duration_minutes || 60) + selectedAddons.reduce((s, a) => s + (a.duration_modifier || 0), 0)} min</span>
                        </p>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-2xl font-black" style={{ color: 'var(--color-primary)' }}>${totalPrice}</span>
                        {selectedAddons.length > 0 && <p className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>incl. {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''}</p>}
                    </div>
                </div>
            </div>

            {/* Step indicator */}
            <div className="glass rounded-2xl p-1.5 flex gap-1 mb-6 shadow-premium">
                {[{ n: 1, label: 'Date' }, { n: 2, label: 'Time' }, { n: 3, label: 'Confirm' }].map(s => (
                    <button key={s.n} onClick={() => s.n < step && setStep(s.n)} style={stepStyle(s.n)}>
                        <span className="h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-bold"
                            style={{
                                backgroundColor: step === s.n ? 'rgba(0,0,0,0.15)' : step > s.n ? 'var(--color-surface-high)' : 'var(--color-surface-highest)',
                                color: step === s.n ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            }}>{s.n}</span>
                        {s.label}
                    </button>
                ))}
            </div>

            {step === 1 && (
                <div className="card-premium p-6">
                    <h2 className="font-bold text-base mb-4 flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" /> Select Date
                    </h2>
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={d => d < new Date()} className="mx-auto" />
                    <Button className="w-full mt-4 h-11 rounded-xl" disabled={!date} onClick={() => setStep(2)}>
                        Continue <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="card-premium p-6">
                    <h2 className="font-bold text-base mb-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Select Time
                    </h2>
                    <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>{date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <div className="grid grid-cols-4 gap-2">
                        {TIME_SLOTS.map(t => {
                            const booked = date && isSlotBooked(date.toISOString().split('T')[0], t);
                            const selected = slot === t;
                            return (
                                <button key={t} onClick={() => !booked && setSlot(t)} disabled={booked}
                                    className="h-10 rounded-xl text-xs font-semibold transition-all"
                                    style={{
                                        backgroundColor: booked ? 'var(--color-surface-high)' : selected ? 'var(--color-primary)' : 'var(--color-surface-high)',
                                        color: booked ? 'var(--color-text-subtle)' : selected ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                                        border: `1px solid ${selected ? 'transparent' : 'var(--color-border)'}`,
                                        cursor: booked ? 'not-allowed' : 'pointer',
                                        opacity: booked ? 0.4 : 1,
                                        fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={e => { if (!booked && !selected) e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
                                    onMouseLeave={e => { if (!booked && !selected) e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
                                    {booked ? '—' : t}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-subtle)' }}>Grayed slots are already booked</p>
                    {slot && date && (
                        <SimonBookingHint serviceType={service?.category_slug || service?.name || 'service'}
                            date={date.toISOString().split('T')[0]} timeSlot={slot} price={totalPrice} />
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(1)}>Back</Button>
                        <Button className="flex-1 rounded-xl" disabled={!slot} onClick={() => setStep(3)}>
                            Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="card-premium p-6 space-y-5">
                    <h2 className="font-bold text-base">Confirm Booking</h2>
                    <div className="rounded-xl p-4 space-y-2.5" style={{ backgroundColor: 'var(--color-surface-high)', border: '1px solid var(--color-border)' }}>
                        {[
                            { label: 'Service', value: service?.name },
                            { label: 'Provider', value: provider?.business_name },
                            { label: 'Date', value: date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) },
                            { label: 'Time', value: slot },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-sm">
                                <span style={{ color: 'var(--color-text-subtle)' }}>{label}</span>
                                <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{value}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                            <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>Total</span>
                            <span className="font-black" style={{ color: 'var(--color-primary)' }}>${totalPrice}</span>
                        </div>
                    </div>
                    {variants.filter(v => v.type === 'addon').length > 0 && (
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-subtle)' }}>Add-ons</label>
                            <div className="space-y-2">
                                {variants.filter(v => v.type === 'addon').map(v => {
                                    const sel = selectedAddons.some(a => a.id === v.id);
                                    return (
                                        <button key={v.id} onClick={() => toggleAddon(v)} className="w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all text-left"
                                            style={{ backgroundColor: sel ? 'var(--color-surface-high)' : 'transparent', border: `1px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}`, fontFamily: 'inherit', cursor: 'pointer' }}>
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--color-primary)' }}>{v.name}</p>
                                                {v.description && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{v.description}</p>}
                                                {v.duration_modifier > 0 && <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>+{v.duration_modifier} min</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {v.price_modifier > 0 && <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>+${v.price_modifier}</span>}
                                                {sel && <CheckCircle className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--color-text-subtle)' }}>Notes (optional)</label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Any special requests or instructions..."
                            className="resize-none rounded-xl text-sm" rows={3} />
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(2)}>Back</Button>
                        <button className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.7 : 1 }}
                            onClick={handleBook} disabled={submitting}
                            onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = '0.88'; }}
                            onMouseLeave={e => { if (!submitting) e.currentTarget.style.opacity = '1'; }}>
                            {submitting ? 'Booking…' : `Confirm $${totalPrice}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
