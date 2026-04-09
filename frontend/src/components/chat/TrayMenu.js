import React from 'react';
import { Image } from 'lucide-react';

const EMOJIS = ['😂','❤️','🔥','👍','😍','🥹','😭','🙏','✨','😅','🤩','🫶','😎','🤗','🥳','😤','💪','⚽'];
const STICKERS = ['🐱','🐶','🦊','🐻','🐼','🐨','🐯','🦁'];

export default function TrayMenu({ openTray, onSendQuick, styles }) {
    return (
        <>
            {/* ── Sticker tray ── */}
            <div className={`${styles.tray} ${styles.stickerTray} ${openTray === 'sticker' ? styles.trayOpen : ''}`}>
                {STICKERS.map(s => (
                    <button key={s} className={styles.stickerItem} onClick={() => onSendQuick(s)}>
                        {s}
                    </button>
                ))}
            </div>

            {/* ── Image tray (placeholder) ── */}
            <div className={`${styles.tray} ${styles.imageTray} ${openTray === 'image' ? styles.trayOpen : ''}`}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={styles.imageThumb}>
                        <Image size={20} color="#9CA3AF" />
                    </div>
                ))}
            </div>

            {/* ── Emoji tray ── */}
            <div className={`${styles.tray} ${styles.emojiTray} ${openTray === 'emoji' ? styles.trayOpen : ''}`}>
                {EMOJIS.map(e => (
                    <button key={e} className={styles.emojiBtn} onClick={() => onSendQuick(e)}>
                        {e}
                    </button>
                ))}
            </div>
        </>
    );
}
