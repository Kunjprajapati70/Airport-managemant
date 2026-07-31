/**
 * socket/index.js
 * Socket.IO server — manages rooms and provides emit helpers.
 *
 * Rooms:
 *   user_{userId}     — private per-user notifications
 *   flight_{flightId} — live flight status updates
 *   admin             — admin/airport-admin alerts
 *   role_{roleName}   — role-based broadcasts
 *
 * Events emitted to clients:
 *   notification      — new Notification document
 *   flightUpdate      — updated flight document
 *   boardingClosed    — boarding closed for a flight
 *   systemAlert       — admin-only system alert
 */

let io;

const initSocket = (httpServer) => {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin:  process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join user's private room
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Join role-based room (e.g. admin alerts)
    socket.on('joinRole', (role) => {
      if (role) {
        socket.join(`role_${role}`);
        if (['super_admin', 'airport_admin'].includes(role)) {
          socket.join('admin');
        }
      }
    });

    // Subscribe to a specific flight's live updates
    socket.on('joinFlight', (flightId) => {
      if (flightId) socket.join(`flight_${flightId}`);
    });

    socket.on('leaveFlight', (flightId) => {
      if (flightId) socket.leave(`flight_${flightId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

/** Send an event to a single user's private room */
const emitToUser = (userId, event, data) => {
  if (io) io.to(`user_${userId}`).emit(event, data);
};

/** Broadcast a flight status update to all flight subscribers */
const emitFlightUpdate = (flightId, data) => {
  if (io) io.to(`flight_${flightId}`).emit('flightUpdate', data);
};

/** Send an alert to all admin users */
const emitToAdmins = (event, data) => {
  if (io) io.to('admin').emit(event, data);
};

/** Send to all users with a specific role */
const emitToRole = (role, event, data) => {
  if (io) io.to(`role_${role}`).emit(event, data);
};

/** Broadcast to every connected client */
const broadcast = (event, data) => {
  if (io) io.emit(event, data);
};

module.exports = { initSocket, getIO, emitToUser, emitFlightUpdate, emitToAdmins, emitToRole, broadcast };
