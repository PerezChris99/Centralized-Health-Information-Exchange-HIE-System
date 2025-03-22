const socketIo = require('socket.io');

let io;

/**
 * Initialize Socket.IO notification service
 * @param {Object} server - HTTP server instance
 */
const initNotificationService = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle user joining specific rooms (e.g., for patient-specific or provider-specific notifications)
    socket.on('join', (room) => {
      socket.join(room);
      console.log(`Client ${socket.id} joined room: ${room}`);
    });

    // Handle user leaving rooms
    socket.on('leave', (room) => {
      socket.leave(room);
      console.log(`Client ${socket.id} left room: ${room}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  console.log('Notification service initialized');
  return io;
};

/**
 * Send notification to specific room or user
 * @param {String} room - Room or user ID to send notification to
 * @param {String} type - Type of notification
 * @param {Object} data - Notification data
 */
const sendNotification = (room, type, data) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  io.to(room).emit(type, data);
};

/**
 * Send broadcast notification to all connected clients
 * @param {String} type - Type of notification
 * @param {Object} data - Notification data
 */
const broadcastNotification = (type, data) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  io.emit(type, data);
};

module.exports = {
  initNotificationService,
  sendNotification,
  broadcastNotification
};
