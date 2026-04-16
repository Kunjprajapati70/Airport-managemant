/**
 * socket.js
 * Socket.IO client singleton.
 * Call initSocket(userId, role) once after login.
 * Call disconnectSocket() on logout.
 */

import { io } from 'socket.io-client';

let socket = null;

/**
 * Initialize the socket connection.
 * Joins the user's private room and their role room.
 * @param {string} userId - MongoDB ObjectId
 * @param {string} [role] - user role for role-based broadcasts
 */
export const initSocket = (userId, role) => {
  if (socket?.connected) {
    // Re-join rooms if already connected (e.g. after page refresh)
    if (userId) socket.emit('join', userId);
    if (role)   socket.emit('joinRole', role);
    return socket;
  }

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    if (userId) socket.emit('join', userId);
    if (role)   socket.emit('joinRole', role);
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => socket;

export const joinFlightRoom = (flightId) => {
  if (socket && flightId) socket.emit('joinFlight', flightId);
};

export const leaveFlightRoom = (flightId) => {
  if (socket && flightId) socket.emit('leaveFlight', flightId);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
