import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { X, Plus, Clock, CalendarOff, Settings2 } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DEFAULT_HOURS = DAYS.reduce((a, d) => ({
    ...a, [d]: { open: '09:00', close: '18:00', closed: d === 'sunday' }
}), {});

export default function Availability() {
    const [provider, setProvider] = useState(null);
    const [hours, setHours] = useState(DEFAULT_HOURS);
    const [bufferTime, setBufferTime] = useState(0);
    const [slotInterval, setSlotInterval] = useState(30);
    const [advanceDays, setAdvanceDays] = useState(30);
    const [autoConfirm, setAutoConfirm] = useState(false);
    const [cancellationHours, setCancellationHours] = useState(24);
    const [blackouts, setBlackouts] = useState([]);
    const [blackoutDate, setBlackoutDate] = useState(null);
    const [blackoutReason, setBlackoutReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('hours');

    useEffect(() => {
        setLoading(false);
    }, []);

    const update = (day, field, val) =>
        setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: val } }));

    const saveHours = async () => {
        setSaving(true);
        toast.success('Working hours saved');
        setSaving(false);
    };

    const saveSettings = async () => {
        setSaving(true);
        toast.success('Schedule settings saved');
        setSaving(false);
    };

    const addBlackout = async () => {
        if (!blackoutDate) return;
        const dateStr = format(blackoutDate, 'yyyy-MM-dd');
        if (blackouts.find(b => b.date === dateStr)) { toast.error('Date already blocked'); return; }
        const rec = {
            id: Date.now(),
            provider_id: provider?.id,
            type: 'blackout',
            date: dateStr,
            reason: blackoutReason || 'Unavailable',
        };
        setBlackouts(prev => [...prev, rec]);
        setBlackoutDate(null);
        setBlackoutReason('');
        toast.success('Date blocked');
    };

    const removeBlackout = async (id) => {
        setBlackouts(prev => prev.filter(b => b.id !== id));
        toast.success('Date unblocked');
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
        </div>
    );

    if (!provider) return (
        <div className="max-w-lg">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
                ⚠️ Set up your provider profile before managing availability.
            </div>
        </div>
    );

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="font-inter font-black text-2xl tracking-tight">Availability</h1>
                <p className="text-zinc-400 text-sm mt-0.5">Manage working hours, schedule rules, and blocked dates</p>
            </div>

            <div className="glass rounded-2xl p-1.5 flex gap-1 mb-6 shadow-premium">
                {[['hours', 'Working Hours', Clock], ['settings', 'Schedule Rules', Settings2], ['blackouts', 'Blackout Dates', CalendarOff]].map(([key, label, Icon]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                        style={{
                            backgroundColor: tab === key ? 'var(--color-primary)' : 'transparent',
                            color: tab === key ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                        <Icon className="h-3.5 w-3.5" />{label}
                    </button>
                ))}
            </div>

            {tab === 'hours' && (
                <div className="space-y-2.5">
                    {DAYS.map(d => (
                        <div key={d} className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3 shadow-premium">
                            <div className="w-28 shrink-0">
                                <span className="text-sm font-semibold capitalize text-zinc-700">{d}</span>
                            </div>
                            <Switch checked={!hours[d]?.closed} onCheckedChange={v => update(d, 'closed', !v)} />
                            {!hours[d]?.closed ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input type="time" className="w-28 h-8 text-xs rounded-xl border-zinc-200"
                                        value={hours[d]?.open || '09:00'} onChange={e => update(d, 'open', e.target.value)} />
                                    <span className="text-xs text-zinc-400 font-medium">–</span>
                                    <Input type="time" className="w-28 h-8 text-xs rounded-xl border-zinc-200"
                                        value={hours[d]?.close || '18:00'} onChange={e => update(d, 'close', e.target.value)} />
                                </div>
                            ) : (
                                <span className="text-xs text-zinc-400 font-medium">Closed</span>
                            )}
                        </div>
                    ))}
                    <Button className="w-full mt-2 h-11 rounded-xl" onClick={saveHours} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Working Hours'}
                    </Button>
                </div>
            )}

            {tab === 'settings' && (
                <div className="space-y-3">
                    <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-premium space-y-5">
                        <h3 className="font-semibold text-sm text-zinc-900">Appointment Slot Settings</h3>
                        {[
                            { label: 'Buffer Time', sub: 'Extra time between appointments', value: bufferTime, setter: setBufferTime, options: [0, 5, 10, 15, 30].map(v => ({ value: v, label: v === 0 ? 'None' : `${v} min` })) },
                            { label: 'Slot Interval', sub: 'Time between bookable slots', value: slotInterval, setter: setSlotInterval, options: [15, 30, 45, 60].map(v => ({ value: v, label: `${v} min` })) },
                            { label: 'Advance Booking', sub: 'How far ahead customers can book', value: advanceDays, setter: setAdvanceDays, options: [7, 14, 30, 60, 90].map(v => ({ value: v, label: `${v} days` })) },
                            { label: 'Cancellation Window', sub: 'Minimum hours notice for cancellation', value: cancellationHours, setter: setCancellationHours, options: [1, 2, 6, 12, 24, 48].map(v => ({ value: v, label: `${v}h` })) },
                        ].map(({ label, sub, value, setter, options }) => (
                            <div key={label} className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-zinc-800">{label}</p>
                                    <p className="text-xs text-zinc-400">{sub}</p>
                                </div>
                                <Select value={String(value)} onValueChange={v => setter(Number(v))}>
                                    <SelectTrigger className="w-28 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {options.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-premium">
                        <h3 className="font-semibold text-sm mb-4">Booking Behavior</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-zinc-800">Auto-Confirm Bookings</p>
                                <p className="text-xs text-zinc-400">Skip manual approval — instantly confirm new bookings</p>
                            </div>
                            <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
                        </div>
                    </div>
                    <Button className="w-full h-11 rounded-xl" onClick={saveSettings} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Schedule Rules'}
                    </Button>
                </div>
            )}

            {tab === 'blackouts' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-premium">
                        <h3 className="font-semibold text-sm mb-4">Block a Date</h3>
                        <Calendar
                            mode="single"
                            selected={blackoutDate}
                            onSelect={setBlackoutDate}
                            disabled={d => d < new Date()}
                            className="mx-auto mb-4"
                            modifiers={{ blocked: blackouts.map(b => new Date(b.date + 'T12:00:00')) }}
                            modifiersClassNames={{ blocked: 'bg-red-50 text-red-600' }}
                        />
                        <Input
                            placeholder="Reason (e.g. Holiday, Personal Day)"
                            value={blackoutReason}
                            onChange={e => setBlackoutReason(e.target.value)}
                            className="rounded-xl mb-3 border-zinc-200"
                        />
                        <Button className="w-full rounded-xl h-10" onClick={addBlackout} disabled={!blackoutDate}>
                            <Plus className="h-4 w-4 mr-2" /> Block This Date
                        </Button>
                    </div>

                    {blackouts.length > 0 && (
                        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-premium">
                            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                                <h3 className="font-semibold text-sm">Blocked Dates</h3>
                                <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{blackouts.length}</span>
                            </div>
                            <div className="divide-y divide-zinc-50">
                                {[...blackouts].sort((a, b) => a.date > b.date ? 1 : -1).map(b => (
                                    <div key={b.id} className="flex items-center justify-between px-5 py-3">
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {format(new Date(b.date + 'T12:00:00'), 'EEEE, MMM d yyyy')}
                                            </p>
                                            <p className="text-xs text-zinc-400">{b.reason || 'Unavailable'}</p>
                                        </div>
                                        <button onClick={() => removeBlackout(b.id)}
                                            className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}