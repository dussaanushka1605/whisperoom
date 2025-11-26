import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  
  socket = io(API_URL, {
    auth: {
      token,
    },
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

