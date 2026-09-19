import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Chat } from "./pages/Chat";
import { Login } from "./pages/Login";

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [socket, setSocket] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate to="/chat" />
            ) : (
              <Login setCurrentUser={setCurrentUser} setSocket={setSocket} />
            )
          }
        />
        <Route
          path="/login"
          element={
            <Login setCurrentUser={setCurrentUser} setSocket={setSocket} />
          }
        />
        <Route
          path="/chat"
          element={
            currentUser && socket ? (
              <Chat currentUser={currentUser} socket={socket} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
