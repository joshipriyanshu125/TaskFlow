import React, { useState } from 'react';
import { X, FolderPlus, UserPlus, Loader2, Check, Trash2 } from 'lucide-react';
import { api } from '../api';

export function WorkspaceModal({ isOpen, onClose, onWorkspaceCreated, currentWorkspace, initialTab = 'create' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'create' | 'invite'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMembers = React.useCallback(async () => {
    if (!currentWorkspace?._id) return;
    try {
      const res = await api.getWorkspaceMembers(currentWorkspace._id);
      if (res?.members) setMembers(res.members);
    } catch (e) {
      console.error('Workspace members could not be loaded:', e);
      setErrorMsg(e.message || 'Workspace members could not be loaded.');
    }
  }, [currentWorkspace]);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSuccessMsg('');
      setErrorMsg('');
      fetchMembers();
    }
  }, [isOpen, initialTab, fetchMembers]);

  if (!isOpen) return null;

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Workspace name is required.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.createWorkspace(name.trim(), description.trim());
      if (res?.workspace) {
        setSuccessMsg('Workspace created successfully!');
        setName('');
        setDescription('');
        // Call the callback immediately before closing
        if (onWorkspaceCreated) {
          onWorkspaceCreated(res.workspace);
        }
        // Close after a brief delay to show success message
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err) {
      console.error('Workspace creation error:', err);
      setErrorMsg(err.message || 'Failed to create workspace.');
      setLoading(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentWorkspace?._id) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.inviteMember(currentWorkspace._id, inviteEmail.trim(), inviteRole);
      if (res?.alreadyRegistered === false) {
        // Non-registered user — invite email sent
        setSuccessMsg(`📧 Invitation email sent to ${inviteEmail}! They'll be added once they sign up.`);
      } else {
        // Registered user — added directly + email sent
        setSuccessMsg(res?.message || `✅ ${inviteEmail} has been added to the workspace!`);
        await fetchMembers();
      }
      setInviteEmail('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const memberUserId = member.userId?._id;
    if (!currentWorkspace?._id || !memberUserId) return;

    const memberName = member.userId?.name || member.userId?.email || 'this member';
    if (!window.confirm(`Remove ${memberName} from this workspace?`)) return;

    setRemovingMemberId(memberUserId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.removeWorkspaceMember(currentWorkspace._id, memberUserId);
      setMembers((current) => current.filter((item) => item.userId?._id !== memberUserId));
      setSuccessMsg(`${memberName} was removed from the workspace.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove workspace member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const ownerId = typeof currentWorkspace?.ownerId === 'string'
    ? currentWorkspace.ownerId
    : currentWorkspace?.ownerId?._id;
  const isWorkspaceOwner = currentWorkspace?.currentUserRole === 'owner' || ownerId === api.user?._id;
  const canManageMembers = isWorkspaceOwner || currentWorkspace?.currentUserRole === 'admin';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', padding: '0.4rem', borderRadius: '50%' }}
        >
          <X size={18} />
        </button>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(87, 83, 78, 0.12)', marginBottom: '1.5rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === 'create' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.5rem 0.2rem',
              fontWeight: activeTab === 'create' ? 700 : 500,
              color: activeTab === 'create' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('create')}
          >
            <FolderPlus size={16} /> New Workspace
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === 'invite' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.5rem 0.2rem',
              fontWeight: activeTab === 'invite' ? 700 : 500,
              color: activeTab === 'invite' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('invite')}
          >
            <UserPlus size={16} /> Invite Members
          </button>
        </div>

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
              gap: '0.5rem',
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
              marginBottom: '1rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Create Workspace */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateWorkspace}>
            <div className="form-group">
              <label className="form-label">Workspace Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Design Studio, Engineering Squad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="What is this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Invite Member */}
        {activeTab === 'invite' && (
          <div>
            <form onSubmit={handleInviteMember} style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Invite anyone to <strong>{currentWorkspace?.name || 'this workspace'}</strong> by email. If they're not registered yet, they'll receive a sign-up link.
              </p>

              <div className="form-group">
                <label className="form-label">Teammate Email *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="colleague@taskflow.dev"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Role</label>
                <select className="form-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="member">Member (Can edit tasks)</option>
                  {canManageMembers && <option value="admin">Admin (Can manage settings)</option>}
                  <option value="guest">Guest (Read-only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>

            {/* Current Workspace Members List */}
            {members && members.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(87, 83, 78, 0.12)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  Current Workspace Members ({members.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto' }}>
                  {members.map((m) => (
                    (() => {
                      const memberUserId = m.userId?._id;
                      const isOwnerMember = m.role === 'owner' || memberUserId === ownerId;
                      const canRemoveMember = canManageMembers
                        && !isOwnerMember
                        && (isWorkspaceOwner || m.role !== 'admin');

                      return (
                        <div
                          key={m._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.4rem 0.6rem',
                            backgroundColor: '#F8F6F0',
                            borderRadius: '8px',
                            fontSize: '0.825rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <div style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', backgroundColor: '#E4DDD2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                              {(m.userId?.name || m.userId?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.userId?.name || m.userId?.email}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '100px', backgroundColor: '#EAE6DF', textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {m.role}
                            </span>
                            {canRemoveMember && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveMember(m)}
                                disabled={removingMemberId === memberUserId}
                                aria-label={`Remove ${m.userId?.name || m.userId?.email || 'member'} from workspace`}
                                title="Remove from workspace"
                                style={{ color: '#B42318', padding: '0.2rem' }}
                              >
                                {removingMemberId === memberUserId
                                  ? <Loader2 size={15} className="animate-spin" />
                                  : <Trash2 size={15} />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
