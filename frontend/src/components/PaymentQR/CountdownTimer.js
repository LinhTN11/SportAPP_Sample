'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function CountdownTimer({ expiresAt, onExpired }) {
    const expiresMs = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
    const [remainingMs, setRemainingMs] = useState(null);
    const expiredNotifiedRef = useRef(false);

    useEffect(() => {
        expiredNotifiedRef.current = false;

        const timer = setInterval(() => {
            const next = Math.max(expiresMs - Date.now(), 0);
            setRemainingMs(next);

            if (next === 0 && !expiredNotifiedRef.current) {
                expiredNotifiedRef.current = true;
                if (typeof onExpired === 'function') onExpired();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [expiresMs, onExpired]);

    if (!expiresAt) return null;

    if (remainingMs === null) {
        return (
            <span className="badge" style={{ background: '#EEF2FF', color: '#1D4ED8', fontWeight: 700 }}>
                Dang tinh...
            </span>
        );
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    const urgent = remainingMs > 0 && remainingMs <= 2 * 60 * 1000;

    return (
        <span
            className="badge"
            style={{
                background: remainingMs === 0 ? '#FEE2E2' : urgent ? '#FEF3C7' : '#EEF2FF',
                color: remainingMs === 0 ? '#B91C1C' : urgent ? '#B45309' : '#1D4ED8',
                fontWeight: 700,
            }}
        >
            {remainingMs === 0 ? 'Het han' : `Con ${mm}:${ss}`}
        </span>
    );
}
