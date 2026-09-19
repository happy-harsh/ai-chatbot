import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const Login = ({ setCurrentUser, setSocket }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemoUsers, setShowDemoUsers] = useState(false);

  const navigate = useNavigate();

  const demoAccounts = [
    { username: "harsh", password: "1", label: "HARSH" },
    { username: "savan", password: "1", label: "SAVAN" },
    { username: "serena", password: "ser", label: "Serena" },
    { username: "akshay", password: "1", label: "Akshay" },
  ];

  const fillDemo = (acc) => {
    setIsRegister(false);
    setUsername(acc.username);
    setPassword(acc.password);
    setError("");
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

    if (password.length < 1) {
      setError("Password cannot be empty.");
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

      // Auto sign-in on registration success
      const newSocket = io(API_URL);
      newSocket.emit("join", data.user.id);

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

  const toggleMode = (registerMode) => {
    setIsRegister(registerMode);
    setError("");
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundShapes}>
        <div style={styles.shape1}></div>
        <div style={styles.shape2}></div>
        <div style={styles.shape3}></div>
      </div>

      <div style={styles.card}>
        <div style={styles.iconWrapper}>
          <div style={styles.icon}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        <h2 style={styles.title}>
          {isRegister ? "Create an Account" : "Welcome Back"}
        </h2>
        <p style={styles.subtitle}>
          {isRegister
            ? "Register a new user to start chatting"
            : "Sign in to continue to your account"}
        </p>

        {/* Tab switcher */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(!isRegister ? styles.tabBtnActive : {}),
            }}
            onClick={() => toggleMode(false)}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(isRegister ? styles.tabBtnActive : {}),
            }}
            onClick={() => toggleMode(true)}
          >
            Sign Up
          </button>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form
          onSubmit={isRegister ? handleRegister : handleLogin}
          style={styles.form}
        >
          <div style={styles.inputWrapper}>
            <input
              style={{
                ...styles.input,
                ...(focusedField === "username" ? styles.inputFocused : {}),
              }}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              autoComplete="username"
              required
            />
          </div>

          {isRegister && (
            <div style={styles.inputWrapper}>
              <input
                style={{
                  ...styles.input,
                  ...(focusedField === "displayName" ? styles.inputFocused : {}),
                }}
                placeholder="Display Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onFocus={() => setFocusedField("displayName")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          )}

          <div style={styles.inputWrapper}>
            <input
              style={{
                ...styles.input,
                ...(focusedField === "password" ? styles.inputFocused : {}),
              }}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />
          </div>

          {isRegister && (
            <div style={styles.inputWrapper}>
              <input
                style={{
                  ...styles.input,
                  ...(focusedField === "confirmPassword"
                    ? styles.inputFocused
                    : {}),
                }}
                placeholder="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow =
                  "0 8px 20px rgba(102, 126, 234, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow =
                "0 4px 12px rgba(102, 126, 234, 0.3)";
            }}
          >
            {loading
              ? isRegister
                ? "Creating Account..."
                : "Signing In..."
              : isRegister
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <div style={styles.footer}>
          {isRegister ? (
            <p style={styles.footerText}>
              Already have an account?{" "}
              <span
                style={styles.link}
                onClick={() => toggleMode(false)}
                role="button"
                tabIndex={0}
              >
                Sign In
              </span>
            </p>
          ) : (
            <p style={styles.footerText}>
              Don't have an account?{" "}
              <span
                style={styles.link}
                onClick={() => toggleMode(true)}
                role="button"
                tabIndex={0}
              >
                Create one
              </span>
            </p>
          )}
        </div>

        {/* Demo Accounts Helper */}
        <div style={styles.demoSection}>
          <button
            type="button"
            style={styles.demoToggle}
            onClick={() => setShowDemoUsers(!showDemoUsers)}
          >
            {showDemoUsers ? "▲ Hide Demo Accounts" : "▼ Quick Demo Accounts"}
          </button>
          {showDemoUsers && (
            <div style={styles.demoList}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  style={styles.demoChip}
                  onClick={() => fillDemo(acc)}
                  title={`Username: ${acc.username} | Password: ${acc.password}`}
                >
                  <strong>{acc.label}</strong> ({acc.username})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: "20px",
    boxSizing: "border-box",
  },
  backgroundShapes: {
    position: "absolute",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    zIndex: 0,
  },
  shape1: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.08)",
    top: "-100px",
    right: "-100px",
    animation: "float 6s ease-in-out infinite",
  },
  shape2: {
    position: "absolute",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.06)",
    bottom: "-80px",
    left: "-80px",
    animation: "float 8s ease-in-out infinite 1s",
  },
  shape3: {
    position: "absolute",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.05)",
    top: "50%",
    left: "10%",
    animation: "float 7s ease-in-out infinite 2s",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    padding: "36px 32px",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(10px)",
    boxShadow:
      "0 30px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    position: "relative",
    zIndex: 1,
    boxSizing: "border-box",
  },
  iconWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "4px",
  },
  icon: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    boxShadow: "0 8px 20px rgba(102, 126, 234, 0.3)",
  },
  title: {
    margin: 0,
    textAlign: "center",
    fontSize: "24px",
    fontWeight: 700,
    color: "#1a1a1a",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: "-6px 0 6px 0",
    textAlign: "center",
    fontSize: "14px",
    color: "#666",
    fontWeight: 400,
  },
  tabContainer: {
    display: "flex",
    background: "#f0f2f5",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "4px",
  },
  tabBtn: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "#666",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  tabBtnActive: {
    background: "#ffffff",
    color: "#667eea",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
  },
  errorBanner: {
    padding: "10px 14px",
    borderRadius: "8px",
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    fontSize: "13px",
    lineHeight: "1.4",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    fontSize: "14px",
    borderRadius: "10px",
    border: "2px solid #e8e8e8",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
    background: "#fafafa",
    fontFamily: "inherit",
  },
  inputFocused: {
    border: "2px solid #667eea",
    background: "#fff",
    boxShadow: "0 0 0 4px rgba(102, 126, 234, 0.1)",
  },
  button: {
    marginTop: "6px",
    padding: "13px",
    borderRadius: "10px",
    border: "none",
    fontSize: "15px",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
    fontFamily: "inherit",
  },
  footer: {
    textAlign: "center",
    marginTop: "2px",
  },
  footerText: {
    margin: 0,
    fontSize: "13px",
    color: "#666",
  },
  link: {
    color: "#667eea",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "underline",
  },
  demoSection: {
    marginTop: "6px",
    borderTop: "1px solid #f0f0f0",
    paddingTop: "12px",
    textAlign: "center",
  },
  demoToggle: {
    background: "none",
    border: "none",
    color: "#888",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 500,
    padding: "4px 8px",
    borderRadius: "6px",
    transition: "color 0.2s ease",
  },
  demoList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    justifyContent: "center",
    marginTop: "10px",
  },
  demoChip: {
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "4px 10px",
    fontSize: "12px",
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};

// Add keyframe animation via inline style tag
if (typeof document !== "undefined") {
  const existing = document.getElementById("login-animations");
  if (!existing) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "login-animations";
    styleSheet.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(5deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}
