const socketIo = require('socket.io');

let io;

const initNotificationService = (server) => {
  io = socketIo(server);
  
  io.on('connection', (socket) => {
    console.log('Client connected to notification service');
    
    socket.on('disconnect', () => {
      console.log('Client disconnected from notification service');
    });
  });
  
  return io;
};

const sendNotification = (userId, notification) => {
  if (!io) {
    console.error('Notification service not initialized');
    return;
  }
  
  io.emit(`notification-${userId}`, notification);
  console.log(`Notification sent to user ${userId}:`, notification);
};

const broadcastNotification = (notification) => {
  if (!io) {
    console.error('Notification service not initialized');
    return;
  }
  
  io.emit('broadcast-notification', notification);
  console.log('Broadcast notification sent:', notification);
};

module.exports = {
  initNotificationService,
  sendNotification,
  broadcastNotification
};
