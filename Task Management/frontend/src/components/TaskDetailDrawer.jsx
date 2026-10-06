import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Tag, 
  Flag, 
  Plus, 
  Trash2, 
  Send, 
  MessageSquare, 
  History, 
  CheckSquare2, 
  Clock, 
  User 
} from 'lucide-react';
import { api } from '../api';

export function TaskDetailDrawer({ task, isOpen, onClose, onUpdateTask, onDeleteTask }) {
  const [activeTab, setActiveTab] = useState('subtasks'); // 'subtasks' | 'comments' | 'activity'
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setSubtasks(task.subtasks || []);
      fetchComments();
      fetchActivities();
    }
  }, [task, isOpen]);

  const fetchComments = async () => {
    if (!task?._id) return;
    try {
      const res = await api.getComments(task._id);
      if (res?.comments) setComments(res.comments);
    } catch (e) {
      // ignore
    }
  };

  const fetchActivities = async () => {
    if (!task?._id) return;
    try {
      const res = await api.getActivities(task._id);
      if (res?.activities) setActivities(res.activities);
    } catch (e) {
      // ignore
    }
  };

  if (!isOpen || !task) return null;

  // Subtask Handlers
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      const res = await api.addSubtask(task._id, { title: newSubtaskTitle.trim() });
      if (res?.subtasks) {
        setSubtasks(res.subtasks);
        onUpdateTask({ ...task, subtasks: res.subtasks });
      }
      setNewSubtaskTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (subtaskId, currentCompleted) => {
    try {
      const res = await api.updateSubtask(task._id, subtaskId, { isCompleted: !currentCompleted });
      if (res?.subtasks) {
        setSubtasks(res.subtasks);
        onUpdateTask({ ...task, subtasks: res.subtasks });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await api.deleteSubtask(task._id, subtaskId);
      const updated = subtasks.filter((s) => s._id !== subtaskId);
      setSubtasks(updated);
      onUpdateTask({ ...task, subtasks: updated });
    } catch (err) {
      console.error(err);
    }
  };

  // Comment Handlers
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await api.addComment(task._id, newComment.trim());
      if (res?.comment) {
        setComments([...comments, res.comment]);
        setNewComment('');
        fetchActivities();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = subtasks.filter((s) => s.isCompleted).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`tag-priority-${task.priority}`}>{task.priority}</span>
              <span className={`tag-category tag-cat-${task.category}`}>{task.category}</span>
              {task.assigneeId && (
                <span style={{ fontSize: '0.75rem', background: '#F1ECE4', color: '#57534E', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <User size={12} /> {task.assigneeId.name || task.assigneeId.email || 'Assigned'}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Status: <strong>{task.status.replace('_', ' ')}</strong>
              </span>
            </div>
            <h2 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {task.title}
            </h2>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ borderRadius: '50%', padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Task Description */}
        {task.description && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#FAF8F5',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(87, 83, 78, 0.08)',
              fontSize: '0.925rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            {task.description}
          </div>
        )}

        {/* Tabs: Subtasks, Comments, Activity */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(87, 83, 78, 0.12)', gap: '1.5rem', marginBottom: '1.25rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === 'subtasks' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.5rem 0.2rem',
              fontWeight: activeTab === 'subtasks' ? 700 : 500,
              color: activeTab === 'subtasks' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('subtasks')}
          >
            Subtasks ({completedCount}/{subtasks.length})
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === 'comments' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.5rem 0.2rem',
              fontWeight: activeTab === 'comments' ? 700 : 500,
              color: activeTab === 'comments' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('comments')}
          >
            Comments ({comments.length})
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              borderBottom: activeTab === 'activity' ? '2px solid var(--accent-terracotta)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.5rem 0.2rem',
              fontWeight: activeTab === 'activity' ? 700 : 500,
              color: activeTab === 'activity' ? 'var(--accent-terracotta)' : 'var(--text-secondary)',
            }}
            onClick={() => setActiveTab('activity')}
          >
            Activity Audit
          </button>
        </div>

        {/* Tab Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {/* TAB 1: Subtasks */}
          {activeTab === 'subtasks' && (
            <div>
              {/* Progress Bar */}
              {subtasks.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    <span>Checklist Progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#E7E2D9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        backgroundColor: progressPercent === 100 ? '#10B981' : 'var(--accent-terracotta)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Subtasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {subtasks.map((st) => (
                  <div
                    key={st._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(87, 83, 78, 0.1)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={st.isCompleted}
                        onChange={() => handleToggleSubtask(st._id, st.isCompleted)}
                      />
                      <span style={{ fontSize: '0.9rem', textDecoration: st.isCompleted ? 'line-through' : 'none', color: st.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {st.title}
                      </span>
                    </label>

                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                      onClick={() => handleDeleteSubtask(st._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {subtasks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No subtasks yet. Break this task into smaller steps below!
                  </div>
                )}
              </div>

              {/* Add Subtask Form */}
              <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '0.6rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+ Add a subtask item..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }}>
                  Add
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Comments */}
          {activeTab === 'comments' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem', maxHeight: '300px', overflowY: 'auto' }}>
                {comments.map((c) => (
                  <div
                    key={c._id}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#FAF8F5',
                      border: '1px solid rgba(87, 83, 78, 0.08)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {c.authorId?.name || 'Teammate'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.885rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.content}</p>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No comments on this task yet. Start the conversation!
                  </div>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.6rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.5rem 1rem' }}>
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Activity Audit */}
          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {activities.map((act) => (
                <div
                  key={act._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    backgroundColor: '#FAF8F5',
                    borderRadius: '8px',
                  }}
                >
                  <Clock size={14} color="var(--accent-terracotta)" />
                  <span>
                    <strong>{act.userId?.name || 'User'}</strong> {act.action} this task on {new Date(act.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}

              {activities.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Activity history will appear here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(87, 83, 78, 0.08)' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: '#DC2626' }}
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this task?')) {
                onDeleteTask(task._id);
                onClose();
              }
            }}
          >
            <Trash2 size={15} /> Delete Task
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try {
                await onUpdateTask({ ...task, status: 'completed' });
                onClose();
              } catch (err) {
                console.error('Mark complete error:', err);
              }
            }}
          >
            Mark as Completed
          </button>

          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
