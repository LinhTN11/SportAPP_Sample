/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

/**
 * CountdownTimer
 * Props:
 *   expiresAt  — ISO string của holdExpiresAt
 *   onExpired  — callback khi hết giờ
 */
export default function CountdownTimer({ expiresAt, onExpired }) {
    const [secondsLeft, setSecondsLeft] = useState(0);

    useEffect(() => {
        // Tính số giây còn lại lần đầu
        const calc = () => {
            // thời gian hết hạn (expriresAt)-thời điểm hiện tại /1000 vì ban đầu nó là ms ra giây 
            const diff = Math.floor((new Date(expiresAt) - Date.now()) / 1000);
            return diff > 0 ? diff : 0;
        };

        setSecondsLeft(calc());
        // cứ mỗi 1 dây tính lại hàm calc 1 lần
        const interval = setInterval(() => {
            const remaining = calc();
            setSecondsLeft(remaining);
            // nếu re=0 thì clear và gọi onExpired để kết thúc
            if (remaining === 0) {
                clearInterval(interval);
                onExpired?.();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    // Format mm:ss
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const seconds = String(secondsLeft % 60).padStart(2, '0');

    const isUrgent = secondsLeft < 60 && secondsLeft > 0;
    const isExpired = secondsLeft === 0;

    const color = isExpired ? '#EF4444' : isUrgent ? '#EF4444' : '#F59E0B';
    const bgColor = isExpired ? '#FEF2F2' : isUrgent ? '#FEF2F2' : '#FFFBEB';
    const borderColor = isExpired ? '#FECACA' : isUrgent ? '#FECACA' : '#FDE68A';

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color,
            animation: isUrgent ? 'pulse 1s infinite' : 'none',
        }}>
            <Clock size={13} color={color} />
            {isExpired ? 'Đã hết hạn' : `${minutes}:${seconds}`}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}