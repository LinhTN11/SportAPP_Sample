'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminAPI } from '@/lib/api';
import {
    Users, Search, Filter, RefreshCcw, Trash2, Shield,
    CheckCircle, AlertTriangle, ChevronDown, X, UserCog
} from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import CustomSelect from '@/components/ui/CustomSelect';
import styles from './users.module.css';

/* ─── Role helpers ──────────────────────────── */
const ROLES = [
    { value: '',         label: 'Tất cả vai trò' },
    { value: 'CUSTOMER', label: 'Khách hàng'     },
    { value: 'OWNER',    label: 'Chủ sân'         },
    { value: 'ADMIN',    label: 'Admin'            },
];

const ROLE_STYLE = {
    ADMIN:    { label: 'Admin',      bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
    OWNER:    { label: 'Chủ sân',    bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
    CUSTOMER: { label: 'Khách hàng', bg: '#f0fdf4', color: '#10b981', border: '#a7f3d0' },
};

const RoleBadge = ({ role }) => {
    const s = ROLE_STYLE[role] || { label: role, bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: '20px',
            fontSize: '11px', fontWeight: 800,
            backgroundColor: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
            {s.label}
        </span>
    );
};

/* ─── Avatar ────────────────────────────────── */
const UserAvatar = ({ user, size = 40 }) => {
    const initials = user.fullName?.split(' ').map(w => w[0]).slice(-2).join('') || '?';
    return (
        <div style={{
            width: size, height: size, borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
            background: 'linear-gradient(135deg,#e0e7ff,#ede9fe)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, fontWeight: 700, color: '#4f46e5',
            border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
            {user.avatarUrl
                ? <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
            }
        </div>
    );
};

/* ─── Change Role Dropdown ──────────────────── */
const RoleDropdown = ({ userId, currentRole, onChanged }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const btnRef = useRef(null);

    const handleOpen = () => {
        if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownH = 130; // approximate
            // flip up if not enough space below
            if (spaceBelow < dropdownH + 8) {
                setCoords({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right, top: 'auto' });
            } else {
                setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right, bottom: 'auto' });
            }
        }
        setOpen(v => !v);
    };

    const handleSelect = async (role) => {
        if (role === currentRole) { setOpen(false); return; }
        setLoading(true); setOpen(false);
        try {
            await adminAPI.updateUserRole(userId, role);
            onChanged(userId, role);
        } catch (e) {
            alert('Không thể cập nhật vai trò: ' + (e.response?.data?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                ref={btnRef}
                className={styles.actionBtn}
                onClick={handleOpen}
                disabled={loading}
                title="Đổi vai trò"
            >
                <UserCog size={15} />
                <ChevronDown size={12} />
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
                    <div
                        className={styles.dropdown}
                        style={{
                            position: 'fixed',
                            top: coords.top !== 'auto' ? coords.top : undefined,
                            bottom: coords.bottom !== 'auto' ? coords.bottom : undefined,
                            right: coords.right,
                        }}
                    >
                        {ROLES.slice(1).map(r => (
                            <button
                                key={r.value}
                                className={`${styles.dropdownItem} ${r.value === currentRole ? styles.dropdownItemActive : ''}`}
                                onClick={() => handleSelect(r.value)}
                            >
                                {r.label}
                                {r.value === currentRole && <CheckCircle size={13} />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/* ─── Confirm Delete Modal ──────────────────── */
const DeleteModal = ({ user, onConfirm, onCancel, loading }) => (
    <div className={styles.modalOverlay}>
        <div className={styles.modal}>
            <div className={styles.modalIcon}>
                <AlertTriangle size={32} color="#ef4444" />
            </div>
            <h3 className={styles.modalTitle}>Xóa người dùng?</h3>
            <p className={styles.modalDesc}>
                Bạn sắp xóa tài khoản <strong>{user.fullName}</strong> ({user.email}).<br />
                Hành động này <strong>không thể hoàn tác</strong> và sẽ xóa toàn bộ dữ liệu liên quan.
            </p>
            <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>Hủy</button>
                <button className={styles.deleteBtn} onClick={onConfirm} disabled={loading}>
                    {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
            </div>
        </div>
    </div>
);

/* ─── Main Page ─────────────────────────────── */
const LIMIT = 15;

export default function AdminUsersPage() {
    const router = useRouter();
    const { user: me, isAuthenticated, loading: authLoading } = useAuth();

    const [users,       setUsers]       = useState([]);
    const [pagination,  setPagination]  = useState({ total: 0, totalPages: 0, page: 1 });
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);

    const [search,      setSearch]      = useState('');
    const [roleFilter,  setRoleFilter]  = useState('');
    const [page,        setPage]        = useState(1);
    const [searchInput, setSearchInput] = useState('');

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting,     setDeleting]     = useState(false);

    // — auth guard —
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || me?.role !== 'ADMIN')) router.push('/login');
    }, [authLoading, isAuthenticated, me, router]);

    // — fetch —
    const fetchUsers = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await adminAPI.getUsers({ page, limit: LIMIT, role: roleFilter || undefined, search: search || undefined });
            setUsers(res.data.data.users);
            setPagination(res.data.data.pagination);
        } catch (e) {
            setError('Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }, [page, roleFilter, search]);

    useEffect(() => { if (me?.role === 'ADMIN') fetchUsers(); }, [fetchUsers, me]);

    const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
    const clearSearch  = () => { setSearch(''); setSearchInput(''); setPage(1); };

    const handleRoleChanged = (id, newRole) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await adminAPI.deleteUser(deleteTarget.id);
            setDeleteTarget(null);
            fetchUsers();
        } catch (e) {
            alert('Không thể xóa: ' + (e.response?.data?.message || e.message));
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (iso) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (authLoading) return null;

    return (
        <div className={styles.page}>
            <div className={styles.inner}>

                {/* ── Header ── */}
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Quản lý người dùng</h1>
                        <p className={styles.subtitle}>
                            {pagination.total > 0
                                ? `${pagination.total} tài khoản trong hệ thống`
                                : 'Danh sách toàn bộ tài khoản'}
                        </p>
                    </div>
                    <button className={styles.refreshBtn} onClick={fetchUsers} disabled={loading}>
                        <RefreshCcw size={15} className={loading ? styles.spinning : ''} />
                        Làm mới
                    </button>
                </header>

                {/* ── Toolbar ── */}
                <div className={styles.toolbar}>
                    {/* Search */}
                    <form onSubmit={handleSearch} className={styles.searchWrap}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            className={styles.searchInput}
                            placeholder="Tìm tên, email, số điện thoại…"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                        />
                        {searchInput && (
                            <button type="button" className={styles.clearBtn} onClick={clearSearch}>
                                <X size={14} />
                            </button>
                        )}
                    </form>

                    {/* Role filter via CustomSelect */}
                    <CustomSelect
                        value={roleFilter}
                        onChange={(v) => { setRoleFilter(v); setPage(1); }}
                        options={ROLES}
                        placeholder="Tất cả vai trò"
                        className={styles.roleSelect}
                        fixed
                    />
                </div>

                {/* ── Table ── */}
                <div className={styles.card}>
                    {error ? (
                        <div className={styles.centerState}>
                            <AlertTriangle size={36} color="#ef4444" />
                            <p>{error}</p>
                            <button className={styles.refreshBtn} onClick={fetchUsers}>Thử lại</button>
                        </div>
                    ) : loading ? (
                        <div className={styles.centerState}>
                            <div className={styles.spinner} />
                            <p>Đang tải...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className={styles.centerState}>
                            <Users size={40} color="#cbd5e1" />
                            <p style={{ color: '#94a3b8', fontWeight: 600 }}>Không tìm thấy người dùng nào</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Người dùng</th>
                                    <th>Liên hệ</th>
                                    <th>Vai trò</th>
                                    <th style={{ textAlign: 'center' }}>Bookings</th>
                                    <th>Ngày tham gia</th>
                                    <th style={{ textAlign: 'center' }}>Xác minh</th>
                                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className={styles.row}>
                                        <td>
                                            <div className={styles.userCell}>
                                                <UserAvatar user={u} />
                                                <div>
                                                    <div className={styles.userName}>{u.fullName || '—'}</div>
                                                    <div className={styles.userId}>#{u.id.slice(-8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.contactCell}>
                                                <div className={styles.email}>{u.email}</div>
                                                {u.phone && <div className={styles.phone}>{u.phone}</div>}
                                            </div>
                                        </td>
                                        <td><RoleBadge role={u.role} /></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={styles.bookingCount}>{u._count?.bookings ?? 0}</span>
                                        </td>
                                        <td className={styles.dateCell}>{formatDate(u.createdAt)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {u.isVerified
                                                ? <CheckCircle size={18} color="#10b981" />
                                                : <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                                            }
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <RoleDropdown
                                                    userId={u.id}
                                                    currentRole={u.role}
                                                    onChanged={handleRoleChanged}
                                                />
                                                {u.id !== me?.id && (
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.dangerBtn}`}
                                                        onClick={() => setDeleteTarget(u)}
                                                        title="Xóa tài khoản"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className={styles.tableFooter}>
                            <Pagination
                                totalItems={pagination.total}
                                itemsPerPage={LIMIT}
                                currentPage={page}
                                onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Delete modal */}
            {deleteTarget && (
                <DeleteModal
                    user={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    loading={deleting}
                />
            )}
        </div>
    );
}
