'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, DollarSign, Calendar, TrendingUp, CheckCircle, XCircle, 
  Search, Filter, Lock, Unlock, Menu, X, ChevronRight, Activity, MapPin, Building
} from 'lucide-react';
import styles from './dashboard.module.css';
import Link from 'next/link';

// Mock Data
const kpiData = [
  { title: 'Tổng doanh thu', value: '450,000,000 đ', icon: DollarSign, trend: '+15%' },
  { title: 'Hoa hồng tháng này', value: '45,000,000 đ', icon: TrendingUp, trend: '+12%' },
  { title: 'Tổng booking', value: '1,250', icon: Calendar, trend: '+8%' },
  { title: 'User mới', value: '320', icon: Users, trend: '+25%' }
];

const revenueData = [
  { name: 'T1', revenue: 4000 }, { name: 'T2', revenue: 3000 },
  { name: 'T3', revenue: 2000 }, { name: 'T4', revenue: 2780 },
  { name: 'T5', revenue: 1890 }, { name: 'T6', revenue: 2390 },
  { name: 'T7', revenue: 3490 }, { name: 'T8', revenue: 4000 },
  { name: 'T9', revenue: 3000 }, { name: 'T10', revenue: 2000 },
  { name: 'T11', revenue: 2780 }, { name: 'T12', revenue: 3890 },
];

const sportData = [
  { name: 'Bóng đá', value: 400 },
  { name: 'Cầu lông', value: 300 },
  { name: 'Tennis', value: 300 },
  { name: 'Bơi lội', value: 200 },
];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const venuesPending = [
  { id: 1, name: 'Sân bóng Thăng Long', owner: 'Nguyễn Văn A', address: 'Hà Nội', sport: 'Bóng đá', created: '2026-04-10' },
  { id: 2, name: 'Sân cầu lông Vina', owner: 'Trần Thị B', address: 'HCM', sport: 'Cầu lông', created: '2026-04-12' },
];

const usersList = [
  { id: 1, name: 'Lê Văn C', email: 'c@gmail.com', role: 'USER', locked: false },
  { id: 2, name: 'Phạm Thị D', email: 'd@gmail.com', role: 'OWNER', locked: true },
  { id: 3, name: 'Hoàng Văn E', email: 'e@gmail.com', role: 'USER', locked: false },
];

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  
  const [venues, setVenues] = useState(venuesPending);
  const [users, setUsers] = useState(usersList);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null); // { id, type: 'APPROVE' | 'REJECT' }

  // Handlers
  const handleActionClick = (id, type) => {
    setSelectedAction({ id, type });
    setModalOpen(true);
  };

  const confirmAction = () => {
    if (selectedAction) {
      setVenues(venues.filter(v => v.id !== selectedAction.id));
      alert(`Đã ${selectedAction.type === 'APPROVE' ? 'duyệt' : 'từ chối'} sân thành công!`);
    }
    setModalOpen(false);
    setSelectedAction(null);
  };

  const toggleLock = (userId) => {
    setUsers(users.map(u => u.id === userId ? { ...u, locked: !u.locked } : u));
    alert('Đã cập nhật trạng thái tài khoản!');
  };

  const filteredUsers = users.filter(u => 
    (roleFilter === 'ALL' || u.role === roleFilter) && 
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          {sidebarOpen && <h2>Admin Panel</h2>}
          <button className={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className={styles.navLinks}>
          <Link href="/dashboard"><Activity size={20} /> {sidebarOpen && <span>Dashboard</span>}</Link>
          <Link href="/dashboard/venues"><Building size={20} /> {sidebarOpen && <span>Quản lý sân</span>}</Link>
          <Link href="/dashboard/users"><Users size={20} /> {sidebarOpen && <span>Quản lý User</span>}</Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1>Tổng Quan Báo Cáo</h1>
        </header>

        {/* KPIs */}
        <div className={styles.kpiGrid}>
          {kpiData.map((kpi, idx) => (
            <div key={idx} className={styles.kpiCard}>
              <div className={styles.kpiIcon}><kpi.icon size={24} /></div>
              <div className={styles.kpiInfo}>
                <p>{kpi.title}</p>
                <h3>{kpi.value}</h3>
                <span className={styles.trend}>{kpi.trend} so với tháng trước</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <h3>Doanh thu 12 tháng</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={styles.chartCard}>
            <h3>Phân loại booking theo Sport</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sportData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label>
                    {sportData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pending Venues Table */}
        <div className={styles.tableCard}>
          <h3>Sân chờ duyệt</h3>
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tên sân</th>
                  <th>Owner</th>
                  <th>Địa chỉ</th>
                  <th>Sport</th>
                  <th>Ngày tạo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {venues.length === 0 ? (
                  <tr><td colSpan="6" className={styles.emptyText}>Không có sân nào chờ duyệt</td></tr>
                ) : venues.map(v => (
                  <tr key={v.id}>
                    <td>{v.name}</td>
                    <td>{v.owner}</td>
                    <td>{v.address}</td>
                    <td>{v.sport}</td>
                    <td>{v.created}</td>
                    <td className={styles.actions}>
                      <button className={styles.btnApprove} onClick={() => handleActionClick(v.id, 'APPROVE')}><CheckCircle size={16}/> Duyệt</button>
                      <button className={styles.btnReject} onClick={() => handleActionClick(v.id, 'REJECT')}><XCircle size={16}/> Từ chối</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h3>Quản lý Users</h3>
            <div className={styles.filters}>
              <div className={styles.searchBox}>
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Tìm theo tên, email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={styles.roleFilter}>
                <option value="ALL">Tất cả role</option>
                <option value="USER">USER</option>
                <option value="OWNER">OWNER</option>
              </select>
            </div>
          </div>
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`${styles.roleBadge} ${styles[u.role.toLowerCase()]}`}>{u.role}</span></td>
                    <td>
                      <span className={`${styles.statusBadge} ${u.locked ? styles.locked : styles.active}`}>
                        {u.locked ? 'Khoá' : 'Hoạt động'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className={`${styles.iconBtn} ${u.locked ? styles.btnUnlock : styles.btnLock}`}
                        onClick={() => toggleLock(u.id)}
                        title={u.locked ? "Mở khoá" : "Khoá tài khoản"}
                      >
                        {u.locked ? <Unlock size={18}/> : <Lock size={18}/>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Xác nhận hành động</h3>
            <p>Bạn có chắc chắn muốn {selectedAction?.type === 'APPROVE' ? 'duyệt' : 'từ chối'} sân này không?</p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModalOpen(false)}>Hủy</button>
              <button 
                className={selectedAction?.type === 'APPROVE' ? styles.btnApprove : styles.btnReject} 
                onClick={confirmAction}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
