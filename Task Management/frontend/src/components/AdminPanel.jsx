import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  CheckSquare,
  FolderKanban,
  Briefcase,
  Search,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Calendar
} from 'lucide-react';
import { api } from '../api';

export function AdminPanel({ currentUser, onShowToast }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Added state for detailed views
  const [detailedView, setDetailedView] = useState(null); // 'tasks', 'projects', 'workspaces', or null
  const [detailedData, setDetailedData] = useState([]);
  const [detailedLoading, setDetailedLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.getAdminStats();
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Failed to load admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (targetPage = page, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers({ page: targetPage, limit: 10, search: search.trim() });
      if (res) {
        setUsers(res.users || []);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
        setTotalUsers(res.total || 0);
      }
    } catch (err) {
      onShowToast?.(err.message || 'Failed to fetch users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, onShowToast]);

  useEffect(() => {
    fetchStats();
    fetchUsers(1, '');
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, searchQuery);
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser._id === currentUser?._id && newRole !== 'admin') {
      onShowToast?.('You cannot remove your own admin privileges.', 'error');
      return;
    }

    setActionLoadingId(targetUser._id);
    try {
      await api.updateUserRole(targetUser._id, newRole);
      onShowToast?.(`Updated ${targetUser.name || targetUser.email}'s role to ${newRole.toUpperCase()}.`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, role: newRole } : u))
      );
      fetchStats();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to update user role.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeactivate = async (targetUser) => {
    if (targetUser._id === currentUser?._id) {
      onShowToast?.('You cannot deactivate your own account.', 'error');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to deactivate ${targetUser.name || targetUser.email}? They will no longer be able to log in.`
    );
    if (!confirmDelete) return;

    setActionLoadingId(targetUser._id);
    try {
      await api.deactivateUser(targetUser._id);
      onShowToast?.(`User ${targetUser.name || targetUser.email} has been deactivated.`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, isDeleted: true } : u))
      );
      fetchStats();
    } catch (err) {
      onShowToast?.(err.message || 'Failed to deactivate user.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <main className="dashboard-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              padding: '3px 10px',
              borderRadius: '100px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}>
              <Shield size={12} /> SYSTEM ADMIN
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Admin Control Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            System-wide analytics, user registry, and role management.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => {
            fetchStats();
            fetchUsers(page, searchQuery);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '100px', padding: '0.5rem 1rem' }}
          title="Refresh stats and users"
        >
          <RefreshCw size={15} className={loading || statsLoading ? 'spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Overview Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem'
      }}>
        {/* Total Users */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid rgba(87, 83, 78, 0.12)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Users</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#F1ECE4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C25508' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>
            {statsLoading ? '...' : (stats?.totalUsers ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {stats?.activeUsers ?? 0} active in last 30 days
          </div>
        </div>

        {/* Total Tasks */}
        <div style={{
          background: '#F7F4EE',
          border: '1px solid rgba(87, 83, 78, 0.12)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Global Tasks</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#EAE5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#57534E' }}>
              <CheckSquare size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>
            {statsLoading ? '...' : (stats?.totalTasks ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Across all workspaces & users
          </div>
        </div>

        {/* Total Projects */}
        <div style={{
          background: '#E0F2FE',
          border: '1px solid #BAE6FD',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369A1' }}>Projects</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
              <FolderKanban size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#0C4A6E' }}>
            {statsLoading ? '...' : (stats?.totalProjects ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: '0.25rem' }}>
            Active project boards
          </div>
        </div>

        {/* Total Workspaces */}
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-card)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#047857' }}>Workspaces</span>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Briefcase size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-serif)', color: '#064E3B' }}>
            {statsLoading ? '...' : (stats?.totalWorkspaces ?? 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
            Collaboration hubs
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid rgba(87, 83, 78, 0.12)',
        borderRadius: '20px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        {/* Table Header & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Registered Users ({totalUsers})
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Manage access levels, roles, and account statuses.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  fontSize: '0.875rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(87, 83, 78, 0.2)',
                  background: 'var(--bg-input)',
                  outline: 'none',
                  width: '260px'
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ borderRadius: '100px' }}>
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setSearchQuery(''); fetchUsers(1, ''); }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(87, 83, 78, 0.1)', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem' }}>User</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Joined Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
                    <p>Loading users...</p>
                  </td>
                </tr>
              ) : users && users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <p>No users found matching your search.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u._id === currentUser?._id;
                  const isBusy = actionLoadingId === u._id;

                  return (
                    <tr
                      key={u._id}
                      style={{
                        borderBottom: '1px solid rgba(87, 83, 78, 0.08)',
                        backgroundColor: u.isDeleted ? 'rgba(254, 242, 242, 0.4)' : 'transparent'
                      }}
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            backgroundColor: u.role === 'admin' ? '#FEE2E2' : '#F1ECE4',
                            color: u.role === 'admin' ? '#991B1B' : '#C25508',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0
                          }}>
                            {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{u.name || 'Anonymous User'}</span>
                              {isCurrent && (
                                <span style={{ fontSize: '0.7rem', background: '#EAE5DB', padding: '1px 6px', borderRadius: '4px', color: '#57534E' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {u._id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Mail size={14} color="var(--text-muted)" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <select
                          value={u.role || 'user'}
                          disabled={isCurrent || isBusy || u.isDeleted}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '100px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: isCurrent || u.isDeleted ? 'not-allowed' : 'pointer',
                            backgroundColor: u.role === 'admin' ? '#FEE2E2' : '#F1ECE4',
                            color: u.role === 'admin' ? '#991B1B' : '#57534E',
                            border: '1px solid transparent',
                            outline: 'none'
                          }}
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {u.isDeleted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                            <UserX size={13} /> Deactivated
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            <UserCheck size={13} /> Active
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} />
                          <span>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {!isCurrent && !u.isDeleted && (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={isBusy}
                            onClick={() => handleDeactivate(u)}
                            style={{ color: '#DC2626', fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
                            title="Deactivate User"
                          >
                            {isBusy ? <Loader2 size={14} className="spin" /> : 'Deactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(87, 83, 78, 0.1)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  fetchUsers(p, searchQuery);
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages || loading}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  fetchUsers(p, searchQuery);
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
