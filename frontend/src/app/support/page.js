'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usersAPI, chatAPI } from '@/lib/api';
import { CreditCard, Lock, Building2, Receipt, Users, MessageSquare, Shield, Headphones, Check, Zap, MessageCircle, Lightbulb, Mail, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import styles from './support.module.css';

const SUPPORT_CATEGORIES = [
    {
        id: 'payment',
        icon: <CreditCard size={32} />,
        title: 'Thanh toán & Đặt sân',
        desc: 'Lỗi thanh toán, hoàn tiền, sự cố khi đặt sân',
        color: '#3b82f6',
        bg: '#eff6ff',
    },
    {
        id: 'account',
        icon: <Lock size={32} />,
        title: 'Tài khoản',
        desc: 'Tài khoản bị khóa, quên mật khẩu, bảo mật',
        color: '#8b5cf6',
        bg: '#f5f3ff',
    },
    {
        id: 'venue',
        icon: <Building2 size={32} />,
        title: 'Khiếu nại chủ sân',
        desc: 'Sân không đúng mô tả, chủ sân vi phạm quy định',
        color: '#ef4444',
        bg: '#fef2f2',
    },
    {
        id: 'tax',
        icon: <Receipt size={32} />,
        title: 'Thuế & Chứng từ',
        desc: 'Câu hỏi về chứng từ điện tử, mã số thuế',
        color: '#f59e0b',
        bg: '#fffbeb',
    },
    {
        id: 'match',
        icon: <Users size={32} />,
        title: 'Ghép trận & Tìm đối',
        desc: 'Sự cố khi ghép trận, người chơi không đáng tin',
        color: '#10b981',
        bg: '#f0fdf4',
    },
    {
        id: 'other',
        icon: <MessageSquare size={32} />,
        title: 'Vấn đề khác',
        desc: 'Góp ý, phản hồi chung về nền tảng SportApp',
        color: '#64748b',
        bg: '#f8fafc',
    },
];

const FAQ_ITEMS = [
    {
        q: 'Làm sao để hủy đặt sân và được hoàn tiền?',
        a: 'Bạn có thể hủy đặt sân trước 24h so với giờ chơi để được hoàn tiền đặt cọc. Vào mục "Đặt sân của tôi" → chọn booking → nhấn "Hủy đặt sân".',
    },
    {
        q: 'Tại sao tài khoản của tôi bị hạn chế?',
        a: 'Tài khoản có thể bị hạn chế do vi phạm điều khoản sử dụng hoặc có hoạt động bất thường. Liên hệ hỗ trợ để được giải quyết.',
    },
    {
        q: 'Chứng từ điện tử được cấp khi nào?',
        a: 'Chứng từ khấu trừ thuế TNCN được cấp sau mỗi tháng khi booking hoàn thành. Chủ sân có thể xem tại mục "Thuế & Chứng từ".',
    },
    {
        q: 'Làm sao để trở thành chủ sân trên SportApp?',
        a: 'Đăng ký tài khoản, chọn vai trò "Chủ sân", điền thông tin sân và chờ Admin duyệt (thường trong 24h làm việc).',
    },
];

export default function SupportPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [customMessage, setCustomMessage] = useState('');
    const [adminInfo, setAdminInfo] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) router.push('/login');
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isAuthenticated) {
            usersAPI.getAdminContact()
                .then(({ data }) => setAdminInfo(data.data.admin))
                .catch(err => console.error('Admin contact error:', err));
        }
    }, [isAuthenticated]);

    const handleContact = async () => {
        if (!adminInfo) return;
        setIsConnecting(true);
        try {
            const { data: roomData } = await chatAPI.createRoom(adminInfo.id);
            const roomId = roomData.data.room.id;
            
            const category = SUPPORT_CATEGORIES.find(c => c.id === selectedCategory);
            
            // 1. Send context as a SYSTEM message first (displays formatted in chat)
            let systemContext = {
                action: 'SUPPORT_INIT',
                category: category?.title || 'Chung',
                timestamp: new Date().toISOString()
            };
            await chatAPI.sendMessage(roomId, { 
                content: JSON.stringify(systemContext),
                type: 'SYSTEM'
            });

            // 2. Send the actual user message (exactly what they typed)
            const userContent = customMessage.trim() || `Tôi cần hỗ trợ về chủ đề: ${category?.title || 'Hỗ trợ chung'}`;
            await chatAPI.sendMessage(roomId, { 
                content: userContent,
                type: 'TEXT'
            });
            
            router.push(`/chat?user=${adminInfo.id}`);
        } catch (err) {
            console.error('Failed to connect to support:', err);
        } finally {
            setIsConnecting(false);
        }
    };

    if (authLoading) return null;

    const selectedCat = SUPPORT_CATEGORIES.find(c => c.id === selectedCategory);

    return (
        <div className={styles.page}>
            {/* ── Hero ── */}
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <div className={styles.heroBadge}>
                        <span><Shield size={18} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /></span> Trung tâm hỗ trợ SportApp
                    </div>
                    <h1 className={styles.heroTitle}>
                        Chúng tôi luôn sẵn sàng<br />
                        <span className={styles.heroGradient}>giúp đỡ bạn</span>
                    </h1>
                    <p className={styles.heroSub}>
                        Chọn chủ đề bạn cần hỗ trợ bên dưới hoặc nhắn tin trực tiếp với đội hỗ trợ của chúng tôi.
                    </p>
                    <div className={styles.heroStats}>
                        <div className={styles.stat}>
                            <span className={styles.statNum}>{'< 2h'}</span>
                            <span className={styles.statLabel}>Thời gian phản hồi</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>7/7</span>
                            <span className={styles.statLabel}>Ngày trong tuần</span>
                        </div>
                        <div className={styles.statDivider} />
                        <div className={styles.stat}>
                            <span className={styles.statNum}>98%</span>
                            <span className={styles.statLabel}>Hài lòng</span>
                        </div>
                    </div>
                </div>
                <div className={styles.heroIllustration}>
                    <div className={styles.heroCircle}>
                        <span><Headphones size={64} color="#10b981" /></span>
                    </div>
                    <div className={styles.floatingCard} style={{ top: '10%', right: '-10px' }}>
                        <span><Check size={16} color="#10b981" style={{ display: 'inline', verticalAlign: 'text-bottom' }} /></span> Đã giải quyết
                    </div>
                    <div className={styles.floatingCard} style={{ bottom: '15%', left: '-10px', animationDelay: '1s' }}>
                        <span><Zap size={16} color="#f59e0b" style={{ display: 'inline', verticalAlign: 'text-bottom' }} /></span> Phản hồi nhanh
                    </div>
                </div>
            </div>

            <div className={styles.main}>
                {/* ── Category grid ── */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Bạn cần hỗ trợ về vấn đề gì?</h2>
                    <p className={styles.sectionSub}>Chọn chủ đề để chúng tôi hỗ trợ bạn nhanh hơn</p>

                    <div className={styles.categoryGrid}>
                        {SUPPORT_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                className={`${styles.categoryCard} ${selectedCategory === cat.id ? styles.categorySelected : ''}`}
                                style={selectedCategory === cat.id
                                    ? { borderColor: cat.color, background: cat.bg }
                                    : {}
                                }
                                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                            >
                                <div className={styles.categoryIcon} style={{ background: cat.bg, color: cat.color }}>
                                    {cat.icon}
                                </div>
                                <div className={styles.categoryText}>
                                    <div className={styles.categoryTitle}>{cat.title}</div>
                                    <div className={styles.categoryDesc}>{cat.desc}</div>
                                </div>
                                {selectedCategory === cat.id && (
                                    <div className={styles.categoryCheck} style={{ color: cat.color }}><Check size={20} /></div>
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                {/* ── Contact panel ── */}
                <section className={styles.contactSection}>
                    <div className={styles.contactCard}>
                        <div className={styles.contactHeader}>
                            <div className={styles.adminAvatar}>
                                {adminInfo?.avatarUrl
                                    ? <img src={adminInfo.avatarUrl} alt="Admin" />
                                    : <Shield size={24} color="#6B7280" />
                                }
                            </div>
                            <div>
                                <div className={styles.adminName}>{adminInfo?.fullName || 'SportApp Admin'}</div>
                                <div className={styles.adminStatus}>
                                    <span className={styles.onlineDot} /> Đang trực tuyến
                                </div>
                            </div>
                        </div>

                        {selectedCat && (
                            <div className={styles.selectedTag} style={{ background: selectedCat.bg, color: selectedCat.color, borderColor: selectedCat.color }}>
                                {selectedCat.icon} Đã chọn: <strong>{selectedCat.title}</strong>
                            </div>
                        )}

                        <div className={styles.messageInputWrap}>
                            <label className={styles.inputLabel}>Mô tả chi tiết vấn đề (không bắt buộc)</label>
                            <textarea
                                className={styles.messageInput}
                                placeholder={`Ví dụ: "${selectedCat ? selectedCat.desc : 'Tôi gặp sự cố khi...'}"...`}
                                rows={4}
                                value={customMessage}
                                onChange={e => setCustomMessage(e.target.value)}
                            />
                        </div>

                        <button
                            className={styles.chatBtn}
                            onClick={handleContact}
                            disabled={isConnecting || !adminInfo}
                        >
                            {isConnecting ? (
                                <><span className={styles.spinner} /> Đang kết nối...</>
                            ) : (
                                <><MessageCircle size={18} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Nhắn tin với bộ phận hỗ trợ</>
                            )}
                        </button>

                        <p className={styles.contactNote}>
                            Cuộc hội thoại sẽ mở ngay trong mục <strong>Tin nhắn</strong> của bạn
                        </p>
                    </div>

                    {/* ── Quick tips ── */}
                    <div className={styles.tipsCard}>
                        <div className={styles.tipsTitle}><Lightbulb size={20} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Mẹo hữu ích</div>
                        <ul className={styles.tipsList}>
                            <li>Mô tả càng chi tiết sẽ được giải quyết càng nhanh</li>
                            <li>Đính kèm ảnh chụp màn hình nếu có lỗi hiển thị</li>
                            <li>Ghi rõ mã booking nếu vấn đề liên quan đến đặt sân</li>
                            <li>Thời gian phản hồi trung bình dưới 2 giờ trong giờ làm việc</li>
                        </ul>

                        <div className={styles.contactMeta} style={{ marginTop: '20px' }}>
                            <div className={styles.metaRow}>
                                <span><Mail size={16} /></span>
                                <span>support@sportapp.vn</span>
                            </div>
                            <div className={styles.metaRow}>
                                <span><Clock size={16} /></span>
                                <span>8:00 – 22:00, Thứ 2 – CN</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── FAQ ── */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Câu hỏi thường gặp</h2>
                    <p className={styles.sectionSub}>Tìm nhanh câu trả lời trước khi liên hệ hỗ trợ</p>
                    <div className={styles.faqList}>
                        {FAQ_ITEMS.map((item, i) => (
                            <div key={i} className={`${styles.faqItem} ${activeAccordion === i ? styles.faqOpen : ''}`}>
                                <button
                                    className={styles.faqQuestion}
                                    onClick={() => setActiveAccordion(activeAccordion === i ? null : i)}
                                >
                                    <span>{item.q}</span>
                                    <span className={styles.faqChevron}>{activeAccordion === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                                </button>
                                {activeAccordion === i && (
                                    <div className={styles.faqAnswer}>{item.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
