'use client';

const statusConfig = {
    APPROVED: {
        label: 'Đang hoạt động',
        bg: '#10B981',
        icon: '✅',
    },
    PENDING: {
        label: 'Chờ duyệt',
        bg: '#F59E0B',
        icon: '⏳',
    },
    REJECTED: {
        label: 'Bị từ chối',
        bg: '#EF4444',
        icon: '❌',
    },
    SUSPENDED: {
        label: 'Tạm ngưng',
        bg: '#6B7280',
        icon: '⏸️',
    },
};

export default function StatusBadge({ status, className = '' }) {
    const config = statusConfig[status] || statusConfig.PENDING;

    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                background: config.bg,
                color: 'white',
                whiteSpace: 'nowrap',
            }}
        >
            {config.label}
        </span>
    );
}

export { statusConfig };
