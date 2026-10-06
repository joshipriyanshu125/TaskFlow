import { io } from 'socket.io-client';
import { api } from './api';

let socket = null;
let currentJoinedWorkspaceId = null;
let currentJoinedProjectId = null;

export function getSocket() {
  if (!socket) {
    let socketUrl = import.meta.env?.VITE_SOCKET_URL;
    if (!socketUrl) {
      const apiUrl = import.meta.env?.VITE_API_URL;
      if (apiUrl && (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))) {
        try {
          const parsed = new URL(apiUrl);
          socketUrl = parsed.origin;
        } catch {
          // ignore
        }
      }
    }
    if (!socketUrl) {
      socketUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:5000'
        : window.location.origin;
    }

    socket = io(socketUrl, {
      auth: {
        token: api.token
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('⚡ Real-time Socket connected:', socket.id);
      if (currentJoinedWorkspaceId) {
        socket.emit('join:workspace', currentJoinedWorkspaceId);
      }
      if (currentJoinedProjectId) {
        socket.emit('join:project', currentJoinedProjectId);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Real-time Socket connection notice:', err.message);
    });
  }

  return socket;
}

export function updateSocketAuth(token) {
  const s = getSocket();
  if (s) {
    s.auth = { token };
    if (!s.connected) {
      s.connect();
    }
  }
}

export function joinProjectRoom(projectId) {
  currentJoinedProjectId = projectId;
  const s = getSocket();
  if (s && projectId) {
    s.emit('join:project', projectId);
  }
}

export function leaveProjectRoom(projectId) {
  if (currentJoinedProjectId === projectId) currentJoinedProjectId = null;
  const s = getSocket();
  if (s && projectId) {
    s.emit('leave:project', projectId);
  }
}

export function joinWorkspaceRoom(workspaceId) {
  currentJoinedWorkspaceId = workspaceId;
  const s = getSocket();
  if (s && workspaceId) {
    s.emit('join:workspace', workspaceId);
  }
}

export function leaveWorkspaceRoom(workspaceId) {
  if (currentJoinedWorkspaceId === workspaceId) currentJoinedWorkspaceId = null;
  const s = getSocket();
  if (s && workspaceId) {
    s.emit('leave:workspace', workspaceId);
  }
}
