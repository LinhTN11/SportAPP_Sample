'use client';

import { CheckCircle, Clock, XCircle, PauseCircle } from 'lucide-react';

const statusConfig = {
    APPROVED: {
        label: 'Đang hoạt động',
        bg: '#10B981',
        icon: <CheckCircle size={14} />,
    },
    PENDING: {
        label: 'Chờ duyệt',
        bg: '#F59E0B',
        icon: <Clock size={14} />,
    },
    REJECTED: {
        label: 'Bị từ chối',
        bg: '#EF4444',
        icon: <XCircle size={14} />,
    },
    SUSPENDED: {
        label: 'Tạm ngưng',
        bg: '#6B7280',
        icon: <PauseCircle size={14} />,
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
            {config.icon}
            {config.label}
        </span>
    );
}

export { statusConfig };
