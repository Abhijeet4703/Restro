const socketHandlers = require('../socket/handlers');

const configureSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join restaurant room
    socket.on('join:restaurant', (restaurantId) => {
      socket.join(`restaurant:${restaurantId}`);
      console.log(`Socket ${socket.id} joined restaurant:${restaurantId}`);
    });

    // Join kitchen room
    socket.on('join:kitchen', (restaurantId) => {
      socket.join(`kitchen:${restaurantId}`);
      console.log(`Socket ${socket.id} joined kitchen:${restaurantId}`);
    });

    // Join table room (customer)
    socket.on('join:table', ({ restaurantId, tableNumber }) => {
      socket.join(`table:${restaurantId}:${tableNumber}`);
      console.log(`Socket ${socket.id} joined table:${restaurantId}:${tableNumber}`);
    });

    // Register all event handlers
    socketHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = configureSocket;
