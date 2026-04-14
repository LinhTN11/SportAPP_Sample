'use client';

import styles from '@/app/chat/chat.module.css';
import ChatAvatar from './ChatAvatar';

const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);

function ConversationItem({ conv, active, onClick }) {
    return (
        <button
            className={`${styles.convItem} ${active ? styles.activeConv : ''}`}
            onClick={onClick}
        >
            <div className={styles.convAvatar}>
                <ChatAvatar conv={conv} />
                {conv.online && <span className={styles.onlineDot} />}
            </div>
            <div className={styles.convBody}>
                <div className={styles.convTopRow}>
                    <span className={styles.convName}>{conv.name}</span>
                    <span className={styles.convTime}>{conv.time}</span>
                </div>
                <div className={styles.convBottomRow}>
                    <span className={`${styles.convPreview} ${conv.unread ? styles.unread : ''}`}>
                        {conv.lastMsg}
                    </span>
                    {conv.unread > 0 && (
                        <span className={styles.unreadBadge}>{conv.unread}</span>
                    )}
                </div>
            </div>
        </button>
    );
}

export default function ChatSidebar({
    conversations,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    activeConvId,
    setActiveConvId,
}) {
    const filteredConvs = conversations.filter((c) => {
        const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeTab === 'venues') return matchSearch && c.type === 'venue';
        if (activeTab === 'users') return matchSearch && c.type === 'user';
        return matchSearch;
    });

    const botConvs = filteredConvs.filter(c => c.type === 'bot');
    const userConvs = filteredConvs.filter(c => c.type === 'user');
    const venueConvs = filteredConvs.filter(c => c.type === 'venue');

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <h1 className={styles.sidebarTitle}>Tin nhắn</h1>
                <div className={styles.searchWrapper}>
                    <span className={styles.searchIcon}><SearchIcon /></span>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Tìm kiếm cuộc trò chuyện..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.sidebarTabs}>
                {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'users', label: 'Bạn bè' },
                    { key: 'venues', label: 'Sân thể thao' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`${styles.sidebarTab} ${activeTab === tab.key ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={styles.conversationList}>
                {activeTab !== 'venues' && botConvs.length > 0 && (
                    <>
                        <div className={styles.sectionLabel}>TRỢ LÝ AI</div>
                        {botConvs.map(conv => (
                            <ConversationItem
                                key={conv.id}
                                conv={conv}
                                active={activeConvId === conv.id}
                                onClick={() => setActiveConvId(conv.id)}
                            />
                        ))}
                    </>
                )}
                {activeTab !== 'venues' && userConvs.length > 0 && (
                    <>
                        <div className={styles.sectionLabel}>Bạn bè & Đồng đội</div>
                        {userConvs.map(conv => (
                            <ConversationItem
                                key={conv.id}
                                conv={conv}
                                active={activeConvId === conv.id}
                                onClick={() => setActiveConvId(conv.id)}
                            />
                        ))}
                    </>
                )}
                {activeTab !== 'users' && venueConvs.length > 0 && (
                    <>
                        <div className={styles.sectionLabel}>Sân thể thao</div>
                        {venueConvs.map(conv => (
                            <ConversationItem
                                key={conv.id}
                                conv={conv}
                                active={activeConvId === conv.id}
                                onClick={() => setActiveConvId(conv.id)}
                            />
                        ))}
                    </>
                )}
            </div>
        </aside>
    );
}
