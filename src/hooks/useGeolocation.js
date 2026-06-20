import { useState, useEffect, useCallback } from 'react';

const HYDERABAD_PK = [25.396, 68.374];

export default function useGeolocation(fallback = HYDERABAD_PK) {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Function to send location to server
    const sendLocationToServer = useCallback(async (lat, lng) => {
        try {
            const response = await fetch('/api/location/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lat, lng }),
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('Location updated:', data);
                return data;
            }
        } catch (err) {
            console.error('Failed to send location to server:', err);
        }
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setLocation(fallback);
            setLoading(false);
            return;
        }

        const onSuccess = async (pos) => {
            const coords = [pos.coords.latitude, pos.coords.longitude];
            setLocation(coords);
            setLoading(false);
            setError(null);
            
            // Immediately send location to server
            await sendLocationToServer(pos.coords.latitude, pos.coords.longitude);
        };

        const onError = (err) => {
            if (err.code === 1) {
                setPermissionDenied(true);
                setError('Location permission denied. Please allow location access in your browser settings.');
            } else if (err.code === 2) {
                setError('Location unavailable. Trying without high accuracy...');
                navigator.geolocation.getCurrentPosition(onSuccess, (e2) => {
                    setError('Could not get your location. Showing default location.');
                    setLocation(fallback);
                }, { timeout: 10000, maximumAge: 60000 });
                return;
            } else {
                setError('Location request timed out. Trying again...');
                navigator.geolocation.getCurrentPosition(onSuccess, () => {
                    setError('Could not get your location. Showing default location.');
                    setLocation(fallback);
                }, { timeout: 15000, maximumAge: 60000 });
                return;
            }
            setLocation(fallback);
            setLoading(false);
        };

        // Get initial location
        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        });

        // Watch for location changes and update server periodically
        const watchId = navigator.geolocation.watchPosition(
            async (pos) => {
                const coords = [pos.coords.latitude, pos.coords.longitude];
                setLocation(coords);
                // Update server on location changes (debounced by browser)
                await sendLocationToServer(pos.coords.latitude, pos.coords.longitude);
            }, 
            () => { }, 
            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 10000,
            }
        );

        // Periodic location sync every 5 minutes while user is active
        const syncInterval = setInterval(async () => {
            if (location && location.length === 2) {
                await sendLocationToServer(location[0], location[1]);
            }
        }, 5 * 60 * 1000);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            clearInterval(syncInterval);
        };
    }, [location, sendLocationToServer]);

    return { location, error, loading, permissionDenied, sendLocationToServer };
}
