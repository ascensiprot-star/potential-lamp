
/**
 * usePlatform — React hook that bootstraps the ServiceFlow platform layer.
 * 
 * Call this once at app root. It:
 *   1. Starts the automation engine (loads rules, subscribes to events)
 *   2. Seeds default automation rules if none exist
 *   3. Returns platform state (notification count, etc.)
 * 
 * Usage:
 *   const { unreadNotifications } = usePlatform(user);
 */

import { useEffect, useState } from 'react';
import { automationEngine } from '@/lib/platform/automationEngine';

export function usePlatform(user) {
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [platformReady, setPlatformReady] = useState(false);

    useEffect(() => {
        if (!user?.email) return;

        const init = async () => {
            // Start the automation engine
            await automationEngine.start();
            await automationEngine.seedDefaultRules();
            setPlatformReady(true);
        };

        init().catch(e => console.warn('[Platform] Init warning:', e));
    }, [user?.email]);

    // Track unread notifications in real-time
    useEffect(() => {
        if (!user?.email) return;

        // Initial count
            .then(n => setUnreadNotifications(n.length))
            .catch(() => { });

        // Subscribe to new notifications
            if (event.type === 'create' && event.data.recipient_email === user.email && !event.data.is_read) {
                setUnreadNotifications(c => c + 1);
            }
            if (event.type === 'update' && event.data.recipient_email === user.email) {
                // Re-fetch count on any update
                    .then(n => setUnreadNotifications(n.length))
                    .catch(() => { });
            }
        });

        return () => unsub();
    }, [user?.email]);

    return { unreadNotifications, platformReady };
}