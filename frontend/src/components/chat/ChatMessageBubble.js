'use client';
/* eslint-disable @next/next/no-img-element */

import { MapPin } from 'lucide-react';
import styles from '@/app/chat/chat.module.css';
import ChatCardRenderer from './ChatCardRenderer';

const CHATBOT_ID = 'sportapp-ai';
const SERVER_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

function BubbleAvatar({ conv, size = 28 }) {
    const avatarSrc = conv?.avatar ? (conv.avatar.startsWith('http') ? conv.avatar : `${SERVER_URL}${conv.avatar}`) : null;
    const isBot = conv?.type === 'bot' || conv?.id === CHATBOT_ID;

    return (
        <div
            className={styles.avatarImg}
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

export default function ChatMessageBubble({
    msg,
    conv,
    onAction,
    onSend,
    isBotLoading,
    bookingStates,
    bookingHandlers,
}) {
    const isSystem = msg.type === 'system' || msg.type === 'SYSTEM';
    const isOut = msg.isOutgoing;

    if (isSystem) {
        let data = {};
        try {
            data = JSON.parse(msg.text);
        } catch (e) {
            return (
                <div className={styles.systemMessage}>
                    <span className={styles.systemBadge}>{msg.text}</span>
                </div>
            );
        }

        return (
            <div className={`${styles.systemCardWrapper} ${data.action === 'VENUE_SUGGEST' ? (isOut ? styles.systemCardOutgoing : styles.systemCardIncoming) : styles.systemCardCentered}`}>
                <ChatCardRenderer
                    data={data}
                    messageId={msg.id}
                    onAction={(act, payload) => onAction('SYSTEM_CARD_ACTION', { action: act, payload, messageId: msg.id })}
                />
            </div>
        );
    }

    return (
        <div className={styles.messageGroup}>
            {msg.isVenueTag && (
                <div className={styles.messageBubbleWrapper}>
                    <BubbleAvatar conv={{ ...conv, type: 'bot' }} size={28} />
                    <div>
                        <div className={`${styles.venueTag} ${styles.incoming}`}>
                            <MapPin size={14} className={styles.venueTagIcon} /> {msg.venueName}
                        </div>
                        <div className={`${styles.bubble} ${styles.incoming}`}>
                            {msg.text}
                        </div>
                        <div className={styles.bubbleTime}>{msg.time}</div>
                    </div>
                </div>
            )}
            {!msg.isVenueTag && (
                <div className={`${styles.messageBubbleWrapper} ${isOut ? styles.outgoing : ''}`}>
                    {!isOut && (
                        <div className={styles.bubbleAvatarWrapper}>
                            <BubbleAvatar conv={conv} size={28} />
                        </div>
                    )}
                    <div className={`${styles.bubbleContainer} ${isOut ? styles.outgoing : ''}`}>
                        <div className={`${styles.bubble} ${isOut ? styles.outgoing : styles.incoming} ${msg.isBot ? styles.msgBubbleBot : ''} ${msg.originalType === 'IMAGE' ? styles.bubbleImage : ''}`}>
                            {msg.originalType === 'IMAGE' ? (
                                <img
                                    src={`${SERVER_URL}${msg.text}`}
                                    className={styles.messageImage}
                                    alt="Sent content"
                                    onClick={() => window.open(`${SERVER_URL}${msg.text}`, '_blank')}
                                />
                            ) : (
                                msg.text
                            )}
                        </div>
                        {msg.isBot && msg.data && (
                            <div className={styles.botRichArea}>
                                {msg.data.toolResults.map((res, ri) => (
                                    <ChatCardRenderer
                                        key={ri}
                                        type={res.type}
                                        data={res.data}
                                        isLoading={isBotLoading}
                                        onAction={onSend}
                                        bookingFormStates={{
                                            bookingDate: bookingStates.bookingDate,
                                            setBookingDate: bookingStates.setBookingDate,
                                            paymentType: bookingStates.paymentType,
                                            setPaymentType: bookingStates.setPaymentType,
                                            selectedFieldId: bookingStates.selectedFieldId,
                                            setSelectedFieldId: bookingStates.setSelectedFieldId,
                                            selectedSlots: bookingStates.selectedSlots,
                                            handleSlotClick: bookingHandlers.handleSlotClick,
                                            availableSlots: bookingStates.availableSlots,
                                            isLoadingSlots: bookingStates.isLoadingSlots,
                                            handleBookingSubmit: bookingHandlers.handleBookingSubmit,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        <div className={`${styles.bubbleTime} ${isOut ? styles.outgoing : ''}`}>
                            {msg.time}
                            {isOut && msg.read && ' ✓✓'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
