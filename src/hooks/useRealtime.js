import { useEffect, useRef, useCallback, useState } from 'react';

const BASE_INTERVAL = 5000;
const STATS_INTERVAL = 10000;

async function fetchJson(url) {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
}

export function useRealtimeTable(table, onChange, filter = null) {
    const [connected, setConnected] = useState(false);
    const intervalRef = useRef(null);
    const lastSeenRef = useRef(null);

    useEffect(() => {
        let active = true;

        const poll = async () => {
            try {
                const params = new URLSearchParams({ table, ...(filter ? { filter } : {}), since: lastSeenRef.current || '' });
                const data = await fetchJson(`/api/realtime/poll?${params}`);
                if (!active) return;
                setConnected(true);
                if (data.rows?.length > 0) {
                    lastSeenRef.current = data.latest_at;
                    data.rows.forEach(row => onChange({ eventType: row._event || 'UPDATE', new: row, old: {} }));
                }
            } catch (_) {
                if (active) setConnected(false);
            }
        };

        poll();
        intervalRef.current = setInterval(poll, BASE_INTERVAL);
        return () => {
            active = false;
            clearInterval(intervalRef.current);
        };
    }, [table, filter]);

    return { connected, error: null };
}

export function useRealtimeList(table, initialData = [], idField = 'id') {
    const [data, setData] = useState(initialData);
    const [connected, setConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const intervalRef = useRef(null);

    const endpoint = `/api/realtime/list/${table}`;

    useEffect(() => {
        let active = true;

        const poll = async () => {
            try {
                const json = await fetchJson(endpoint);
                if (!active) return;
                setConnected(true);
                if (json.rows) {
                    setData(json.rows);
                    setLastUpdated(new Date().toISOString());
                }
            } catch (_) {
                if (active) setConnected(false);
            }
        };

        poll();
        intervalRef.current = setInterval(poll, BASE_INTERVAL);
        return () => {
            active = false;
            clearInterval(intervalRef.current);
        };
    }, [endpoint]);

    return { data, connected, error: null, lastUpdated };
}

export function useRealtimeSingle(table, id, initialData = null) {
    const [data, setData] = useState(initialData);
    const [connected, setConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!id) return;
        let active = true;

        const poll = async () => {
            try {
                const json = await fetchJson(`/api/realtime/single/${table}/${id}`);
                if (!active) return;
                setConnected(true);
                if (json.row) {
                    setData(json.row);
                    setLastUpdated(new Date().toISOString());
                }
            } catch (_) {
                if (active) setConnected(false);
            }
        };

        poll();
        intervalRef.current = setInterval(poll, BASE_INTERVAL);
        return () => {
            active = false;
            clearInterval(intervalRef.current);
        };
    }, [table, id]);

    return { data, connected, error: null, lastUpdated };
}

export function useRealtimePlatformStats() {
    const [stats, setStats] = useState({
        bookings: 0, providers: 0, pendingBookings: 0, activeBookings: 0, recentActivity: [],
    });
    const [connected, setConnected] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        let active = true;

        const poll = async () => {
            try {
                const json = await fetchJson('/api/realtime/platform-stats');
                if (!active) return;
                setConnected(true);
                if (json.stats) setStats(json.stats);
            } catch (_) {
                if (active) setConnected(false);
            }
        };

        poll();
        intervalRef.current = setInterval(poll, STATS_INTERVAL);
        return () => {
            active = false;
            clearInterval(intervalRef.current);
        };
    }, []);

    return { stats, connected };
}

export function getRealtimeLabel(connected) {
    return connected
        ? { text: 'Live', color: 'var(--color-success)' }
        : { text: 'Offline', color: 'var(--color-text-subtle)' };
}
