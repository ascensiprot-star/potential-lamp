import { useState } from 'react';
import { format, startOfWeek, addDays, addWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_STYLES = {
    pending:     'bg-amber-100 border-amber-300 text-amber-900',
    confirmed:   'bg-blue-100 border-blue-300 text-blue-900',
    in_progress: 'bg-violet-100 border-violet-300 text-violet-900',
    completed:   'bg-emerald-100 border-emerald-300 text-emerald-900',
    cancelled:   'bg-zinc-100 border-zinc-200 text-zinc-400 opacity-60',
    no_show:     'bg-red-100 border-red-300 text-red-800',
};

function parseHour(slot) {
    if (!slot) return 9;
    const [h, m] = slot.split(':').map(Number);
    return h + (m || 0) / 60;
}

const START_HOUR = 8;
const HOUR_HEIGHT = 56;
const VISIBLE_HOURS = 13;

export default function WeekCalendar({ bookings = [], onBookingClick }) {
    const [weekOffset, setWeekOffset] = useState(0);
    const today = new Date();
    const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: VISIBLE_HOURS }, (_, i) => START_HOUR + i);

    const getBookingsForDay = (day) => {
        const d = format(day, 'yyyy-MM-dd');
        return bookings.filter(b => b.date === d);
    };

    const fmtHour = (h) => h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`;

    return (
        <div className="rounded-2xl overflow-hidden shadow-premium"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {/* Navigation header */}
            <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-high)' }}>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setWeekOffset(o => o - 1)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-highest)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold px-2" style={{ color: 'var(--color-primary)' }}>
                        {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                    </span>
                    <button onClick={() => setWeekOffset(o => o + 1)}
                        className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-highest)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                {weekOffset !== 0 && (
                    <button onClick={() => setWeekOffset(0)}
                        className="text-xs font-semibold px-3 h-7 rounded-lg transition-colors"
                        style={{ color: 'var(--color-text-muted)', fontFamily: 'inherit', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-highest)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
                        Today
                    </button>
                )}
            </div>

            {/* Day headers */}
            <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--color-border)' }}>
                <div className="h-11" />
                {days.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    return (
                        <div key={i} className="h-11 flex flex-col items-center justify-center"
                            style={{
                                borderLeft: '1px solid var(--color-border)',
                                backgroundColor: isToday ? 'var(--color-primary)' : 'transparent',
                            }}>
                            <span className="text-[9px] font-bold uppercase tracking-widest"
                                style={{ color: isToday ? 'var(--color-on-primary)' : 'var(--color-text-subtle)' }}>
                                {format(day, 'EEE')}
                            </span>
                            <span className="text-sm font-black"
                                style={{ color: isToday ? 'var(--color-on-primary)' : 'var(--color-primary)' }}>
                                {format(day, 'd')}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
                <div className="grid relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                    {/* Hour labels */}
                    <div>
                        {hours.map(h => (
                            <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-end pr-2.5 pt-1.5">
                                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-subtle)' }}>{fmtHour(h)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {days.map((day, di) => {
                        const dayBookings = getBookingsForDay(day);
                        return (
                            <div key={di} className="relative" style={{ borderLeft: '1px solid var(--color-border)' }}>
                                {hours.map(h => (
                                    <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid var(--color-border-light, var(--color-border))' }} />
                                ))}
                                {dayBookings.map(b => {
                                    const startH = parseHour(b.time_slot);
                                    if (startH < START_HOUR || startH >= START_HOUR + VISIBLE_HOURS) return null;
                                    const dur = (b.duration_minutes || 30) / 60;
                                    const top = (startH - START_HOUR) * HOUR_HEIGHT;
                                    const height = Math.max(dur * HOUR_HEIGHT - 4, 24);
                                    const style = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                                    return (
                                        <button
                                            key={b.id}
                                            onClick={() => onBookingClick?.(b)}
                                            style={{ top: top + 2, height, left: 2, right: 2 }}
                                            className={`absolute rounded-lg border text-left px-1.5 py-1 text-[10px] font-semibold overflow-hidden hover:opacity-80 transition-opacity cursor-pointer ${style}`}
                                        >
                                            <div className="truncate font-bold">{b.time_slot}</div>
                                            <div className="truncate opacity-80">{b.service_name}</div>
                                            <div className="truncate opacity-60">{b.customer_email?.split('@')[0]}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="px-5 py-3 flex items-center gap-3 flex-wrap"
                style={{ borderTop: '1px solid var(--color-border)' }}>
                {Object.entries(STATUS_STYLES).map(([status, cls]) => (
                    <div key={status} className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded border ${cls}`} />
                        <span className="text-[10px] capitalize" style={{ color: 'var(--color-text-subtle)' }}>{status.replace('_', ' ')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
