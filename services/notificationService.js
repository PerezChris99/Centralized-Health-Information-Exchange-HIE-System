const socketIo = require('socket.io');

let io;

const initNotificationService = (server) => {
  io = socketIo(server);

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};

const emitNotification = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = { initNotificationService, emitNotification };
