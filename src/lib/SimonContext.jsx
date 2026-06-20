import { createContext, useContext, useEffect, useState } from 'react';

const SimonCtx = createContext(null);

export function SimonProvider({ children }) {
    const [insights, setInsights] = useState([]);
    const [zoneHealth, setZoneHealth] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/simon/home-insights')
                .then(r => r.ok ? r.json() : { insights: [] })
                .catch(() => ({ insights: [] })),
            fetch('/api/simon/zone-health')
                .then(r => r.ok ? r.json() : null)
                .catch(() => null),
        ]).then(([insightsData, healthData]) => {
            setInsights(insightsData.insights || []);
            setZoneHealth(healthData);
            setReady(true);
        });
    }, []);

    const analyzeBooking = async (params) => {
        try {
            const r = await fetch('/api/simon/booking-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            return r.ok ? r.json() : null;
        } catch { return null; }
    };

    return (
        <SimonCtx.Provider value={{ insights, zoneHealth, ready, analyzeBooking }}>
            {children}
        </SimonCtx.Provider>
    );
}

export function useSimon() {
    const ctx = useContext(SimonCtx);
    if (!ctx) throw new Error('useSimon must be used inside SimonProvider');
    return ctx;
}
