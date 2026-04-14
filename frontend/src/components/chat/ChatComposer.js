'use client';

import { Send, Smile, Image as ImageIcon } from 'lucide-react';
import styles from '@/app/chat/chat.module.css';

export default function ChatComposer({
    activeConv,
    activeConvId,
    chatbotId,
    message,
    setMessage,
    showEmoji,
    setShowEmoji,
    emojis,
    composeRef,
    fileInputRef,
    onSend,
    onKeyDown,
    onUploadImage,
    onTyping,
}) {
    return (
        <div className={styles.inputWrapper}>
            {showEmoji && (
                <div className={styles.emojiTray}>
                    {emojis.map((emoji, idx) => (
                        <button
                            key={idx}
                            className={styles.emojiBtn}
                            onClick={() => {
                                setMessage(prev => prev + emoji);
                                setShowEmoji(false);
                                composeRef.current?.focus();
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
            <div className={styles.composeBox}>
                <div className={styles.composeLeftActions}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setShowEmoji(!showEmoji)}
                        title="Biểu tượng"
                        type="button"
                    >
                        <Smile size={20} />
                    </button>
                    <>
                        <button
                            className={styles.iconBtn}
                            onClick={() => fileInputRef.current?.click()}
                            title="Gửi ảnh"
                            type="button"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={onUploadImage}
                        />
                    </>
                </div>
                <div className={styles.composeInputWrapper}>
                    <textarea
                        ref={composeRef}
                        className={styles.composeInput}
                        placeholder={`Nhắn tin cho ${activeConv?.name || 'cuộc trò chuyện'}...`}
                        value={message}
                        onChange={e => {
                            setMessage(e.target.value);
                            onTyping?.();
                        }}
                        onKeyDown={onKeyDown}
                        rows={1}
                        onClick={() => setShowEmoji(false)}
                    />
                </div>
                <button
                    className={styles.sendBtn}
                    onClick={() => onSend()}
                    disabled={!message.trim()}
                    title="Gửi"
                    type="button"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
