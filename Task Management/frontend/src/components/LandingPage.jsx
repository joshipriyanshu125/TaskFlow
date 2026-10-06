import React, { useState } from 'react';
import { 
  CheckCircle, 
  Filter, 
  Calendar, 
  GripVertical, 
  ArrowRight, 
  Sparkles, 
  Check, 
  ShieldCheck, 
  Zap, 
  Layers,
  Plus,
  Trash2,
  Clock,
  TrendingUp
} from 'lucide-react';

export function LandingPage({ onOpenAuth }) {
  // Live interactive workspace showcase
  const [tasks, setTasks] = useState([
    { id: 1, title: '🚀 Production deployment & database migration', priority: 'urgent', category: 'Engineering', due: 'Today', completed: false },
    { id: 2, title: '🎨 Refine dashboard dark theme & calendar view', priority: 'high', category: 'Design', due: 'Tomorrow', completed: false },
    { id: 3, title: '🔐 Implement secure password reset & SMTP flow', priority: 'urgent', category: 'Security', due: 'Oct 8', completed: true },
    { id: 4, title: '⚡ Multi-user real-time WebSocket sync engine', priority: 'medium', category: 'Backend', due: 'Oct 10', completed: true },
    { id: 5, title: '📨 Automated email digest & daily task summary', priority: 'low', category: 'Automation', due: 'Oct 14', completed: false }
  ]);

  const [activeTab, setActiveTab] = useState('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (e, id) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now(),
      title: newTaskTitle.trim(),
      priority: 'high',
      category: 'Design',
      due: 'This week',
      completed: false
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'active') return !t.completed;
    if (activeTab === 'done') return t.completed;
    return true;
  });

  return (
    <main>
      {/* 1. Hero Section */}
      <section className="hero-section">
        {/* Pill Badge */}
        <div className="badge-pill" style={{ marginBottom: '1.25rem' }}>
          <Sparkles size={14} color="#C25508" />
          <span>Free for individuals. Ready for teams.</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          Organize your work, <span className="hero-highlight">beautifully.</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          TaskFlow is a calm, focused task manager that helps individuals and teams
          stay on top of deadlines, priorities, and progress — without the clutter.
        </p>

        {/* Hero Actions */}
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => onOpenAuth('signup')}>
            <span>Get started free</span>
            <ArrowRight size={18} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => onOpenAuth('signin')}>
            <span>Sign in</span>
          </button>
        </div>
      </section>

      {/* 2. Everything You Need - 4 Features Grid */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Everything you need</h2>
          <p className="section-subtitle">A complete toolkit for managing tasks your way.</p>
        </div>

        <div className="features-grid">
          {/* Feature 1: CRUD Tasks */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ backgroundColor: '#FDF2E9', color: '#C25508' }}>
              <CheckCircle size={22} strokeWidth={2.2} />
            </div>
            <h3 className="feature-card-title">CRUD tasks</h3>
            <p className="feature-card-desc">
              Create, read, update, and delete tasks with a clean, fast interface.
            </p>
          </div>

          {/* Feature 2: Smart Filtering */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
              <Filter size={22} strokeWidth={2.2} />
            </div>
            <h3 className="feature-card-title">Smart filtering</h3>
            <p className="feature-card-desc">
              Filter by status, priority, category, due date, and keyword search.
            </p>
          </div>

          {/* Feature 3: Deadlines */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
              <Calendar size={22} strokeWidth={2.2} />
            </div>
            <h3 className="feature-card-title">Deadlines</h3>
            <p className="feature-card-desc">
              Set due dates and spot urgent work with warm, color-coded cues.
            </p>
          </div>

          {/* Feature 4: Drag & drop */}
          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}>
              <GripVertical size={22} strokeWidth={2.2} />
            </div>
            <h3 className="feature-card-title">Drag & drop</h3>
            <p className="feature-card-desc">
              Reorder tasks instantly to match your priorities and workflow.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Built for Focus Showcase Section */}
      <section className="focus-section">
        <div className="focus-card">
          <div>
            <h2 className="section-title" style={{ textAlign: 'left', marginBottom: '1rem' }}>
              Built for focus.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '1.75rem' }}>
              No noisy notifications. No overwhelming boards. Just you, your team, and the work that matters — stored safely in the cloud and ready anywhere.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
                <span>Keyboard-friendly navigation & fast shortcuts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
                <span>Instant cloud synchronization with MongoDB backend</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--accent-terracotta-light)', color: 'var(--accent-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
                <span>Workspace isolation & collaborative team sharing</span>
              </div>
            </div>
          </div>

          {/* Live Interactive Workspace Showcase */}
          <div className="task-preview-box">
            {/* Top Bar with Project Info & Filters */}
            <div className="preview-top-bar">
              <div className="preview-project-badge">
                <span className="preview-live-dot" />
                <span>Sprint 4.2 • Core Release</span>
              </div>

              <div className="preview-filter-tabs">
                <button 
                  type="button"
                  className={`preview-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All ({tasks.length})
                </button>
                <button 
                  type="button"
                  className={`preview-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  Active ({tasks.length - completedCount})
                </button>
                <button 
                  type="button"
                  className={`preview-tab-btn ${activeTab === 'done' ? 'active' : ''}`}
                  onClick={() => setActiveTab('done')}
                >
                  Done ({completedCount})
                </button>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="preview-progress-box">
              <div className="preview-progress-info">
                <span>Sprint completion</span>
                <span>{progressPercent}% ({completedCount}/{tasks.length})</span>
              </div>
              <div className="preview-progress-track">
                <div 
                  className="preview-progress-bar" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Task List */}
            <div className="preview-task-list">
              {filteredTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No tasks in this view
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`task-preview-item ${task.completed ? 'completed' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="task-preview-left">
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className={`task-preview-title ${task.completed ? 'completed' : ''}`}>
                        {task.title}
                      </span>
                    </div>

                    <div className="task-preview-right">
                      {task.due && (
                        <span className="preview-due-tag">
                          <Clock size={12} />
                          {task.due}
                        </span>
                      )}
                      <span className={`tag-priority-${task.priority}`}>
                        {task.priority}
                      </span>
                      <span className={`tag-category tag-cat-${task.category}`}>
                        {task.category}
                      </span>
                      <button 
                        type="button"
                        className="preview-delete-btn"
                        title="Delete task"
                        onClick={(e) => deleteTask(e, task.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Interactive Add Input */}
            <form onSubmit={handleAddTask} className="preview-add-form">
              <input
                type="text"
                className="preview-add-input"
                placeholder="Try adding a task (e.g. 'Deploy staging build')..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <button type="submit" className="preview-add-btn">
                <Plus size={15} />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
