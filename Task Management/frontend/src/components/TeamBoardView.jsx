import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, UserPlus, Trash2, Mail, Shield } from 'lucide-react';
import { api } from '../api';

export function TeamBoardView({ 
  currentWorkspace, 
  user, 
  onOpenTeamModal, 
  teams: propTeams, 
  loading: propLoading, 
  onFetchTeams 
}) {
  const [internalTeams, setInternalTeams] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);

  // If parent provides teams, use them; otherwise use internal state
  const isControlled = Array.isArray(propTeams);
  const teams = isControlled ? propTeams : internalTeams;
  const loading = typeof propLoading === 'boolean' ? propLoading : internalLoading;

  const fetchTeams = useCallback(async () => {
    if (onFetchTeams) {
      onFetchTeams();
      return;
    }
    if (!currentWorkspace?._id) return;
    setInternalLoading(true);
    try {
      const res = await api.getTeams(currentWorkspace._id);
      if (res?.teams) setInternalTeams(res.teams);
    } catch (err) {
      console.warn('Fetch teams error:', err.message);
    } finally {
      setInternalLoading(false);
    }
  }, [currentWorkspace, onFetchTeams]);

  useEffect(() => {
    if (!isControlled) {
      fetchTeams();
    }
  }, [isControlled, fetchTeams]);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Team Board
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Manage your teams, invite members by email, and collaborate in real-time.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => onOpenTeamModal?.('create')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 600, borderRadius: '12px', backgroundColor: '#C25508', color: '#FFFFFF', border: 'none', cursor: 'pointer'
          }}
        >
          <Users size={18} /> Open Team Management
        </button>
      </div>

      {loading && teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <p>Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <Users size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No teams yet</h3>
          <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>Create a team to start collaborating with your teammates.</p>
          <button
            className="btn btn-primary"
            onClick={() => onOpenTeamModal?.('create')}
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontWeight: 600, borderRadius: '12px', backgroundColor: '#C25508', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={16} style={{ marginRight: '0.35rem' }} /> Create Your First Team
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {teams.map((team) => {
            const leadName = typeof team.leadId === 'object' && team.leadId ? (team.leadId.name || team.leadId.email) : null;
            return (
              <div
                key={team._id}
                onClick={() => onOpenTeamModal?.('list')}
                style={{
                  border: '1px solid rgba(87, 83, 78, 0.12)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{team.name}</h3>
                  {leadName ? (
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#FDF3EB', color: '#C25508', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                      <Shield size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} /> {leadName} (Lead)
                    </span>
                  ) : team.leadId ? (
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#FDF3EB', color: '#C25508', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                      <Shield size={10} style={{ verticalAlign: 'middle', marginRight: '2px' }} /> Lead
                    </span>
                  ) : null}
                </div>
                {team.description && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>{team.description}</p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {team.members?.map((m, idx) => {
                    const memberObj = typeof m.userId === 'object' && m.userId ? m.userId : (m.userId === user?._id ? user : null);
                    const name = memberObj?.name || memberObj?.email || (typeof m.userId === 'string' && m.userId.length === 24 ? 'Member' : 'Unknown');
                    return (
                      <div
                        key={m.userId?._id || m.userId || idx}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.25rem 0.6rem', backgroundColor: '#F1ECE4', borderRadius: '100px', color: 'var(--text-primary)'
                        }}
                      >
                        <Users size={10} />
                        <span style={{ fontWeight: 500 }}>{name}</span>
                        {m.role === 'lead' && <span style={{ fontSize: '0.7rem', color: '#C25508', fontWeight: 700 }}>(Lead)</span>}
                      </div>
                    );
                  })}
                  {team.invitedEmails?.map((inv, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.25rem 0.6rem', backgroundColor: '#E0F2FE', borderRadius: '100px', color: '#0369A1'
                      }}
                    >
                      <Mail size={10} />
                      <span>{inv.email} (invited)</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

