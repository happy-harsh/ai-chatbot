import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Bot,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const Login = ({ setCurrentUser, setSocket }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const demoAccounts = [
    { username: "harsh", password: "1", label: "Harsh" },
    { username: "savan", password: "1", label: "Savan" },
  ];

  const handleDemoLogin = async (acc) => {
    setIsRegister(false);
    setUsername(acc.username);
    setPassword(acc.password);
    setError("");

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: acc.username,
          password: acc.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to sign in.");
        setLoading(false);
        return;
      }

      const newSocket = io(API_URL);
      newSocket.emit("join", data.user.id);

      localStorage.setItem("chat_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setSocket(newSocket);
      navigate("/chat");
    } catch (err) {
      console.error("Demo login error:", err);
      setError("Unable to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to sign in. Check your credentials.");
        setLoading(false);
        return;
      }

      const newSocket = io(API_URL);
      newSocket.emit("join", data.user.id);

      localStorage.setItem("chat_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setSocket(newSocket);
      navigate("/chat");
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to backend server. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault?.();
    setError("");

    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          displayName: displayName.trim() || username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to create user account.");
        setLoading(false);
        return;
      }

      const newSocket = io(API_URL);
      newSocket.emit("join", data.user.id);

      localStorage.setItem("chat_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setSocket(newSocket);
      navigate("/chat");
    } catch (err) {
      console.error("Register error:", err);
      setError("Unable to connect to backend server. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090b",
        backgroundImage: `
          radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 60%),
          radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.08) 0%, transparent 50%)
        `,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#f8fafc",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#111413",
          border: "1px solid #1e2e26",
          borderRadius: 20,
          boxShadow:
            "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.08)",
          padding: "36px 32px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient Top Glow Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: 2,
            background:
              "linear-gradient(90deg, transparent, #10b981, transparent)",
          }}
        />

        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(16, 185, 129, 0.35)",
            }}
          >
            <Bot size={30} />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#f8fafc",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            AI Chatbot Workspace
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Sparkles size={14} color="#10b981" />
            <span>Voice & Document Intelligence</span>
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            background: "#090d0b",
            border: "1px solid #1b2821",
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 9,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: !isRegister ? "#10b981" : "transparent",
              color: !isRegister ? "#022c22" : "#94a3b8",
              boxShadow: !isRegister
                ? "0 2px 10px rgba(16, 185, 129, 0.3)"
                : "none",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 9,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: isRegister ? "#10b981" : "transparent",
              color: isRegister ? "#022c22" : "#94a3b8",
              boxShadow: isRegister
                ? "0 2px 10px rgba(16, 185, 129, 0.3)"
                : "none",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: 10,
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              color: "#fca5a5",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#cbd5e1",
                  marginBottom: 6,
                }}
              >
                Display Name (Optional)
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#090d0b",
                  border: "1px solid #1f2d26",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <User size={16} color="#10b981" />
                <input
                  type="text"
                  placeholder="e.g. Harsh Dodiya"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    color: "#f8fafc",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 6,
              }}
            >
              Username
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#090d0b",
                border: "1px solid #1f2d26",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <User size={16} color="#10b981" />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  color: "#f8fafc",
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: isRegister ? 16 : 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#090d0b",
                border: "1px solid #1f2d26",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <Lock size={16} color="#10b981" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  color: "#f8fafc",
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#cbd5e1",
                  marginBottom: 6,
                }}
              >
                Confirm Password
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#090d0b",
                  border: "1px solid #1f2d26",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <ShieldCheck size={16} color="#10b981" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    color: "#f8fafc",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#022c22",
              fontSize: 14,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 18px rgba(16, 185, 129, 0.4)",
              transition: "transform 0.15s ease",
            }}
          >
            {loading ? (
              <span>Please wait...</span>
            ) : (
              <>
                <span>{isRegister ? "Create Account" : "Sign In to Chat"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Chips */}
        {!isRegister && (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #1b2821" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#64748b",
                marginBottom: 10,
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Zap size={12} color="#10b981" />
              <span>1-Click Demo Accounts</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleDemoLogin(acc)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #1e2e26",
                    background: "#090d0b",
                    color: "#a7f3d0",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#10b981";
                    e.currentTarget.style.background = "#052e16";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1e2e26";
                    e.currentTarget.style.background = "#090d0b";
                  }}
                >
                  <Users size={12} color="#10b981" />
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
