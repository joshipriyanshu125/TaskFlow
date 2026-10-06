import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Tag as TagIcon, Plus, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../api';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Done' }
];

const CATEGORIES = [
  'General',
  'Work',
  'Personal',
  'Design',
  'Planning',
  'Engineering',
  'Meetings'
];

export function TaskModal({ task, isOpen, onClose, onSave, workspaces, currentWorkspace, defaultDate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('General');
  const [assigneeId, setAssigneeId] = useState('');
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rewriteText, setRewriteText] = useState('');
  const [rewriteLoading, setRewriteLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentWorkspace?._id) {
      api.getWorkspaceMembers(currentWorkspace._id)
        .then((res) => {
          if (res?.members) setWorkspaceMembers(res.members);
        })
        .catch(() => setWorkspaceMembers([]));
    }
  }, [isOpen, currentWorkspace]);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setCategory(task.category || 'General');
      setAssigneeId(task.assigneeId?._id || task.assigneeId || '');
      setTags(task.tags || (task.labels?.map(l => l.name || l)) || []);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setCategory('General');
      setAssigneeId('');
      setTags([]);
      setTagInput('');
      setDueDate(defaultDate ? new Date(defaultDate).toISOString().split('T')[0] : '');
    }
  }, [task, isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleAddTag = (e) => {
    if (e) e.preventDefault();
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    const taskPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      category,
      assigneeId: assigneeId === 'all' ? 'all' : (assigneeId || undefined),
      tags,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      workspaceId: currentWorkspace?._id || undefined
    };

    try {
      await onSave(taskPayload, task?._id);
      onClose();
    } catch (err) {
      console.error('Save task error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiParse = async () => {
    const desc = description;
    if (!desc.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await api.parseTaskDescription(desc);
      if (res.success) {
        const { title: parsedTitle, description: parsedDesc, dueDate: parsedDueDate, priority: parsedPriority, category: parsedCategory, tags: parsedTags, status: parsedStatus } = res.data;
        setTitle(parsedTitle || title);
        setDescription(parsedDesc || description);
        setDueDate(parsedDueDate ? new Date(parsedDueDate).toISOString().split('T')[0] : '');
        setPriority(parsedPriority || priority);
        setCategory(parsedCategory || category);
        setTags(Array.isArray(parsedTags) ? parsedTags : tags);
        setStatus(parsedStatus || status);
      }
    } catch (err) {
      console.error('AI parse error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRewrite = async () => {
    const text = rewriteText;
    if (!text.trim() || rewriteLoading) return;
    setRewriteLoading(true);
    try {
      const res = await api.rewriteTask(text, {
        title,
        priority,
        tags,
        dueDate
      });
      if (res.success) {
        const { title: parsedTitle, description: parsedDesc, dueDate: parsedDueDate, priority: parsedPriority, tags: parsedTags, category: parsedCategory, status: parsedStatus } = res.data;
        setTitle(parsedTitle || title);
        setDescription(parsedDesc || description);
        setDueDate(parsedDueDate ? new Date(parsedDueDate).toISOString().split('T')[0] : dueDate);
        setPriority(parsedPriority || priority);
        setCategory(parsedCategory || category);
        setTags(Array.isArray(parsedTags) ? parsedTags : tags);
        setStatus(parsedStatus || status);
        setRewriteText('');
      }
    } catch (err) {
      console.error('AI rewrite error:', err);
    } finally {
      setRewriteLoading(false);
    }
  };

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
          maxWidth: '480px',
          padding: '2rem',
          borderRadius: '24px',
          background: '#FFFFFF',
          boxShadow: '0 20px 40px -15px rgba(44, 30, 16, 0.15)',
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
          {task ? 'Edit task' : 'Create task'}
        </h2>

        {/* AI Rewrite Box (only when editing) */}
        {task && (
          <div
            style={{
              backgroundColor: '#FDF3EB',
              border: '1px solid var(--accent-terracotta-border)',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <RefreshCw size={16} color="#C25508" />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Rewrite with AI
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              Describe the task in your own words and tap Update with AI to refresh the title, due date, priority, and tags.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g., Need to review the Q4 budget report and send it to finance by Friday..."
                value={rewriteText}
                onChange={(e) => setRewriteText(e.target.value)}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--accent-terracotta-border)',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
              <button
                type="button"
                onClick={handleRewrite}
                disabled={!rewriteText.trim() || rewriteLoading}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#C25508',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: rewriteLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  minWidth: '110px',
                  justifyContent: 'center'
                }}
              >
                {rewriteLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Update
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Title
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          {/* Description */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Description
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Add details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                backgroundColor: '#FAF8F5',
                border: '1px solid rgba(87, 83, 78, 0.15)',
                fontSize: '0.95rem',
                resize: 'vertical'
              }}
            />
            {description.trim().length > 10 && (
              <button
                type="button"
                onClick={handleAiParse}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#F0EFEA',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: aiLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Loader2 size={14} className="animate-spin" />
                    Parsing...
                  </span>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Parse with AI
                  </>
                )}
              </button>
            )}
          </div>

          {/* Status & Priority Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Status
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  borderRadius: '12px',
                  padding: '0.7rem 1rem',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  fontSize: '0.925rem'
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Priority
              </label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  borderRadius: '12px',
                  padding: '0.7rem 1rem',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  fontSize: '0.925rem'
                }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Assignee Row */}
          <div style={{ display: 'grid', gridTemplateColumns: workspaceMembers.length > 0 ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Category
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  borderRadius: '12px',
                  padding: '0.7rem 1rem',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  fontSize: '0.925rem'
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {workspaceMembers.length > 0 && (
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  Assignee
                </label>
                <select
                  className="form-select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  style={{
                    borderRadius: '12px',
                    padding: '0.7rem 1rem',
                    backgroundColor: '#FAF8F5',
                    border: '1px solid rgba(87, 83, 78, 0.15)',
                    fontSize: '0.925rem'
                  }}
                >
                  <option value="">Unassigned (Myself)</option>
                  <option value="all">Assign to All</option>
                  {workspaceMembers.map((m) => {
                    const u = m.userId;
                    if (!u) return null;
                    return (
                      <option key={u._id} value={u._id}>
                        {u.name || u.email} ({m.role})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Tags
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  padding: '0.7rem 1rem',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  fontSize: '0.925rem'
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddTag}
                style={{
                  borderRadius: '12px',
                  padding: '0.7rem 1.25rem',
                  backgroundColor: '#F0EFEA',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                Add
              </button>
            </div>

            {/* Render Tags Chips */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.785rem',
                      padding: '0.2rem 0.6rem',
                      backgroundColor: '#EAE6E0',
                      borderRadius: '100px',
                      color: 'var(--text-primary)',
                      fontWeight: 600
                    }}
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              Due date
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="Pick a date"
                style={{
                  borderRadius: '12px',
                  padding: '0.7rem 1rem 0.7rem 2.6rem',
                  backgroundColor: '#FAF8F5',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  fontSize: '0.925rem'
                }}
              />
              <CalendarIcon
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '12px',
              backgroundColor: '#C25508',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(194, 85, 8, 0.25)'
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Loader2 size={18} className="animate-spin" /> Saving...
              </span>
            ) : task ? (
              'Save changes'
            ) : (
              'Create task'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
