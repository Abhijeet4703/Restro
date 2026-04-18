import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};

export const joinRestaurant = (restaurantId: string) => {
  const s = connectSocket();
  s.emit('join:restaurant', restaurantId);
};

export const joinKitchen = (restaurantId: string) => {
  const s = connectSocket();
  s.emit('join:kitchen', restaurantId);
};

export const joinTable = (restaurantId: string, tableNumber: number) => {
  const s = connectSocket();
  s.emit('join:table', { restaurantId, tableNumber });
};

export const callWaiter = (restaurantId: string, tableNumber: number, orderId?: string) => {
  const s = getSocket();
  s.emit('waiter:call', { restaurantId, tableNumber, orderId });
};
