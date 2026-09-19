import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Chat } from "./pages/Chat";
import { Login } from "./pages/Login";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const App = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("chat_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [socket, setSocket] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const newSocket = io(API_URL);
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        newSocket.emit("join", currentUser.id);
      });
      setSocket(newSocket);
      setIsInitializing(false);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
      setIsInitializing(false);
    }
  }, [currentUser?.id]);

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    setCurrentUser(null);
    localStorage.removeItem("chat_user");
    localStorage.removeItem("chat_active_user_id");
  };

  if (isInitializing && currentUser) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#94a3b8",
          fontFamily: "system-ui, sans-serif",
          fontSize: 16,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "3px solid #38bdf8",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        ></div>
        Connecting to session...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate to="/chat" replace />
            ) : (
              <Login setCurrentUser={setCurrentUser} setSocket={setSocket} />
            )
          }
        />
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to="/chat" replace />
            ) : (
              <Login setCurrentUser={setCurrentUser} setSocket={setSocket} />
            )
          }
        />
        <Route
          path="/chat"
          element={
            currentUser ? (
              <Chat
                currentUser={currentUser}
                socket={socket}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
