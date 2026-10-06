import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, UserPlus, Trash2, Users, Mail, Check, AlertCircle, User } from 'lucide-react';
import { api } from '../api';

export function TeamModal({ 
  isOpen, 
  onClose, 
  currentWorkspace, 
  onTeamCreated, 
  onTeamUpdated, 
  onTeamDeleted,
  onShowToast,
  initialTab = 'list',
  teams: propTeams
}) {
  const [internalTeams, setInternalTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'list'); // 'list' | 'create' | 'invite'
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isControlled = Array.isArray(propTeams);
  const teams = isControlled ? propTeams : internalTeams;

  const fetchTeams = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    try {
      const res = await api.getTeams(currentWorkspace._id);
      if (res?.teams) setInternalTeams(res.teams);
    } catch (err) {
      console.warn('Fetch teams error:', err.message);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'list');
      setErrorMsg('');
      setSuccessMsg('');
      if (!isControlled) {
        fetchTeams();
      }
    }
  }, [isOpen, initialTab, isControlled, fetchTeams]);

  const resetForm = () => {
    setTeamName('');
    setTeamDescription('');
    setInviteEmail('');
    setInviteRole('member');
    setErrorMsg('');
    setSuccessMsg('');
    setActiveTeam(null);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim() || !currentWorkspace?._id) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.createTeam(currentWorkspace._id, teamName.trim(), teamDescription.trim());
      if (res?.team) {
        if (!isControlled) {
          setInternalTeams((prev) => [...prev, res.team]);
        }
        setSuccessMsg('Team created successfully!');
        resetForm();
        setActiveTab('list');
        if (onTeamCreated) onTeamCreated(res.team);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam?._id) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.inviteToTeam(activeTeam._id, inviteEmail.trim(), inviteRole);
      if (res?.team) {
        if (!isControlled) {
          setInternalTeams((prev) => prev.map((t) => (t._id === res.team._id ? res.team : t)));
        }
        setActiveTeam(res.team);
        setSuccessMsg(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail('');
        if (onTeamUpdated) onTeamUpdated(res.team);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!activeTeam?._id) return;
    if (!window.confirm('Remove this member from the team?')) return;

    try {
      await api.removeTeamMember(activeTeam._id, userId);
      const updatedMembers = (activeTeam.members || []).filter((m) => (m.userId?._id || m.userId) !== userId);
      const updatedTeam = { ...activeTeam, members: updatedMembers };

      if (!isControlled) {
        setInternalTeams((prev) =>
          prev.map((t) => (t._id === activeTeam._id ? updatedTeam : t))
        );
      }
      setActiveTeam(updatedTeam);
      if (onTeamUpdated) onTeamUpdated(updatedTeam);
      if (onShowToast) onShowToast('Member removed from team.', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to remove member.', 'error');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Delete this team? This cannot be undone.')) return;
    try {
      await api.deleteTeam(teamId);
      if (!isControlled) {
        setInternalTeams((prev) => prev.filter((t) => t._id !== teamId));
      }
      if (activeTeam?._id === teamId) {
        setActiveTeam(null);
        setActiveTab('list');
      }
      if (onTeamDeleted) onTeamDeleted(teamId);
      if (onShowToast) onShowToast('Team deleted.', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Failed to delete team.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          padding: '2rem',
          borderRadius: '24px',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-modal)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Title */}
        <h2
          className="font-serif"
          style={{
            fontSize: '1.9rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}
        >
          Team Management
        </h2>

        {/* Success / Error Alerts */}
        {successMsg && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #6EE7B7',
              color: '#065F46',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Check size={16} /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #F87171',
              color: '#991B1B',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(87, 83, 78, 0.12)', marginBottom: '1.5rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === 'list' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.5rem 0.75rem',
              fontWeight: activeTab === 'list' ? 700 : 500,
              color: activeTab === 'list' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}
            onClick={() => { setActiveTab('list'); resetForm(); }}
          >
            <Users size={14} style={{ marginRight: '0.35rem' }} /> Teams
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === 'create' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.5rem 0.75rem',
              fontWeight: activeTab === 'create' ? 700 : 500,
              color: activeTab === 'create' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}
            onClick={() => { setActiveTab('create'); resetForm(); }}
          >
            <Plus size={14} style={{ marginRight: '0.35rem' }} /> New Team
          </button>
          {activeTeam && (
            <button
              className="btn btn-ghost btn-sm"
              style={{
                borderBottom: activeTab === 'invite' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
                borderRadius: 0,
                padding: '0.5rem 0.75rem',
                fontWeight: activeTab === 'invite' ? 700 : 500,
                color: activeTab === 'invite' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
                fontSize: '0.85rem'
              }}
              onClick={() => { setActiveTab('invite'); resetForm(); }}
            >
              <UserPlus size={14} style={{ marginRight: '0.35rem' }} /> Invite
            </button>
          )}
        </div>

        {/* Tab: Team List */}
        {activeTab === 'list' && (
          <div>
            {teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                <Users size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>No teams yet. Create one to get started!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {teams.map((team) => (
                  <div
                    key={team._id}
                    style={{
                      border: '1px solid rgba(87, 83, 78, 0.12)',
                      borderRadius: '14px',
                      padding: '1rem',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    onClick={() => { setActiveTeam(team); setActiveTab('invite'); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{team.name}</h3>
                        {team.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{team.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team._id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#DC2626',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete team (owner only)"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {team.members?.map((m) => (
                        <div
                          key={m.userId?._id || m.userId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                            padding: '0.2rem 0.5rem',
                            backgroundColor: '#F1ECE4',
                            borderRadius: '100px',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <User size={10} />
                          {m.userId?.name || m.userId?.email || 'Unknown'}
                          {m.role === 'lead' && <span style={{ fontSize: '0.7rem', color: 'var(--accent-terracotta)', fontWeight: 700 }}>(Lead)</span>}
                        </div>
                      ))}
                      {team.invitedEmails?.map((inv, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                            padding: '0.2rem 0.5rem',
                            backgroundColor: '#E0F2FE',
                            borderRadius: '100px',
                            color: '#0369A1'
                          }}
                        >
                          <Mail size={10} />
                          {inv.email} (invited)
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Create Team */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateTeam}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Team Name *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Frontend Squad, QA Team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                autoFocus
                style={{
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Description (optional)
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="What is this team responsible for?"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                style={{
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  fontSize: '0.95rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('list')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </form>
        )}

        {/* Tab: Invite to Team */}
        {activeTab === 'invite' && activeTeam && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{activeTeam.name}</h3>
              {activeTeam.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{activeTeam.description}</p>
              )}
            </div>

            {/* Current Members */}
            {activeTeam.members && activeTeam.members.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  Members ({activeTeam.members.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {activeTeam.members.map((m) => (
                    <div
                      key={m.userId?._id || m.userId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#F8F6F0',
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#E4DDD2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                          {(m.userId?.name || m.userId?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {m.userId?.name || m.userId?.email}
                        </span>
                        {m.role === 'lead' && (
                          <span style={{ fontSize: '0.7rem', backgroundColor: '#FDF3EB', color: 'var(--accent-terracotta)', padding: '1px 6px', borderRadius: '100px', fontWeight: 700 }}>
                            Lead
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.userId?._id || m.userId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#DC2626',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Remove member (owner only)"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Form */}
            <form onSubmit={handleInviteMember} style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Invite someone to <strong>{activeTeam.name}</strong> by email. They'll join automatically when they sign in with that email.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="colleague@taskflow.dev"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#FAF8F5',
                    border: '1px solid rgba(87, 83, 78, 0.15)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  Role
                </label>
                <select
                  className="form-select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    borderRadius: '12px',
                    padding: '0.7rem 1rem',
                    backgroundColor: '#FAF8F5',
                    border: '1px solid rgba(87, 83, 78, 0.15)',
                    fontSize: '0.925rem'
                  }}
                >
                  <option value="member">Member (Can edit tasks)</option>
                  <option value="lead">Lead (Team lead)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('list')}>
                  Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
