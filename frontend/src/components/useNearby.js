import { useState, useCallback } from 'react';

export function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function applyNearbyFilter(venues, userLocation, nearbyEnabled, sortBy, addressKeyword = '') {
    const withDistance = venues.map((v) => {
        const vLat = v.latitude != null ? parseFloat(v.latitude) : null;
        const vLng = v.longitude != null ? parseFloat(v.longitude) : null;
        const distance =
            userLocation && vLat != null && !isNaN(vLat) && vLng != null && !isNaN(vLng)
                ? haversineDistance(userLocation.lat, userLocation.lng, vLat, vLng)
                : null;
        return { ...v, distance };
    });

    const nearbyFiltered = nearbyEnabled
        ? withDistance.filter(v => v.distance !== null && v.distance <= 10)
        : withDistance;

    const addressFiltered = nearbyFiltered.filter(v => {
        if (!addressKeyword) return true;
        const keyword = addressKeyword.toLowerCase();
        return (
            v.address?.toLowerCase().includes(keyword)  ||
            v.district?.toLowerCase().includes(keyword) ||
            v.city?.toLowerCase().includes(keyword)
        );
    });

    return [...addressFiltered].sort((a, b) => {
        if (sortBy === 'nearest') {
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
        }
        if (sortBy === 'rating') return (b.avgRating ?? 0) - (a.avgRating ?? 0); 
        return 0;
    });
}

const SESSION_KEY = 'sportapp_user_location';

function readLocationFromSession() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function saveLocationToSession(loc) {
    if (typeof window === 'undefined') return;
    try {
        if (loc) sessionStorage.setItem(SESSION_KEY, JSON.stringify(loc));
        else sessionStorage.removeItem(SESSION_KEY);
    } catch {}
}

export function useNearby() {
    const [userLocation, setUserLocation] = useState(() => readLocationFromSession());
    const [nearbyEnabled, setNearbyEnabled] = useState(false);
    const [status, setStatus] = useState(() => readLocationFromSession() ? 'granted' : 'idle');

    const saveLocation = useCallback((loc) => {
        setUserLocation(loc);
        saveLocationToSession(loc);
    }, []);

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setStatus('denied');
            return;
        }
        setStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                saveLocation(loc);
                setNearbyEnabled(true);
                setStatus('granted');
            },
            () => {
                setStatus('denied');
                setNearbyEnabled(false);
                alert('Vui lòng cho phép truy cập vị trí để lọc theo khoảng cách');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [saveLocation]);

    const toggle = useCallback((checked) => {
        if (!checked) {
            setNearbyEnabled(false);
            return;
        }
        if (userLocation) {
            setNearbyEnabled(true);
            return;
        }
        requestLocation();
    }, [userLocation, requestLocation]);

    const reset = useCallback(() => {
        setNearbyEnabled(false);
    }, []);

    const clearLocation = useCallback(() => {
        saveLocation(null);
        setNearbyEnabled(false);
        setStatus('idle');
    }, [saveLocation]);

    return { userLocation, nearbyEnabled, status, toggle, reset, clearLocation };
}
