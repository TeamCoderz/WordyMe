import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_BACKEND_URL);

export const subscribeToSpace = (spaceId: string) => {
  socket.emit('subscribeToSpace', spaceId);
};

export const unsubscribeFromSpace = (spaceId: string) => {
  socket.emit('unsubscribeFromSpace', spaceId);
};
