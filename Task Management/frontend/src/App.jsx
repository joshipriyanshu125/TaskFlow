import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { getSocket, joinWorkspaceRoom, leaveWorkspaceRoom, joinTeamRoom, leaveTeamRoom, updateSocketAuth } from './socket';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { AuthModal } from './components/AuthModal';
import { TaskModal } from './components/TaskModal';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { WorkspaceModal } from './components/WorkspaceModal';
import { AdminPanel } from './components/AdminPanel';
import { TeamModal } from './components/TeamModal';
import { TeamBoardView } from './components/TeamBoardView';
import { Check, AlertCircle, Users } from 'lucide-react';

const INITIAL_FALLBACK_TASKS = [];

function readCachedValue(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Could not read cached app data (${key}):`, error);
    return fallback;
  }
}

function readCachedArray(key) {
  const value = readCachedValue(key, []);
  return Array.isArray(value) ? value : [];
}

function writeCachedValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not cache app data (${key}):`, error);
  }
}

function workspaceCacheKey(userId) {
  return `taskflow_workspace_data_${userId}`;
}

function tasksCacheKey(userId, workspaceId) {
  return `taskflow_tasks_${userId}_${workspaceId}`;
}

export function App() {
  const [user, setUser] = useState(api.user);
  const [workspaces, setWorkspaces] = useState(() => (
    api.user?._id ? readCachedArray(workspaceCacheKey(api.user._id)) : []
  ));
  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    if (!api.user?._id) return null;
    const cachedWorkspace = readCachedValue(`taskflow_currentWorkspace_${api.user._id}`, null);
    return cachedWorkspace && typeof cachedWorkspace === 'object' && cachedWorkspace._id
      ? cachedWorkspace
      : null;
  });
  const [tasks, setTasks] = useState(() => (
    api.user?._id
      ? readCachedArray(
        tasksCacheKey(
          api.user._id,
          readCachedValue(`taskflow_currentWorkspace_${api.user._id}`, null)?._id
        ),
        []
      )
      : []
  ));
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [visitedViews, setVisitedViews] = useState(['dashboard']);
  const [mainNavView, setMainNavView] = useState(() => {
    const saved = localStorage.getItem('taskflow_mainNavView');
    return saved === 'admin' || saved === 'team' || saved === 'dashboard' ? saved : 'dashboard';
  }); // 'dashboard' | 'admin' | 'team'
  const [toast, setToast] = useState(null);

  // Modal States
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'signin' });
  const [taskModal, setTaskModal] = useState({ isOpen: false, task: null, defaultDate: null });
  const [detailDrawerTask, setDetailDrawerTask] = useState(null);
  const [workspaceModalState, setWorkspaceModalState] = useState({ isOpen: false, tab: 'create' });
  const [teamModalState, setTeamModalState] = useState({ isOpen: false, tab: 'list' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Listen for unrecoverable 401 / auth invalidation event
  useEffect(() => {
    const handleAuthInvalid = () => {
      setUser(null);
      setTasks([]);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setTeams([]);
      setMainNavView('dashboard');
      showToast('Session expired. Please sign in again.', 'error');
    };

    window.addEventListener('taskflow:auth-invalid', handleAuthInvalid);
    return () => window.removeEventListener('taskflow:auth-invalid', handleAuthInvalid);
  }, []);

  // On mount: check URL for password-reset token and auto-open the reset modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (resetToken && !api.token) {
      setAuthModal({ isOpen: true, mode: 'reset' });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('taskflow_mainNavView', mainNavView);
  }, [mainNavView]);

  // Validate the cached session without blocking the cached page from rendering.
  useEffect(() => {
    if (api.token) {
      api.getMe()
        .then((res) => {
          if (api.token && res?.user) {
            setUser(res.user);
            const saved = localStorage.getItem('taskflow_mainNavView');
            if (res.user.role === 'admin') {
              if (saved === 'admin' || saved === 'team' || saved === 'dashboard') {
                setMainNavView(saved);
              } else {
                setMainNavView('admin');
              }
            } else {
              if (saved === 'team' || saved === 'dashboard') {
                setMainNavView(saved);
              } else {
                setMainNavView('dashboard');
              }
            }
          }
        })
        .catch((err) => {
          console.warn('Initial auth check noticed:', err.message);
          if (api.token) setUser(null);
        });
    }
  }, []);

  // Fetch workspaces when user is authenticated
  const fetchWorkspaces = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await api.getWorkspaces();
      if (!api.token || api.user?._id !== user._id) return;
      if (Array.isArray(res?.workspaces)) {
        const savedWorkspaceId = localStorage.getItem(`taskflow_workspace_${user._id}`);
        const selectedWorkspace = res.workspaces.find((w) => w._id === savedWorkspaceId) || res.workspaces[0] || null;
        setWorkspaces(res.workspaces);
        writeCachedValue(workspaceCacheKey(user._id), res.workspaces);
        setCurrentWorkspace(selectedWorkspace);
        if (selectedWorkspace && selectedWorkspace._id !== savedWorkspaceId) {
          setTasks(readCachedArray(tasksCacheKey(user._id, selectedWorkspace._id)));
        }
      }
    } catch (err) {
      console.warn('Fetch workspaces error:', err);
    }
  }, [user?._id]);

  // Fetch tasks for current workspace
  const fetchTasks = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await api.getTasks({ workspaceId: currentWorkspace?._id });
      if (!api.token || api.user?._id !== user._id) return;
      const nextTasks = res?.tasks || [];
      setTasks(nextTasks);
      if (currentWorkspace?._id) {
        writeCachedValue(tasksCacheKey(user._id, currentWorkspace._id), nextTasks);
      }
    } catch (err) {
      console.warn('Fetch tasks error:', err.message);
    }
  }, [user?._id, currentWorkspace?._id]);

  // Fetch teams for current workspace
  const fetchTeams = useCallback(async () => {
    if (!user?._id || !currentWorkspace?._id) {
      setTeams([]);
      return;
    }
    setTeamsLoading(true);
    try {
      const res = await api.getTeams(currentWorkspace._id);
      if (!api.token || api.user?._id !== user._id) return;
      if (Array.isArray(res?.teams)) {
        setTeams(res.teams);
      } else {
        setTeams([]);
      }
    } catch (err) {
      console.warn('Fetch teams error:', err.message);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [user?._id, currentWorkspace?._id]);

  // Save selected workspace ID
  useEffect(() => {
    if (user?._id && currentWorkspace?._id) {
      localStorage.setItem(`taskflow_workspace_${user._id}`, currentWorkspace._id);
      writeCachedValue(`taskflow_currentWorkspace_${user._id}`, currentWorkspace);
    }
  }, [user?._id, currentWorkspace?._id]);

  useEffect(() => {
    if (user?._id && currentWorkspace?._id) {
      writeCachedValue(tasksCacheKey(user._id, currentWorkspace._id), tasks);
    }
  }, [user?._id, currentWorkspace?._id, tasks]);

  // Initial workspaces fetch on user sign-in
  useEffect(() => {
    if (user?._id) {
      fetchWorkspaces();
    }
  }, [user?._id, fetchWorkspaces]);

  // Fetch tasks and teams when current workspace is active
  useEffect(() => {
    if (user?._id) {
      fetchTasks();
      fetchTeams();
    }
  }, [user?._id, currentWorkspace?._id, fetchTasks, fetchTeams]);

  // Real-time Socket.IO Subscriptions
  useEffect(() => {
    if (!user?._id) return;
    updateSocketAuth(api.token);
    const socket = getSocket();

    if (currentWorkspace?._id) {
      joinWorkspaceRoom(currentWorkspace._id);
    }

    if (Array.isArray(teams)) {
      teams.forEach((t) => {
        if (t._id) joinTeamRoom(t._id);
      });
    }

    const handleTaskUpdated = (payload) => {
      const updatedTask = payload.task;
      if (!updatedTask) return;
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? { ...t, ...updatedTask } : t))
      );
      setDetailDrawerTask((prev) => (prev?._id === updatedTask._id ? { ...prev, ...updatedTask } : prev));
      showToast(`Task "${updatedTask.title}" updated in real-time ⚡`, 'info');
    };

    const handleTaskCreated = (payload) => {
      const newTask = payload.task;
      if (!newTask) return;
      setTasks((prev) => {
        if (prev.some((t) => t._id === newTask._id)) return prev;
        return [newTask, ...prev];
      });
      showToast(`New task "${newTask.title}" added ⚡`, 'info');
    };

    const handleTaskDeleted = (payload) => {
      const { taskId } = payload;
      if (!taskId) return;
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setDetailDrawerTask((prev) => (prev?._id === taskId ? null : prev));
      showToast('A task was removed in real-time ⚡', 'info');
    };

    const handleTaskReordered = () => {
      fetchTasks();
    };

    const handleTeamCreated = (payload) => {
      const newTeam = payload.team;
      if (!newTeam) return;
      setTeams((prev) => {
        if (prev.some((t) => t._id === newTeam._id)) return prev;
        return [...prev, newTeam];
      });
      showToast(`New team "${newTeam.name}" added ⚡`, 'info');
    };

    const handleTeamUpdated = (payload) => {
      const updatedTeam = payload.team;
      if (!updatedTeam) return;
      setTeams((prev) =>
        prev.map((t) => (t._id === updatedTeam._id ? { ...t, ...updatedTeam } : t))
      );
    };

    const handleTeamDeleted = (payload) => {
      const { teamId } = payload;
      if (!teamId) return;
      setTeams((prev) => prev.filter((t) => t._id !== teamId));
      showToast('A team was removed ⚡', 'info');
    };

    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:reordered', handleTaskReordered);
    socket.on('team:created', handleTeamCreated);
    socket.on('team:updated', handleTeamUpdated);
    socket.on('team:deleted', handleTeamDeleted);

    return () => {
      if (currentWorkspace?._id) {
        leaveWorkspaceRoom(currentWorkspace._id);
      }
      if (Array.isArray(teams)) {
        teams.forEach((t) => {
          if (t._id) leaveTeamRoom(t._id);
        });
      }
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:reordered', handleTaskReordered);
      socket.off('team:created', handleTeamCreated);
      socket.off('team:updated', handleTeamUpdated);
      socket.off('team:deleted', handleTeamDeleted);
    };
  }, [user?._id, currentWorkspace?._id, teams, fetchTasks]);

  // Auth Handlers
  const handleAuthSuccess = (authenticatedUser) => {
    const cachedWorkspaces = readCachedArray(workspaceCacheKey(authenticatedUser._id));
    const savedWorkspaceId = localStorage.getItem(`taskflow_workspace_${authenticatedUser._id}`);
    const cachedWorkspace = readCachedValue(`taskflow_currentWorkspace_${authenticatedUser._id}`, null);
    const selectedWorkspace = cachedWorkspaces.find((workspace) => workspace._id === savedWorkspaceId)
      || cachedWorkspaces.find((workspace) => workspace._id === cachedWorkspace?._id)
      || cachedWorkspaces[0]
      || null;

    setUser(authenticatedUser);
    setWorkspaces(cachedWorkspaces);
    setCurrentWorkspace(selectedWorkspace);
    setTasks(selectedWorkspace
      ? readCachedArray(tasksCacheKey(authenticatedUser._id, selectedWorkspace._id))
      : []);
    setAuthModal({ isOpen: false, mode: 'signin' });
    updateSocketAuth(api.token);
    const saved = localStorage.getItem('taskflow_mainNavView');
    if (authenticatedUser.role === 'admin') {
      setMainNavView(saved || 'admin');
    } else {
      setMainNavView(saved === 'team' ? 'team' : 'dashboard');
    }
    showToast(`Welcome, ${authenticatedUser.name}!`);
  };

  const handleLogout = () => {
    void api.logout();
    setUser(null);
    setTasks([]);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setTeams([]);
    updateSocketAuth(null);
    setMainNavView('dashboard');
    localStorage.removeItem('taskflow_mainNavView');
    showToast('Signed out successfully.');
  };

  const handleWorkspaceChange = (workspace) => {
    setCurrentWorkspace(workspace);
    if (user?._id && workspace?._id) {
      setTasks(readCachedArray(tasksCacheKey(user._id, workspace._id)));
    }
  };

  const handleNavigate = (view) => {
    if (view === 'admin' && user?.role !== 'admin') {
      view = 'dashboard';
    }
    setMainNavView(view);
    setVisitedViews((visited) => visited.includes(view) ? visited : [...visited, view]);
  };

  // Task Handlers
  const handleToggleTask = async (taskId, newStatus) => {
    const prev = tasks;
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.updateTask(taskId, { status: newStatus });
      showToast(newStatus === 'completed' ? 'Task completed! 🎉' : 'Task status updated');
    } catch (err) {
      console.warn('API task update error:', err);
      setTasks(prev);
      showToast('Failed to update task.', 'error');
    }
  };

  const handleSaveTask = async (taskPayload, existingId) => {
    if (existingId) {
      try {
        const res = await api.updateTask(existingId, taskPayload);
        const updated = res?.task || taskPayload;
        setTasks((prev) => prev.map((t) => (t._id === existingId ? { ...t, ...updated } : t)));
        showToast('Task updated successfully.');
      } catch (err) {
        console.warn('Task update error:', err);
        showToast('Failed to save task changes.', 'error');
      }
    } else {
      try {
        const payloadWithWorkspace = {
          ...taskPayload,
          ...(currentWorkspace?._id && /^[0-9a-fA-F]{24}$/.test(currentWorkspace._id)
            ? { workspaceId: currentWorkspace._id }
            : {})
        };
        const res = await api.createTask(payloadWithWorkspace);
        const created = res?.task || payloadWithWorkspace;
        setTasks((prev) => [created, ...prev]);
        showToast('Task created! 🚀');
      } catch (err) {
        console.warn('Task create error:', err);
        showToast(err?.message || 'Failed to create task.', 'error');
      }
    }
  };

  const handleDeleteTask = async (taskId) => {
    const prev = tasks;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    try {
      await api.deleteTask(taskId);
      showToast('Task deleted.');
    } catch (err) {
      console.warn(err);
      setTasks(prev);
      showToast('Failed to delete task.', 'error');
    }
  };

  const handleReorderTasks = async (newTasks) => {
    const prev = tasks;
    setTasks(newTasks);
    try {
      const payload = newTasks.map((t, idx) => ({
        id: t._id,
        position: idx,
        status: t.status
      }));
      await api.reorderTasks(payload, currentWorkspace?._id);
    } catch (err) {
      console.warn('Task reorder error:', err);
      setTasks(prev);
      showToast('Failed to save task order.', 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })}
        onOpenWorkspaceModal={(tab = 'create') => setWorkspaceModalState({ isOpen: true, tab })}
        onLogout={handleLogout}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={handleWorkspaceChange}
        currentView={mainNavView}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        {user ? (
          <>
            <div style={{ display: mainNavView === 'dashboard' ? 'block' : 'none' }}>
              <Dashboard
                tasks={tasks}
                user={user}
                currentWorkspace={currentWorkspace}
                onOpenWorkspaceModal={(tab = 'invite') => setWorkspaceModalState({ isOpen: true, tab })}
                onToggleTask={handleToggleTask}
                onOpenNewTask={(date) => setTaskModal({ isOpen: true, task: null, defaultDate: date || null })}
                onEditTask={(task) => setTaskModal({ isOpen: true, task, defaultDate: null })}
                onOpenTaskDetail={(task) => setDetailDrawerTask(task)}
                onDeleteTask={handleDeleteTask}
                onReorderTasks={handleReorderTasks}
              />
            </div>
            {user.role === 'admin' && visitedViews.includes('admin') && (
              <div style={{ display: mainNavView === 'admin' ? 'block' : 'none' }}>
                <AdminPanel currentUser={user} onShowToast={showToast} />
              </div>
            )}
            {visitedViews.includes('team') && (
              <div style={{ display: mainNavView === 'team' ? 'block' : 'none' }}>
                <TeamBoardView
                  currentWorkspace={currentWorkspace}
                  user={user}
                  teams={teams}
                  loading={teamsLoading}
                  onFetchTeams={fetchTeams}
                  onOpenTeamModal={(tab = 'list') => setTeamModalState({ isOpen: true, tab })}
                />
              </div>
            )}
          </>
        ) : (
          <LandingPage onOpenAuth={(mode) => setAuthModal({ isOpen: true, mode })} />
        )}
      </div>

      {/* Auth Modal */}
      {authModal.isOpen && (
        <AuthModal
          initialMode={authModal.mode}
          onClose={() => setAuthModal({ isOpen: false, mode: 'signin' })}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Create / Edit Task Modal */}
      {taskModal.isOpen && (
        <TaskModal
          isOpen={taskModal.isOpen}
          task={taskModal.task}
          defaultDate={taskModal.defaultDate}
          onClose={() => setTaskModal({ isOpen: false, task: null, defaultDate: null })}
          onSave={handleSaveTask}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          teams={teams}
        />
      )}

      {/* Task Detail & Subtasks Drawer */}
      {detailDrawerTask && (
        <TaskDetailDrawer
          isOpen={Boolean(detailDrawerTask)}
          task={detailDrawerTask}
          onClose={() => setDetailDrawerTask(null)}
          onUpdateTask={(updated) => {
            setDetailDrawerTask(updated);
            setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
          }}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Workspace Management Modal */}
      {workspaceModalState.isOpen && (
        <WorkspaceModal
          isOpen={workspaceModalState.isOpen}
          initialTab={workspaceModalState.tab}
          onClose={() => setWorkspaceModalState({ isOpen: false, tab: 'create' })}
          currentWorkspace={currentWorkspace}
          onWorkspaceCreated={(newWs) => {
            setWorkspaces((prev) => [...prev.filter((workspace) => workspace._id !== newWs._id), newWs]);
            setCurrentWorkspace(newWs);
            if (user?._id) {
              localStorage.setItem(`taskflow_workspace_${user._id}`, newWs._id);
            }
            setMainNavView('dashboard');
            showToast('Workspace created successfully!');
          }}
        />
      )}

      {/* Team Management Modal */}
      {teamModalState.isOpen && (
        <TeamModal
          isOpen={teamModalState.isOpen}
          initialTab={teamModalState.tab || 'list'}
          onClose={() => setTeamModalState({ isOpen: false, tab: 'list' })}
          currentWorkspace={currentWorkspace}
          teams={teams}
          onShowToast={showToast}
          onTeamCreated={(newTeam) => {
            setTeams((prev) => {
              if (prev.some((t) => t._id === newTeam._id)) return prev;
              return [...prev, newTeam];
            });
            setTeamModalState({ isOpen: false, tab: 'list' });
            showToast('Team created successfully!');
          }}
          onTeamUpdated={(updatedTeam) => {
            if (updatedTeam?._id) {
              setTeams((prev) =>
                prev.map((t) => (t._id === updatedTeam._id ? updatedTeam : t))
              );
            } else {
              fetchTeams();
            }
          }}
          onTeamDeleted={(teamId) => {
            setTeams((prev) => prev.filter((t) => t._id !== teamId));
          }}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="toast-container">
          <div className="toast">
            {toast.type === 'success' ? (
              <Check size={16} color="#10B981" />
            ) : (
              <AlertCircle size={16} color="#EF4444" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
