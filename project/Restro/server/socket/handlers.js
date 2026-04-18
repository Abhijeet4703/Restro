const socketHandlers = (io, socket) => {
  // Call waiter
  socket.on('waiter:call', ({ restaurantId, tableNumber, orderId }) => {
    io.to(`restaurant:${restaurantId}`).emit('waiter:called', {
      tableNumber,
      orderId,
      message: `Table ${tableNumber} is calling for a waiter!`,
      timestamp: new Date(),
    });
  });

  // Admin manually update order
  socket.on('order:manual-update', ({ restaurantId, orderId, status, tableNumber }) => {
    io.to(`table:${restaurantId}:${tableNumber}`).emit('order:status-update', {
      orderId,
      status,
      message: `Order status updated to: ${status}`,
    });
  });

  // Kitchen typing estimated time
  socket.on('kitchen:eta-update', ({ restaurantId, tableNumber, orderId, estimatedTime }) => {
    io.to(`table:${restaurantId}:${tableNumber}`).emit('order:eta-update', {
      orderId,
      estimatedTime,
    });
  });

  // Multi-terminal billing sync
  socket.on('terminal:register', ({ restaurantId, terminalId, terminalName }) => {
    socket.join(`terminal:${restaurantId}`);
    socket.terminalId = terminalId;
    io.to(`restaurant:${restaurantId}`).emit('terminal:online', {
      terminalId,
      terminalName: terminalName || `Terminal ${terminalId.slice(-4)}`,
      timestamp: new Date(),
    });
  });

  // Terminal broadcasts cart/bill changes to other terminals
  socket.on('terminal:bill-update', ({ restaurantId, terminalId, tableNumber, action, data }) => {
    // Broadcast to all terminals except sender
    socket.to(`terminal:${restaurantId}`).emit('terminal:bill-sync', {
      terminalId,
      tableNumber,
      action, // 'cart-update', 'bill-settled', 'bill-held', 'bill-voided', 'table-claimed'
      data,
      timestamp: new Date(),
    });
  });

  // Terminal claims a table (locks it for this terminal)
  socket.on('terminal:claim-table', ({ restaurantId, terminalId, tableNumber }) => {
    io.to(`terminal:${restaurantId}`).emit('terminal:table-claimed', {
      terminalId,
      tableNumber,
      timestamp: new Date(),
    });
  });

  // Terminal releases a table
  socket.on('terminal:release-table', ({ restaurantId, terminalId, tableNumber }) => {
    io.to(`terminal:${restaurantId}`).emit('terminal:table-released', {
      terminalId,
      tableNumber,
      timestamp: new Date(),
    });
  });
};

module.exports = socketHandlers;
