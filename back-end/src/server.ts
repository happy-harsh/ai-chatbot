import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { setupChatSocket } from "./socket/chat.socket";
export const httpServer = createServer(app);
export const io = new Server(httpServer, { cors: { origin: "*" } });

setupChatSocket(io);
