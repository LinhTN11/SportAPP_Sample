'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './MapPicker.module.css';

// Default center: Ho Chi Minh City
const DEFAULT_CENTER = [10.7769, 106.7009];
const DEFAULT_ZOOM = 13;

export default function MapPicker({ value, onChange, readOnly = false, height = 350 }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [locating, setLocating] = useState(false);
    const debounceRef = useRef(null);
    const LRef = useRef(null);

    // Initialize map
    useEffect(() => {
        let cancelled = false;

        const initMap = async () => {
            const L = (await import('leaflet')).default;
            await import('leaflet/dist/leaflet.css');
            LRef.current = L;

            if (cancelled || !mapRef.current || mapInstanceRef.current) return;

            // Fix default marker icons
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const center = value?.latitude && value?.longitude
                ? [parseFloat(value.latitude), parseFloat(value.longitude)]
                : DEFAULT_CENTER;

            const map = L.map(mapRef.current, {
                center,
                zoom: value?.latitude ? 16 : DEFAULT_ZOOM,
                zoomControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(map);

            // Custom marker icon
            const customIcon = L.divIcon({
                className: styles.customMarker,
                html: '<div class="' + styles.markerPin + '">📍</div>',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
            });

            const marker = L.marker(center, {
                draggable: !readOnly,
                icon: customIcon,
            }).addTo(map);

            if (!readOnly) {
                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    reverseGeocode(pos.lat, pos.lng);
                });

                map.on('click', (e) => {
                    marker.setLatLng(e.latlng);
                    reverseGeocode(e.latlng.lat, e.latlng.lng);
                });
            }

            mapInstanceRef.current = map;
            markerRef.current = marker;
            setMapReady(true);

            // Fix map rendering in modals
            setTimeout(() => map.invalidateSize(), 300);
        };

        initMap();

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
                setMapReady(false);
            }
        };
    }, []);

    // Update marker when value changes externally
    useEffect(() => {
        if (mapReady && value?.latitude && value?.longitude && markerRef.current && mapInstanceRef.current) {
            const lat = parseFloat(value.latitude);
            const lng = parseFloat(value.longitude);
            const currentPos = markerRef.current.getLatLng();
            if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
                markerRef.current.setLatLng([lat, lng]);
                mapInstanceRef.current.setView([lat, lng], 16);
            }
        }
    }, [value?.latitude, value?.longitude, mapReady]);

    // Reverse geocode
    const reverseGeocode = useCallback(async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi,en&addressdetails=1`
            );
            const data = await res.json();
            if (data && data.address) {
                const addr = data.address;
                const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
                const district = addr.suburb || addr.city_district || addr.quarter || addr.town || '';
                const city = addr.city || addr.state || addr.county || '';

                onChange?.({
                    address: street || data.display_name?.split(',').slice(0, 2).join(',').trim() || '',
                    district: district,
                    city: city,
                    latitude: lat,
                    longitude: lng,
                    fullAddress: data.display_name || '',
                });
            } else {
                onChange?.({ address: '', district: '', city: '', latitude: lat, longitude: lng, fullAddress: '' });
            }
        } catch (err) {
            console.error('Reverse geocode error:', err);
            onChange?.({ address: '', district: '', city: '', latitude: lat, longitude: lng, fullAddress: '' });
        }
    }, [onChange]);

    // Search with debounce
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=vi,en&addressdetails=1&countrycodes=vn`
                );
                const data = await res.json();
                setSuggestions(data || []);
            } catch (err) {
                console.error('Search error:', err);
                setSuggestions([]);
            } finally {
                setSearching(false);
            }
        }, 500);
    }, []);

    // Select suggestion
    const handleSelectSuggestion = useCallback((suggestion) => {
        const lat = parseFloat(suggestion.lat);
        const lng = parseFloat(suggestion.lon);

        if (markerRef.current && mapInstanceRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
        }

        const addr = suggestion.address || {};
        const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
        const district = addr.suburb || addr.city_district || addr.quarter || addr.town || '';
        const city = addr.city || addr.state || addr.county || '';

        onChange?.({
            address: street || suggestion.display_name?.split(',').slice(0, 2).join(',').trim() || '',
            district: district,
            city: city,
            latitude: lat,
            longitude: lng,
            fullAddress: suggestion.display_name || '',
        });

        setSearchQuery(suggestion.display_name || '');
        setSuggestions([]);
    }, [onChange]);

    // Get current location
    const handleGetCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            alert('Trình duyệt không hỗ trợ định vị');
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (markerRef.current && mapInstanceRef.current) {
                    markerRef.current.setLatLng([latitude, longitude]);
                    mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
                }
                reverseGeocode(latitude, longitude);
                setLocating(false);
            },
            (err) => {
                console.error('Geolocation error:', err);
                alert('Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập định vị.');
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [reverseGeocode]);

    return (
        <div className={styles.container}>
            {!readOnly && (
                <div className={styles.searchBar}>
                    <div className={styles.searchInputWrapper}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Tìm địa chỉ... (VD: 123 Nguyễn Huệ, Quận 1)"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => searchQuery.length >= 2 && suggestions.length === 0 && handleSearch(searchQuery)}
                        />
                        {searching && <span className={styles.searchSpinner}>⏳</span>}
                    </div>
                    <button
                        type="button"
                        className={styles.gpsBtn}
                        onClick={handleGetCurrentLocation}
                        disabled={locating}
                        title="Sử dụng vị trí hiện tại"
                    >
                        {locating ? '⏳' : '📍'}
                    </button>
                </div>
            )}

            {/* Search suggestions dropdown */}
            {suggestions.length > 0 && (
                <div className={styles.suggestions}>
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            type="button"
                            className={styles.suggestionItem}
                            onClick={() => handleSelectSuggestion(s)}
                        >
                            <span className={styles.suggestionIcon}>📍</span>
                            <span className={styles.suggestionText}>{s.display_name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Map */}
            <div
                ref={mapRef}
                className={styles.map}
                style={{ height }}
            />

            {/* Selected address display */}
            {value?.fullAddress && (
                <div className={styles.selectedAddress}>
                    <span className={styles.selectedIcon}>✅</span>
                    <span className={styles.selectedText}>{value.fullAddress}</span>
                </div>
            )}

            {/* Coordinates display */}
            {value?.latitude && value?.longitude && (
                <div className={styles.coords}>
                    <span>📌 {parseFloat(value.latitude).toFixed(6)}, {parseFloat(value.longitude).toFixed(6)}</span>
                </div>
            )}
        </div>
    );
}
