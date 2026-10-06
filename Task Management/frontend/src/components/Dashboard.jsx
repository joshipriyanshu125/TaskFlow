import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  List, 
  Circle, 
  AlertCircle, 
  ArrowRightCircle, 
  CheckCircle2, 
  GripVertical, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Clock,
  Trash2,
  Edit3,
  User as UserIcon,
  UserPlus
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export function Dashboard({ 
  tasks, 
  onToggleTask, 
  onOpenNewTask, 
  onEditTask, 
  onOpenTaskDetail, 
  onDeleteTask, 
  onReorderTasks,
  onOpenWorkspaceModal,
  currentWorkspace,
  user
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'calendar'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('my_order');
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Analytics Computation
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'done').length;
    return { total, todo, inProgress, completed };
  }, [tasks]);

  // Categories & Tags extracted from tasks
  const availableCategories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [tasks]);

  const availableTags = useMemo(() => {
    const tagSet = new Set();
    tasks.forEach((t) => {
      (t.tags || []).forEach((tag) => tagSet.add(tag));
      (t.labels || []).forEach((l) => tagSet.add(l.name || l));
    });
    return ['all', ...Array.from(tagSet)];
  }, [tasks]);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = task.title?.toLowerCase().includes(query);
        const matchDesc = task.description?.toLowerCase().includes(query);
        const matchCat = task.category?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed') {
          if (task.status !== 'completed' && task.status !== 'done') return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // Priority
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Category
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;

      // Tag
      if (tagFilter !== 'all') {
        const taskTags = task.tags || task.labels?.map((l) => l.name || l) || [];
        if (!taskTags.includes(tagFilter)) return false;
      }

      return true;
    });

    // Sorting
    if (sortOrder === 'due_date') {
      result.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    } else if (sortOrder === 'priority') {
      const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
      result.sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));
    } else if (sortOrder === 'alphabetical') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // 'my_order' (position or creation)
      result.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter, tagFilter, sortOrder]);

  // Drag & Drop handlers
  const handleDragStart = (e, id) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!id) return;

    const sourceIndex = tasks.findIndex((t) => t._id === id);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;

    const reordered = [...tasks];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const updatedWithPosition = reordered.map((task, idx) => ({
      ...task,
      position: idx
    }));

    onReorderTasks(updatedWithPosition);
    setDraggedTaskId(null);
  };

  // Helper for due date label
  const formatDueDateLabel = (dateStr) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(target);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calendar calculations
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as first day (0 = Mon, ..., 6 = Sun)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const totalDays = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const dateObj = new Date(year, month - 1, d);
      days.push({ dayNumber: d, date: dateObj, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateObj = new Date(year, month, i);
      days.push({ dayNumber: i, date: dateObj, isCurrentMonth: true });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const dateObj = new Date(year, month + 1, i);
      days.push({ dayNumber: i, date: dateObj, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Check if a date is today
  const isTodayDate = (dateObj) => {
    const now = new Date();
    return (
      dateObj.getDate() === now.getDate() &&
      dateObj.getMonth() === now.getMonth() &&
      dateObj.getFullYear() === now.getFullYear()
    );
  };

  // Get tasks matching a specific calendar date
  const getTasksForDate = (dateObj) => {
    const dateStr = dateObj.toLocaleDateString('en-CA');
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const tStr = new Date(t.dueDate).toLocaleDateString('en-CA');
      return tStr === dateStr;
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' }}>
      {/* 1. Dashboard Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1
            className="font-serif"
            style={{
              fontSize: '2.75rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              marginBottom: '0.4rem'
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Organize your day, one task at a time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onOpenWorkspaceModal?.('invite')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(87, 83, 78, 0.2)',
              color: 'var(--text-primary)',
              boxShadow: '0 2px 6px rgba(44, 30, 16, 0.04)'
            }}
          >
            <UserPlus size={17} color="#C25508" /> Invite Teammates
          </button>

          <button
            className="btn btn-primary"
            onClick={() => onOpenNewTask()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.75rem 1.4rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: '12px',
              backgroundColor: '#C25508',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 12px rgba(194, 85, 8, 0.25)'
            }}
          >
            <Plus size={18} strokeWidth={2.5} /> New task
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        {/* Card 1: Total tasks */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            padding: '1.4rem 1.5rem',
            border: '1px solid rgba(87, 83, 78, 0.12)',
            boxShadow: '0 2px 8px rgba(44, 30, 16, 0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Total tasks
            </div>
            <div className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {stats.total}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#FAF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Circle size={22} color="#57534E" strokeWidth={2} />
          </div>
        </div>

        {/* Card 2: To do */}
        <div
          style={{
            backgroundColor: '#E5E0D8',
            borderRadius: '18px',
            padding: '1.4rem 1.5rem',
            boxShadow: '0 2px 8px rgba(44, 30, 16, 0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', color: '#44403C', fontWeight: 600, marginBottom: '0.5rem' }}>
              To do
            </div>
            <div className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1C1917', lineHeight: 1 }}>
              {stats.todo}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#D8D2C8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} color="#292524" strokeWidth={2.2} />
          </div>
        </div>

        {/* Card 3: In progress */}
        <div
          style={{
            backgroundColor: '#2EC5E8',
            borderRadius: '18px',
            padding: '1.4rem 1.5rem',
            boxShadow: '0 2px 8px rgba(44, 30, 16, 0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', color: '#0C4A6E', fontWeight: 600, marginBottom: '0.5rem' }}>
              In progress
            </div>
            <div className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#082F49', lineHeight: 1 }}>
              {stats.inProgress}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#22B3D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRightCircle size={22} color="#082F49" strokeWidth={2.2} />
          </div>
        </div>

        {/* Card 4: Done */}
        <div
          style={{
            backgroundColor: '#68C27E',
            borderRadius: '18px',
            padding: '1.4rem 1.5rem',
            boxShadow: '0 2px 8px rgba(44, 30, 16, 0.03)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start'
          }}
        >
          <div>
            <div style={{ fontSize: '0.875rem', color: '#14532D', fontWeight: 600, marginBottom: '0.5rem' }}>
              Done
            </div>
            <div className="font-serif" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#052E16', lineHeight: 1 }}>
              {stats.completed}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#58B26E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} color="#052E16" strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* 3. View Switcher & Toolbar */}
      <div style={{ marginBottom: '1.5rem' }}>
        {/* View Toggle Tabs */}
        <div style={{ display: 'inline-flex', backgroundColor: '#EFECE6', padding: '0.3rem', borderRadius: '14px', marginBottom: '1.25rem', gap: '0.25rem' }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: activeTab === 'list' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <List size={16} /> List
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              backgroundColor: activeTab === 'calendar' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            <CalendarIcon size={16} /> Calendar
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              width: '100%'
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '1.1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1.1rem 0.75rem 2.8rem',
                borderRadius: '100px',
                border: '1px solid rgba(87, 83, 78, 0.15)',
                backgroundColor: '#FAF8F5',
                fontSize: '0.925rem',
                outline: 'none',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Filter Pills Row */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status Filter */}
            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  appearance: 'none',
                  padding: '0.5rem 2rem 0.5rem 1rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FAF8F5',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All status</option>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Done</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>

            {/* Priority Filter */}
            <div style={{ position: 'relative' }}>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  appearance: 'none',
                  padding: '0.5rem 2rem 0.5rem 1rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FAF8F5',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>

            {/* Category Filter */}
            <div style={{ position: 'relative' }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  appearance: 'none',
                  padding: '0.5rem 2rem 0.5rem 1rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FAF8F5',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All category</option>
                {availableCategories.filter((c) => c !== 'all').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>

            {/* Tag Filter */}
            <div style={{ position: 'relative' }}>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                style={{
                  appearance: 'none',
                  padding: '0.5rem 2rem 0.5rem 1rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FAF8F5',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All tag</option>
                {availableTags.filter((t) => t !== 'all').map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>

            {/* Sort Order */}
            <div style={{ position: 'relative' }}>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  appearance: 'none',
                  padding: '0.5rem 2rem 0.5rem 1rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FAF8F5',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="my_order">⇅ My order</option>
                <option value="due_date">Due date</option>
                <option value="priority">Priority</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN VIEW CONTENT */}

      {/* VIEW A: LIST VIEW (Matching Screenshot 1) */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, idx) => {
              const isCompleted = task.status === 'completed' || task.status === 'done';
              const dueLabel = formatDueDateLabel(task.dueDate);

              // Priority style
              const priorityColors = {
                urgent: { bg: '#FEE2E2', text: '#991B1B' },
                high: { bg: '#C25508', text: '#FFFFFF' },
                medium: { bg: '#FEF3C7', text: '#92400E' },
                low: { bg: '#DCFCE7', text: '#166534' }
              };
              const pStyle = priorityColors[task.priority] || priorityColors.medium;

              return (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task._id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '1.25rem 1.5rem',
                    border: '1px solid rgba(87, 83, 78, 0.12)',
                    boxShadow: '0 2px 10px rgba(44, 30, 16, 0.03)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    transition: 'var(--transition)'
                  }}
                >
                  {/* Drag Handle */}
                  <div style={{ cursor: 'grab', color: '#A8A29E', marginTop: '0.2rem' }}>
                    <GripVertical size={18} />
                  </div>

                  {/* Circular Status Checkbox */}
                  <button
                    type="button"
                    onClick={() => onToggleTask(task._id, isCompleted ? 'todo' : 'completed')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      marginTop: '0.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted ? '#16A34A' : '#A8A29E'
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={22} color="#16A34A" />
                    ) : (
                      <Circle size={22} color="#A8A29E" strokeWidth={1.8} />
                    )}
                  </button>

                  {/* Task Content */}
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => onOpenTaskDetail(task)}
                  >
                    {/* Title + Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: isCompleted ? 'line-through' : 'none'
                        }}
                      >
                        {task.title}
                      </span>

                      {/* Priority Badge */}
                      {task.priority && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.55rem',
                            borderRadius: '100px',
                            backgroundColor: pStyle.bg,
                            color: pStyle.text
                          }}
                        >
                          {task.priority}
                        </span>
                      )}

                      {/* Category Badge */}
                      {task.category && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.65rem',
                            borderRadius: '100px',
                            backgroundColor: '#EAE6E1',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {task.category}
                        </span>
                      )}

                      {/* Assignee Badge */}
                      {task.assigneeId && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.65rem',
                            borderRadius: '100px',
                            backgroundColor: '#F1ECE4',
                            color: '#57534E',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <UserIcon size={12} />
                          {typeof task.assigneeId === 'object' ? (task.assigneeId.name || task.assigneeId.email) : 'Assigned'}
                        </span>
                      )}
                    </div>

                    {/* Description snippet */}
                    {task.description && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                        {task.description}
                      </p>
                    )}

                    {/* Meta sub-row: Status & Due Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Circle size={12} strokeWidth={2} />
                        {(task.status === 'completed' || task.status === 'done') ? 'Done' : task.status === 'in_progress' ? 'In progress' : 'To do'}
                      </span>

                      {dueLabel && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#57534E', fontWeight: 500 }}>
                          <CalendarIcon size={14} />
                          {dueLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick action buttons on hover */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                      onClick={() => onEditTask(task)}
                      title="Edit task"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.35rem', color: '#DC2626' }}
                      onClick={() => onDeleteTask(task._id)}
                      title="Delete task"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '3rem 2rem',
                textAlign: 'center',
                border: '1px solid rgba(87, 83, 78, 0.12)'
              }}
            >
              <h3 className="font-serif" style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>No tasks found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginBottom: '1.25rem' }}>
                Create a task to get started organizing your day.
              </p>
              <button className="btn btn-primary" onClick={() => onOpenNewTask()}>
                <Plus size={16} /> Create task
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW B: CALENDAR VIEW (Matching Screenshots 2 & 3) */}
      {activeTab === 'calendar' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '2rem',
            border: '1px solid rgba(87, 83, 78, 0.12)',
            boxShadow: '0 4px 20px rgba(44, 30, 16, 0.04)'
          }}
        >
          {/* Calendar Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
            <h2
              className="font-serif"
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em'
              }}
            >
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={goToToday}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '100px',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextMonth}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1px solid rgba(87, 83, 78, 0.15)',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Days of Week Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(87, 83, 78, 0.08)'
            }}
          >
            {DAYS_OF_WEEK.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Month Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid rgba(87, 83, 78, 0.08)'
            }}
          >
            {calendarData.map((cell, idx) => {
              const dayTasks = getTasksForDate(cell.date);
              const isToday = isTodayDate(cell.date);

              return (
                <div
                  key={idx}
                  onClick={() => onOpenNewTask(cell.date)}
                  style={{
                    minHeight: '100px',
                    padding: '0.75rem 0.5rem',
                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid rgba(87, 83, 78, 0.06)',
                    borderTop: idx < 7 ? 'none' : '1px solid rgba(87, 83, 78, 0.06)',
                    backgroundColor: cell.isCurrentMonth ? '#FFFFFF' : '#FAF9F6',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F2EC')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = cell.isCurrentMonth ? '#FFFFFF' : '#FAF9F6')
                  }
                >
                  {/* Day Number Header */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.4rem' }}>
                    {isToday ? (
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#C25508',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {cell.dayNumber}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: cell.isCurrentMonth ? 'var(--text-primary)' : '#A8A29E',
                          paddingLeft: '0.2rem'
                        }}
                      >
                        {cell.dayNumber}
                      </span>
                    )}
                  </div>

                  {/* Task Chips for Day */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {dayTasks.map((t) => {
                      const isTaskCompleted = t.status === 'completed' || t.status === 'done';

                      // Completed tasks get a distinct green style
                      const chipStyles = isTaskCompleted
                        ? { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' }
                        : {
                            urgent: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
                            high: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
                            medium: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
                            low: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' }
                          }[t.priority] || { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
                      const style = chipStyles;

                      return (
                        <div
                          key={t._id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTaskDetail(t);
                          }}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            textDecoration: isTaskCompleted ? 'line-through' : 'none',
                            opacity: isTaskCompleted ? 0.75 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                          title={`${t.title}${isTaskCompleted ? ' (Done)' : ''}`}
                        >
                          {isTaskCompleted && (
                            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </span>
                          )}
                          {t.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Footer Legend */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              paddingTop: '1.25rem',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)',
              fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <span>High priority</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <span>Medium priority</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span>Low priority</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Done</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
