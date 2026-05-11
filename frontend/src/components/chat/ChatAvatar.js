'use client';
/* eslint-disable @next/next/no-img-element */

import styles from '@/app/chat/chat.module.css';
import { getImageUrl } from '@/lib/api';

const SERVER_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
const CHATBOT_ID = 'sportapp-ai';

export default function ChatAvatar({ conv, size = 46, className = '' }) {
    const avatarSrc = getImageUrl(conv?.avatar);
    const isBot = conv?.type === 'bot' || conv?.id === CHATBOT_ID;

    return (
        <div
            className={`${styles.avatarImg} ${className}`.trim()}
            style={{
                width: size,
                height: size,
                background: conv?.avatarGradient || '#ccc',
                fontSize: size * 0.35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isBot ? 'white' : 'inherit',
            }}
        >
            {avatarSrc ? (
                <img src={avatarSrc} alt={conv?.name || 'Avatar'} />
            ) : (
                conv?.initials || ''
            )}
        </div>
    );
}
