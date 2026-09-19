import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { setupChatSocket } from "./socket/chat.socket";

export const httpServer = createServer(app);

const socketAllowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"]
  : "*";

export const io = new Server(httpServer, {
  cors: {
    origin: socketAllowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupChatSocket(io);
