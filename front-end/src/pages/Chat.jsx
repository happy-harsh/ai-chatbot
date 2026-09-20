import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import {
  Bot,
  User,
  Send,
  Mic,
  Square,
  Paperclip,
  LogOut,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Search,
  Sparkles,
  Check,
  Copy,
  FileText,
  Calendar,
  X,
  RefreshCw,
  Settings,
  Trash2,
  Database,
  Menu,
  ChevronLeft,
  ArrowLeft,
} from "lucide-react";

const AI_USER = {
  id: "bot",
  displayName: "AI Assistant",
  username: "assistant",
  isSystem: true,
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Custom Markdown Formatter for rendering AI responses cleanly
const FormattedMessage = ({ content, isDark }) => {
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if this is a delegated task notification
  const isTaskCard =
    content.includes("Task:") &&
    (content.includes("Deadline:") || content.includes("⏰"));

  if (isTaskCard) {
    const lines = content.split("\n");
    const taskLine = lines.find((l) => l.toLowerCase().includes("task:")) || "";
    const deadlineLine =
      lines.find(
        (l) => l.toLowerCase().includes("deadline:") || l.includes("⏰")
      ) || "";

    return (
      <div
        style={{
          border: isDark ? "1px solid #10b98155" : "1px solid #a7f3d0",
          background: isDark ? "#064e3b33" : "#ecfdf5",
          borderRadius: 12,
          padding: "14px 16px",
          marginTop: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 700,
            color: isDark ? "#34d399" : "#059669",
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <Calendar size={16} />
          <span>DELEGATED TASK</span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: isDark ? "#f8fafc" : "#0f172a",
            marginBottom: 4,
          }}
        >
          {taskLine.replace(/Task:\s*/i, "")}
        </div>
        {deadlineLine && (
          <div
            style={{
              fontSize: 12,
              color: isDark ? "#6ee7b7" : "#047857",
              fontWeight: 500,
            }}
          >
            {deadlineLine}
          </div>
        )}
      </div>
    );
  }

  // Parse lines for markdown formatting
  const lines = content.split("\n");

  return (
    <div style={{ position: "relative", lineHeight: 1.65 }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} style={{ height: 8 }} />;
        }

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              style={{
                fontSize: 15,
                fontWeight: 700,
                margin: "10px 0 4px",
                color: isDark ? "#34d399" : "#059669",
              }}
            >
              {renderInline(trimmed.slice(4), isDark)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          return (
            <h3
              key={idx}
              style={{
                fontSize: 16,
                fontWeight: 800,
                margin: "14px 0 6px",
                color: isDark ? "#10b981" : "#047857",
              }}
            >
              {renderInline(trimmed.replace(/^#+\s*/, ""), isDark)}
            </h3>
          );
        }

        // Bullet point
        if (
          trimmed.startsWith("• ") ||
          trimmed.startsWith("* ") ||
          trimmed.startsWith("- ")
        ) {
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                margin: "4px 0",
              }}
            >
              <span
                style={{
                  color: "#10b981",
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: "22px",
                }}
              >
                •
              </span>
              <div style={{ flex: 1 }}>
                {renderInline(trimmed.slice(2), isDark)}
              </div>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                margin: "4px 0",
              }}
            >
              <span
                style={{
                  color: "#10b981",
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: "22px",
                  minWidth: 18,
                }}
              >
                {numMatch[1]}.
              </span>
              <div style={{ flex: 1 }}>
                {renderInline(numMatch[2], isDark)}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} style={{ margin: "4px 0" }}>
            {renderInline(line, isDark)}
          </p>
        );
      })}

      {/* Copy Action Button */}
      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
          padding: "3px 8px",
          background: "transparent",
          border: isDark ? "1px solid #1e3529" : "1px solid #d1fae5",
          borderRadius: 6,
          color: isDark ? "#6ee7b7" : "#059669",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Copy response to clipboard"
      >
        {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
};

// Helper for parsing inline bold and code
function renderInline(text, isDark) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={i}
          style={{
            fontWeight: 700,
            color: isDark ? "#ffffff" : "#0f172a",
          }}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          style={{
            background: isDark ? "#061811" : "#ecfdf5",
            color: isDark ? "#34d399" : "#047857",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: "0.9em",
            fontFamily: "monospace",
            border: isDark ? "1px solid #064e3b" : "1px solid #a7f3d0",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const Chat = ({ currentUser, socket, onLogout }) => {
  // Theme state: dark (default) | light
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("chat_theme") || "dark";
  });
  const isDark = theme === "dark";

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeUser, setActiveUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [clearing, setClearing] = useState(false);

  // Responsive mobile drawer state
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768
  );
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowMobileSidebar(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Clear active conversation history
  const clearCurrentChat = async () => {
    if (!activeUser || !currentUser) return;
    setClearing(true);
    try {
      await axios.delete(
        `${API_URL}/messages/conversation/${currentUser.id}/${activeUser.id}`
      );
      setMessages((prev) => ({
        ...prev,
        [activeUser.id]: [],
      }));
      setFeedback(`Chat history with ${activeUser.displayName} cleared!`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      console.error(err);
      setFeedback("Failed to clear chat history.");
      setTimeout(() => setFeedback(""), 3000);
    } finally {
      setClearing(false);
    }
  };

  // Permanently purge all conversation messages
  const clearAllHistory = async () => {
    if (!currentUser) return;
    if (
      !window.confirm(
        "Are you sure you want to permanently clear all messages across all conversations?"
      )
    )
      return;
    setClearing(true);
    try {
      await axios.delete(`${API_URL}/messages/user/${currentUser.id}/all`);
      setMessages({});
      setFeedback("All conversation history permanently purged!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      console.error(err);
      setFeedback("Failed to purge messages.");
      setTimeout(() => setFeedback(""), 3000);
    } finally {
      setClearing(false);
    }
  };

  // Active attached document (ChatGPT-style pinned context)
  const [activeDocument, setActiveDocument] = useState(() => {
    try {
      const saved = localStorage.getItem("chat_active_document");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setAndSaveActiveDoc = (doc) => {
    setActiveDocument(doc);
    if (doc) {
      localStorage.setItem("chat_active_document", JSON.stringify(doc));
    } else {
      localStorage.removeItem("chat_active_document");
    }
  };

  // Wipe all indexed vectors from Pinecone
  const clearKnowledgeBase = async () => {
    if (
      !window.confirm(
        "Are you sure you want to wipe all indexed documents from the Pinecone vector database?"
      )
    )
      return;
    setClearing(true);
    try {
      await axios.delete(`${API_URL}/documents/clear-all`);
      setAndSaveActiveDoc(null);
      setFeedback("Pinecone vector database wiped successfully!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      console.error(err);
      setFeedback("Failed to wipe vector database.");
      setTimeout(() => setFeedback(""), 3000);
    } finally {
      setClearing(false);
    }
  };

  // Clear app cache and local preferences
  const clearCacheAndData = () => {
    localStorage.removeItem("chat_active_user_id");
    localStorage.removeItem("chat_voice_muted");
    localStorage.removeItem("chat_active_document");
    setActiveDocument(null);
    setFeedback("Local cache & UI preferences reset!");
    setTimeout(() => setFeedback(""), 3000);
  };

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const isStartingRecordingRef = useRef(false);
  const shouldCancelRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Audio playback & Voice controls
  const audioContextRef = useRef(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(() => {
    return localStorage.getItem("chat_voice_muted") === "true";
  });
  const isVoiceMutedRef = useRef(isVoiceMuted);

  const messagesEndRef = useRef(null);

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("chat_theme", nextTheme);
  };

  const toggleVoiceMute = () => {
    const next = !isVoiceMuted;
    setIsVoiceMuted(next);
    isVoiceMutedRef.current = next;
    localStorage.setItem("chat_voice_muted", String(next));
    if (next) {
      stopAiVoice();
    }
  };

  const stopAiVoice = () => {
    if (activeSourcesRef.current.length > 0) {
      activeSourcesRef.current.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch {}
      });
      activeSourcesRef.current = [];
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setIsAiSpeaking(false);
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  const playAudioChunk = async (pcmData) => {
    if (isVoiceMutedRef.current) return;

    initAudioContext();
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    try {
      setIsAiSpeaking(true);

      const sampleRate = 44100;
      const numberOfChannels = 1;
      const numSamples = pcmData.length / 2;

      const audioBuffer = audioContext.createBuffer(
        numberOfChannels,
        numSamples,
        sampleRate
      );

      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(pcmData.buffer);

      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        channelData[i] = int16 / 32768.0;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(
          (s) => s !== source
        );
        if (activeSourcesRef.current.length === 0) {
          setIsAiSpeaking(false);
        }
      };

      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeUser, isTyping]);

  // Load conversation history from API
  const loadConversationHistory = async (targetUserId) => {
    if (!currentUser || !targetUserId) return;
    setLoadingHistory(true);
    try {
      const res = await axios.get(
        `${API_URL}/messages/conversation/${currentUser.id}/${targetUserId}`
      );
      setMessages((prev) => ({
        ...prev,
        [targetUserId]: res.data || [],
      }));
    } catch (err) {
      console.error("Error fetching message history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Initial user list fetch & persistence
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${API_URL}/users`);
        const otherUsers = (res.data || []).filter(
          (u) => u.id !== currentUser.id
        );
        const all = [AI_USER, ...otherUsers];
        setUsers(all);

        const savedActiveId = localStorage.getItem("chat_active_user_id");
        const found = all.find((u) => u.id === savedActiveId);
        const initial = found || AI_USER;
        setActiveUser(initial);
        localStorage.setItem("chat_active_user_id", initial.id);

        loadConversationHistory(initial.id);
      } catch (err) {
        console.error("Failed to load users:", err);
        setActiveUser(AI_USER);
        loadConversationHistory(AI_USER.id);
      }
    };

    fetchUsers();
  }, [currentUser?.id]);

  const handleSelectUser = (user) => {
    if (activeUser?.id === user.id) {
      if (isMobile) setShowMobileSidebar(false);
      return;
    }
    stopAiVoice();
    setActiveUser(user);
    localStorage.setItem("chat_active_user_id", user.id);
    loadConversationHistory(user.id);
    if (isMobile) setShowMobileSidebar(false);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (msg) => {
      const partnerId = msg.from === currentUser.id ? msg.to : msg.from;
      setMessages((prev) => ({
        ...prev,
        [partnerId]: [...(prev[partnerId] || []), msg],
      }));
      setIsTyping(false);
    };

    const handleMessageChunk = ({ chunk }) => {
      setIsTyping(true);
      setMessages((prev) => {
        const botMessages = prev.bot || [];
        const last = botMessages[botMessages.length - 1];

        if (last?.streaming) {
          return {
            ...prev,
            bot: [
              ...botMessages.slice(0, -1),
              {
                ...last,
                content: (last.content || "") + chunk,
              },
            ],
          };
        }

        return {
          ...prev,
          bot: [
            ...botMessages,
            {
              from: "bot",
              content: chunk,
              streaming: true,
              type: "text",
              generatedBy: "bot",
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
    };

    const handleMessageComplete = ({ content }) => {
      setIsTyping(false);
      setMessages((prev) => {
        const botMessages = prev.bot || [];
        const last = botMessages[botMessages.length - 1];

        if (last && last.streaming) {
          return {
            ...prev,
            bot: [
              ...botMessages.slice(0, -1),
              {
                ...last,
                streaming: false,
                content,
              },
            ],
          };
        }

        if (last && last.content?.trim() === content?.trim()) {
          return prev;
        }

        return {
          ...prev,
          bot: [
            ...botMessages,
            {
              from: "bot",
              content,
              streaming: false,
              type: "text",
              generatedBy: "bot",
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
    };

    const handleUserTranscript = ({ transcript }) => {
      if (!transcript) return;
      setMessages((prev) => {
        const botMessages = prev.bot || [];
        const updated = [...botMessages];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (
            updated[i].from === currentUser.id &&
            updated[i].type === "audio"
          ) {
            updated[i] = { ...updated[i], transcript };
            break;
          }
        }
        return { ...prev, bot: updated };
      });
    };

    const handleAudioChunk = ({ audioBase64 }) => {
      if (isVoiceMutedRef.current || !audioBase64) return;
      try {
        const binary = Uint8Array.from(atob(audioBase64), (c) =>
          c.charCodeAt(0)
        );
        playAudioChunk(binary);
      } catch (err) {
        console.error("Audio chunk decode error:", err);
      }
    };

    const handleAudioEnd = ({ transcript }) => {
      if (audioContextRef.current) {
        nextStartTimeRef.current = audioContextRef.current.currentTime;
      }
      setIsTyping(false);

      if (!transcript) return;

      setMessages((prev) => {
        const botMessages = prev.bot || [];
        const last = botMessages[botMessages.length - 1];
        if (last && last.content?.trim() === transcript?.trim()) {
          return prev;
        }
        return {
          ...prev,
          bot: [
            ...botMessages,
            {
              from: "bot",
              content: transcript,
              type: "text",
              generatedBy: "bot",
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
    };

    socket.on("message", handleIncomingMessage);
    socket.on("message_chunk", handleMessageChunk);
    socket.on("message_complete", handleMessageComplete);
    socket.on("user_transcript", handleUserTranscript);
    socket.on("audio_response_chunk", handleAudioChunk);
    socket.on("audio_response_end", handleAudioEnd);

    return () => {
      socket.off("message", handleIncomingMessage);
      socket.off("message_chunk", handleMessageChunk);
      socket.off("message_complete", handleMessageComplete);
      socket.off("user_transcript", handleUserTranscript);
      socket.off("audio_response_chunk", handleAudioChunk);
      socket.off("audio_response_end", handleAudioEnd);
    };
  }, [socket, currentUser?.id]);

  // Send text message
  const sendMessage = () => {
    if (!message.trim() || !activeUser || !socket) return;

    const newMsg = {
      from: currentUser.id,
      to: activeUser.id,
      content: message.trim(),
      documentName: activeUser.id === "bot" ? activeDocument?.name : undefined,
      createdAt: new Date().toISOString(),
    };

    socket.emit("message", newMsg);

    setMessages((prev) => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), newMsg],
    }));

    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick Prompt chip clicked
  const handleQuickPrompt = (promptText) => {
    if (!socket) return;
    const newMsg = {
      from: currentUser.id,
      to: "bot",
      content: promptText,
      documentName: activeDocument?.name,
      createdAt: new Date().toISOString(),
    };
    socket.emit("message", newMsg);
    setMessages((prev) => ({
      ...prev,
      bot: [...(prev.bot || []), newMsg],
    }));
  };

  // Document Upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (currentUser?.id) {
      formData.append("userId", currentUser.id);
    }

    setIsUploading(true);
    try {
      await axios.post(`${API_URL}/upload-document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const docMeta = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        uploadedAt: new Date().toISOString(),
      };
      setAndSaveActiveDoc(docMeta);

      const botUser = users.find((u) => u.id === "bot") || AI_USER;
      setActiveUser(botUser);
      localStorage.setItem("chat_active_user_id", "bot");

      setMessages((prev) => ({
        ...prev,
        bot: [
          ...(prev.bot || []),
          {
            from: "bot",
            content: `📄 **${file.name}** is attached and indexed! Your chat is now strictly focused on this document. You can ask questions, ask for a full summary, or query specific details.`,
            type: "text",
            generatedBy: "bot",
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } catch (err) {
      console.error("Document upload error:", err);
      alert(`❌ Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Audio Recording (Deepgram STT)
  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const sendAudio = async (audioBlob) => {
    if (!activeUser || !audioBlob || audioBlob.size < 1500 || !socket) return;

    const base64Audio = await blobToBase64(audioBlob);
    const audioMsg = {
      from: currentUser.id,
      to: activeUser.id,
      type: "audio",
      audio: URL.createObjectURL(audioBlob),
      mimeType: audioBlob.type,
      createdAt: new Date().toISOString(),
    };

    socket.emit("audio_message", {
      from: currentUser.id,
      to: activeUser.id,
      audioBase64: base64Audio,
      mimeType: audioBlob.type,
      documentName: activeUser.id === "bot" ? activeDocument?.name : undefined,
    });

    setMessages((prev) => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), audioMsg],
    }));
  };

  const startRecording = async () => {
    if (isRecording || isStartingRecordingRef.current) return;
    isStartingRecordingRef.current = true;
    shouldCancelRecordingRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let selectedMimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          selectedMimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          selectedMimeType = "audio/mp4";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        clearInterval(recordingTimerRef.current);
        const duration = Date.now() - recordingStartTimeRef.current;

        if (shouldCancelRecordingRef.current) {
          audioChunksRef.current = [];
        } else if (duration < 600) {
          alert("Recording too short. Speak for at least 1 second.");
        } else {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: selectedMimeType,
          });
          if (audioBlob.size >= 2500) {
            sendAudio(audioBlob);
          } else {
            alert("No clear audio captured. Please speak closer to your mic.");
          }
        }

        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone permission denied or not available.");
      setIsRecording(false);
    } finally {
      isStartingRecordingRef.current = false;
    }
  };

  const stopRecording = (cancel = false) => {
    shouldCancelRecordingRef.current = cancel;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording(false);
    } else {
      startRecording();
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const currentMessages = activeUser ? messages[activeUser.id] || [] : [];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        background: isDark ? "#09090b" : "#f4f7f5",
        color: isDark ? "#f8fafc" : "#0f172a",
      }}
    >
      {/* ============================================================ */}
      {/* 🧭 SIDEBAR - Mobile Responsive Drawer / Desktop Sidebar     */}
      {/* ============================================================ */}
      {/* Mobile Backdrop */}
      {isMobile && showMobileSidebar && (
        <div
          onClick={() => setShowMobileSidebar(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 45,
          }}
        />
      )}

      <aside
        style={{
          width: isMobile ? "85%" : 320,
          maxWidth: isMobile ? 340 : 320,
          minWidth: isMobile ? 0 : 320,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRight: isDark ? "1px solid #1a2620" : "1px solid #e2e8f0",
          background: isDark ? "#0c120f" : "#ffffff",
          boxShadow: isDark
            ? "4px 0 24px rgba(0, 0, 0, 0.6)"
            : "4px 0 20px rgba(0, 0, 0, 0.04)",
          position: isMobile ? "fixed" : "relative",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: isMobile ? 50 : 10,
          transform: isMobile
            ? showMobileSidebar
              ? "translateX(0)"
              : "translateX(-100%)"
            : "none",
          transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* User Profile Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: isDark ? "1px solid #1a2620" : "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                position: "relative",
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 15,
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
              }}
            >
              {getInitials(currentUser?.displayName)}
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#10b981",
                  border: isDark ? "2px solid #0c120f" : "2px solid #ffffff",
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: isDark ? "#f8fafc" : "#0f172a",
                  lineHeight: 1.2,
                }}
              >
                {currentUser?.displayName}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: isDark ? "#6ee7b7" : "#059669",
                  marginTop: 2,
                  fontWeight: 500,
                }}
              >
                @{currentUser?.username || "user"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                background: isDark ? "#121b16" : "#f8fafc",
                color: isDark ? "#34d399" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Settings & Data Management"
            >
              <Settings size={16} />
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                background: isDark ? "#121b16" : "#f8fafc",
                color: isDark ? "#fcd34d" : "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                background: isDark ? "#121b16" : "#f8fafc",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>

            {/* Close Mobile Sidebar Drawer */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setShowMobileSidebar(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                  background: isDark ? "#121b16" : "#f8fafc",
                  color: isDark ? "#94a3b8" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title="Close Sidebar"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 10,
              background: isDark ? "#121a15" : "#f1f5f9",
              border: isDark ? "1px solid #1e3025" : "1px solid #e2e8f0",
            }}
          >
            <Search size={16} color={isDark ? "#6ee7b7" : "#059669"} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 13,
                color: isDark ? "#f8fafc" : "#0f172a",
                width: "100%",
              }}
            />
            {searchQuery && (
              <X
                size={14}
                style={{ cursor: "pointer", opacity: 0.7 }}
                onClick={() => setSearchQuery("")}
              />
            )}
          </div>
        </div>

        {/* Channels / Users List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 10px 12px 10px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: isDark ? "#4ade80" : "#059669",
              padding: "8px 10px 6px",
            }}
          >
            Conversations ({filteredUsers.length})
          </div>

          {filteredUsers.map((u) => {
            const isSelected = activeUser?.id === u.id;
            const isBot = u.id === "bot";

            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  marginBottom: 4,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: isSelected
                    ? isDark
                      ? "#064e3b44"
                      : "#ecfdf5"
                    : "transparent",
                  border: isSelected
                    ? isDark
                      ? "1px solid #10b98166"
                      : "1px solid #a7f3d0"
                    : "1px solid transparent",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    position: "relative",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                    background: isBot
                      ? "linear-gradient(135deg, #10b981, #047857)"
                      : "linear-gradient(135deg, #059669, #065f46)",
                    boxShadow: isBot
                      ? "0 2px 12px rgba(16, 185, 129, 0.4)"
                      : "0 2px 8px rgba(5, 150, 105, 0.25)",
                  }}
                >
                  {isBot ? <Bot size={20} /> : getInitials(u.displayName)}
                  {!isBot && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: "#10b981",
                        border: isDark
                          ? "2px solid #0c120f"
                          : "2px solid #ffffff",
                      }}
                    />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? 700 : 600,
                        color: isSelected
                          ? isDark
                            ? "#34d399"
                            : "#065f46"
                          : isDark
                          ? "#e2e8f0"
                          : "#334155",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {u.displayName}
                    </span>
                    {isBot && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: isDark ? "#064e3b" : "#d1fae5",
                          color: isDark ? "#34d399" : "#047857",
                          letterSpacing: "0.05em",
                        }}
                      >
                        AI BOT
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isDark ? "#94a3b8" : "#64748b",
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isBot
                      ? "RAG Q&A, Voice & Tasks"
                      : `@${u.username || u.id}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 💬 MAIN CHAT AREA - Emerald Green & Deep Obsidian Theme      */}
      {/* ============================================================ */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          background: isDark ? "#080c0a" : "#f8fafc",
        }}
      >
        {/* Chat Header */}
        <header
          style={{
            height: 68,
            padding: isMobile ? "0 12px" : "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: isDark ? "1px solid #1a2620" : "1px solid #e2e8f0",
            background: isDark ? "#0c120f" : "#ffffff",
            boxShadow: isDark
              ? "0 4px 16px rgba(0,0,0,0.4)"
              : "0 2px 8px rgba(0,0,0,0.02)",
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 14,
              minWidth: 0,
            }}
          >
            {/* Mobile Hamburger Menu Button */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setShowMobileSidebar(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                  background: isDark ? "#121b16" : "#f1f5f9",
                  color: isDark ? "#34d399" : "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                title="Open Conversations"
              >
                <Menu size={18} />
              </button>
            )}

            <div
              style={{
                width: isMobile ? 38 : 44,
                height: isMobile ? 38 : 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                flexShrink: 0,
                background:
                  activeUser?.id === "bot"
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "linear-gradient(135deg, #059669, #065f46)",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
              }}
            >
              {activeUser?.id === "bot" ? (
                <Bot size={isMobile ? 19 : 22} />
              ) : (
                getInitials(activeUser?.displayName)
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: isMobile ? 14 : 16,
                  color: isDark ? "#f8fafc" : "#0f172a",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeUser?.displayName || "Select Conversation"}
              </div>
              <div
                style={{
                  fontSize: isMobile ? 11 : 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                  color: isDark ? "#94a3b8" : "#64748b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {isTyping && activeUser?.id === "bot" ? (
                  <span
                    style={{
                      color: "#10b981",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Sparkles size={13} /> {isMobile ? "Thinking..." : "Thinking & searching..."}
                  </span>
                ) : isAiSpeaking && activeUser?.id === "bot" ? (
                  <span
                    style={{
                      color: "#34d399",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#10b981",
                        display: "inline-block",
                      }}
                    />
                    {isMobile ? "Speaking..." : "Speaking aloud..."}
                  </span>
                ) : (
                  <span>
                    {activeUser?.id === "bot"
                      ? isMobile
                        ? "RAG Assistant"
                        : "Ready to search documents & answer questions"
                      : "Direct Message"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            {activeUser?.id === "bot" && (
              <>
                {/* Stop Voice button */}
                {isAiSpeaking && (
                  <button
                    type="button"
                    onClick={stopAiVoice}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: isMobile ? "6px 10px" : "6px 14px",
                      background: "#ef4444",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 10px rgba(239, 68, 68, 0.4)",
                    }}
                    title="Stop AI voice reading immediately"
                  >
                    <Square size={12} fill="#ffffff" />
                    {!isMobile && <span>Stop Voice</span>}
                  </button>
                )}

                {/* Voice Mute Toggle */}
                <button
                  type="button"
                  onClick={toggleVoiceMute}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: isMobile ? "6px 10px" : "6px 14px",
                    borderRadius: 20,
                    border: isDark ? "1px solid #1e3529" : "1px solid #a7f3d0",
                    background: isVoiceMuted
                      ? isDark
                        ? "#121b16"
                        : "#f1f5f9"
                      : isDark
                      ? "#064e3b"
                      : "#ecfdf5",
                    color: isVoiceMuted
                      ? isDark
                        ? "#94a3b8"
                        : "#64748b"
                      : isDark
                      ? "#6ee7b7"
                      : "#047857",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title={
                    isVoiceMuted
                      ? "Enable Voice Output"
                      : "Mute Voice Output"
                  }
                >
                  {isVoiceMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  {!isMobile && <span>{isVoiceMuted ? "Voice Muted" : "Voice On"}</span>}
                </button>
              </>
            )}

            {/* Refresh history button */}
            {activeUser && (
              <button
                type="button"
                onClick={() => loadConversationHistory(activeUser.id)}
                disabled={loadingHistory}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                  background: isDark ? "#121b16" : "#f8fafc",
                  color: isDark ? "#6ee7b7" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="Reload conversation history"
              >
                <RefreshCw
                  size={15}
                  style={{
                    animation: loadingHistory
                      ? "spin 1s linear infinite"
                      : "none",
                  }}
                />
              </button>
            )}

            {/* Settings button in header */}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                background: isDark ? "#121b16" : "#f8fafc",
                color: isDark ? "#34d399" : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Settings & Data Storage"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "14px 10px" : "20px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Welcome Screen if empty bot chat */}
          {activeUser?.id === "bot" && currentMessages.length === 0 && (
            <div
              style={{
                margin: "auto",
                maxWidth: 580,
                width: "100%",
                textAlign: "center",
                padding: isMobile ? "24px 14px" : 32,
                borderRadius: 20,
                background: isDark ? "#0f1612" : "#ffffff",
                border: isDark ? "1px solid #1e3529" : "1px solid #a7f3d0",
                boxShadow: isDark
                  ? "0 4px 24px rgba(0,0,0,0.5), 0 0 30px rgba(16, 185, 129, 0.05)"
                  : "0 4px 20px rgba(0,0,0,0.04)",
              }}
            >
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
                  boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)",
                }}
              >
                <Bot size={30} />
              </div>
              <h2
                style={{
                  fontSize: isMobile ? 19 : 22,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  color: isDark ? "#f8fafc" : "#0f172a",
                }}
              >
                How can I assist you today?
              </h2>
              <p
                style={{
                  fontSize: isMobile ? 13 : 14,
                  color: isDark ? "#94a3b8" : "#64748b",
                  margin: "0 0 24px",
                  lineHeight: 1.5,
                }}
              >
                Upload any PDF, document, or resume using the paperclip 📎, or ask
                me questions by typing or speaking through your microphone 🎤.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                  textAlign: "left",
                }}
              >
                <div
                  onClick={() =>
                    handleQuickPrompt(
                      "Summarize the uploaded document and main points."
                    )
                  }
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: isDark ? "#090f0c" : "#f1f5f9",
                    border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#10b981")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = isDark
                      ? "#1e3529"
                      : "#e2e8f0")
                  }
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDark ? "#34d399" : "#059669",
                    }}
                  >
                    📋 Summarize Document
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isDark ? "#94a3b8" : "#64748b",
                      marginTop: 3,
                    }}
                  >
                    Extract key points & executive summary
                  </div>
                </div>

                <div
                  onClick={() =>
                    handleQuickPrompt(
                      "What are the key technical skills and qualifications mentioned?"
                    )
                  }
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: isDark ? "#090f0c" : "#f1f5f9",
                    border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#10b981")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = isDark
                      ? "#1e3529"
                      : "#e2e8f0")
                  }
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDark ? "#34d399" : "#059669",
                    }}
                  >
                    🛠️ Technical Skills
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isDark ? "#94a3b8" : "#64748b",
                      marginTop: 3,
                    }}
                  >
                    Query tools, languages & qualifications
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {currentMessages.map((m, idx) => {
            const isMe = m.from === currentUser.id;
            const isBot = m.from === "bot" || m.generatedBy === "bot";

            return (
              <div
                key={m.id || idx}
                style={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 10,
                }}
              >
                {!isMe && (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: isBot
                        ? "linear-gradient(135deg, #10b981, #047857)"
                        : "linear-gradient(135deg, #059669, #065f46)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    {isBot ? (
                      <Bot size={18} />
                    ) : (
                      getInitials(activeUser?.displayName)
                    )}
                  </div>
                )}

                <div
                  style={{
                    maxWidth: isMobile ? "90%" : "75%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMe ? "flex-end" : "flex-start",
                  }}
                >
                  {isBot && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#10b981",
                        marginBottom: 4,
                        marginLeft: 4,
                      }}
                    >
                      <Sparkles size={12} />
                      AI Assistant
                    </div>
                  )}

                  <div
                    style={{
                      padding: isMobile ? "10px 14px" : "12px 18px",
                      borderRadius: isMe
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      background: isMe
                        ? "linear-gradient(135deg, #059669, #10b981)"
                        : isDark
                        ? "#111714"
                        : "#ffffff",
                      color: isMe
                        ? "#ffffff"
                        : isDark
                        ? "#f1f5f9"
                        : "#0f172a",
                      boxShadow: isDark
                        ? "0 2px 14px rgba(0, 0, 0, 0.4)"
                        : "0 2px 10px rgba(0, 0, 0, 0.05)",
                      border: isMe
                        ? "none"
                        : isDark
                        ? "1px solid #1c2b23"
                        : "1px solid #e2e8f0",
                      fontSize: isMobile ? 13 : 14,
                      wordBreak: "break-word",
                    }}
                  >
                    {m.type === "audio" ? (
                      <div>
                        <audio
                          controls
                          src={m.audio}
                          style={{
                            display: "block",
                            width: "100%",
                            maxWidth: 240,
                            height: 38,
                            borderRadius: 8,
                          }}
                        />
                        {m.transcript && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              opacity: 0.9,
                              fontStyle: "italic",
                              color: isMe ? "#ecfdf5" : isDark ? "#a7f3d0" : "#065f46",
                              lineHeight: 1.4,
                            }}
                          >
                            🗣️ "{m.transcript}"
                          </div>
                        )}
                      </div>
                    ) : isBot ? (
                      <FormattedMessage content={m.content} isDark={isDark} />
                    ) : (
                      m.content
                    )}

                    <div
                      style={{
                        fontSize: 10,
                        opacity: 0.6,
                        marginTop: 6,
                        textAlign: "right",
                      }}
                    >
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>

                {isMe && (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(currentUser?.displayName)}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {activeUser?.id === "bot" && (
          <div
            style={{
              padding: isMobile ? "0 10px 8px" : "0 28px 8px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            <button
              type="button"
              onClick={() =>
                handleQuickPrompt(
                  "Summarize the uploaded resume or document content."
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: isDark ? "#121b16" : "#ecfdf5",
                color: isDark ? "#6ee7b7" : "#047857",
                border: isDark ? "1px solid #1e3529" : "1px solid #a7f3d0",
              }}
            >
              📋 Summarize
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickPrompt(
                  "What skills and tools are listed in this document?"
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: isDark ? "#121b16" : "#ecfdf5",
                color: isDark ? "#6ee7b7" : "#047857",
                border: isDark ? "1px solid #1e3529" : "1px solid #a7f3d0",
              }}
            >
              🛠️ Tech Stack
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickPrompt(
                  "What work experience or roles are mentioned?"
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: isDark ? "#121b16" : "#ecfdf5",
                color: isDark ? "#6ee7b7" : "#047857",
                border: isDark ? "1px solid #1e3529" : "1px solid #a7f3d0",
              }}
            >
              💼 Experience
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickPrompt(
                  "Assign a task to Test User to review the project by tomorrow."
                )
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: isDark ? "#121b16" : "#ecfdf5",
                color: isDark ? "#6ee7b7" : "#047857",
                border: isDark ? "1px solid #1e3529" : "1px solid #a7f3d0",
              }}
            >
              🤝 Delegate Task
            </button>
          </div>
        )}

        {/* Active Speaking Banner */}
        {activeUser?.id === "bot" && isAiSpeaking && (
          <div
            style={{
              margin: isMobile ? "0 10px 8px" : "0 28px 10px",
              padding: isMobile ? "8px 12px" : "8px 16px",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: isDark ? "#064e3b" : "#ecfdf5",
              border: isDark ? "1px solid #10b981" : "1px solid #a7f3d0",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: isDark ? "#a7f3d0" : "#047857",
              }}
            >
              <Volume2 size={16} />
              <span>{isMobile ? "AI speaking aloud..." : "AI is reading its answer out loud..."}</span>
            </div>
            <button
              type="button"
              onClick={stopAiVoice}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "5px 12px",
                borderRadius: 16,
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Square size={12} fill="#ffffff" />
              Stop
            </button>
          </div>
        )}

        {/* Input Bar Dock */}
        <div
          style={{
            padding: isMobile ? "0 10px 14px" : "0 28px 24px",
          }}
        >
          {/* ChatGPT-Style Active Document Attachment Chip */}
          {activeDocument && activeUser?.id === "bot" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                marginBottom: 10,
                borderRadius: 14,
                maxWidth: isMobile ? "100%" : "auto",
                background: isDark ? "#06281c" : "#ecfdf5",
                border: isDark ? "1px solid #10b98155" : "1px solid #a7f3d0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: isDark ? "#064e3b" : "#d1fae5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981",
                }}
              >
                <FileText size={15} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isDark ? "#f8fafc" : "#0f172a",
                    maxWidth: 240,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={activeDocument.name}
                >
                  {activeDocument.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: isDark ? "#34d399" : "#059669",
                    fontWeight: 600,
                  }}
                >
                  Document Context Attached ({activeDocument.size})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAndSaveActiveDoc(null)}
                title="Detach document from context"
                style={{
                  marginLeft: 6,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "none",
                  background: isDark ? "#14251c" : "#e2e8f0",
                  color: isDark ? "#94a3b8" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 24,
              background: isDark ? "#0c120f" : "#ffffff",
              border: isDark ? "1px solid #1f3328" : "1px solid #cbd5e1",
              boxShadow: isDark
                ? "0 4px 20px rgba(0,0,0,0.5)"
                : "0 4px 16px rgba(0,0,0,0.06)",
            }}
          >
            {/* Document Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.pdf,.docx,.doc,.pptx,.ppt,.json,.md,.csv"
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: "none",
                background: isUploading
                  ? "#fbbf24"
                  : isDark
                  ? "#14201a"
                  : "#f1f5f9",
                color: isUploading
                  ? "#000000"
                  : isDark
                  ? "#34d399"
                  : "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isUploading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
              title="Upload document (.pdf, .txt, .docx, .pptx)"
            >
              <Paperclip size={18} />
            </button>

            {/* If recording audio: Live Timer mode */}
            {isRecording ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#ef4444",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#ef4444",
                      animation: "pulse 1s infinite",
                    }}
                  />
                  <span>
                    Recording voice: {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 14,
                      border: "none",
                      background: isDark ? "#1f2d26" : "#e2e8f0",
                      color: isDark ? "#cbd5e1" : "#475569",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 14,
                      border: "none",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Done & Send
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeUser?.id === "bot"
                    ? isMobile
                      ? "Ask about document, or delegate..."
                      : "Ask a question about the document, or delegate a task..."
                    : `Message ${activeUser?.displayName || ""}...`
                }
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: 14,
                  color: isDark ? "#f8fafc" : "#0f172a",
                  padding: "6px 8px",
                }}
              />
            )}

            {/* Toggle Microphone Button */}
            {!isRecording && (
              <button
                type="button"
                onClick={toggleRecording}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background: isDark ? "#14201a" : "#f1f5f9",
                  color: isDark ? "#34d399" : "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title="Click to speak (Microphone)"
              >
                <Mic size={18} />
              </button>
            )}

            {/* Send Button */}
            {!isRecording && (
              <button
                type="button"
                onClick={sendMessage}
                disabled={!message.trim()}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background: message.trim()
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : isDark
                    ? "#1a2620"
                    : "#e2e8f0",
                  color: message.trim() ? "#022c22" : isDark ? "#4b5563" : "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: message.trim() ? "pointer" : "not-allowed",
                  boxShadow: message.trim()
                    ? "0 2px 10px rgba(16, 185, 129, 0.35)"
                    : "none",
                  transition: "all 0.15s ease",
                }}
                title="Send Message"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* ⚙️ SETTINGS & DATA STORAGE MODAL                             */}
      {/* ============================================================ */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? 12 : 20,
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              background: isDark ? "#0f1612" : "#ffffff",
              border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
              borderRadius: 20,
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.1)",
              padding: isMobile ? "20px 16px" : "24px 28px",
              position: "relative",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 16,
                borderBottom: isDark
                  ? "1px solid #1e3529"
                  : "1px solid #f1f5f9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: isDark ? "#064e3b" : "#ecfdf5",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Settings size={20} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 800,
                      color: isDark ? "#f8fafc" : "#0f172a",
                    }}
                  >
                    Settings & Storage
                  </h3>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: isDark ? "#94a3b8" : "#64748b",
                    }}
                  >
                    Manage chat history, local cache, and assistant options
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: isDark ? "#121b16" : "#f1f5f9",
                  color: isDark ? "#94a3b8" : "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Notification Banner */}
            {feedback && (
              <div
                style={{
                  margin: "16px 0 8px",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: isDark ? "#064e3b" : "#ecfdf5",
                  border: "1px solid #10b981",
                  color: isDark ? "#a7f3d0" : "#047857",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Check size={16} color="#10b981" />
                <span>{feedback}</span>
              </div>
            )}

            {/* Section 1: Chat History */}
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: isDark ? "#4ade80" : "#059669",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Trash2 size={14} />
                <span>Chat History Management</span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {/* Clear Current Chat */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: isDark ? "#121b16" : "#f8fafc",
                    border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isDark ? "#f8fafc" : "#0f172a",
                      }}
                    >
                      Clear Active Conversation
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: isDark ? "#94a3b8" : "#64748b",
                        marginTop: 2,
                      }}
                    >
                      Delete history with{" "}
                      {activeUser?.displayName || "selected user"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearCurrentChat}
                    disabled={clearing}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: isDark ? "#1e3529" : "#e2e8f0",
                      color: isDark ? "#6ee7b7" : "#065f46",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: clearing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Clear Chat</span>
                  </button>
                </div>

                {/* Clear All History */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: isDark ? "#121b16" : "#f8fafc",
                    border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#ef4444",
                      }}
                    >
                      Purge All Conversations
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: isDark ? "#94a3b8" : "#64748b",
                        marginTop: 2,
                      }}
                    >
                      Permanently delete all messages from MongoDB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAllHistory}
                    disabled={clearing}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: clearing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Purge All</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Data & Local Cache */}
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: isDark ? "#4ade80" : "#059669",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Database size={14} />
                <span>Data Cache & Local Storage</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: isDark ? "#121b16" : "#f8fafc",
                  border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDark ? "#f8fafc" : "#0f172a",
                    }}
                  >
                    Clear Cache & Reset Preferences
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isDark ? "#94a3b8" : "#64748b",
                      marginTop: 2,
                    }}
                  >
                    Reset saved conversation selection and audio states
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearCacheAndData}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: isDark ? "#1e3529" : "#e2e8f0",
                    color: isDark ? "#6ee7b7" : "#065f46",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Database size={13} />
                  <span>Clear Cache</span>
                </button>
              </div>

              {/* Wipe Pinecone Vector Database */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: isDark ? "#121b16" : "#f8fafc",
                  border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                  marginTop: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#f59e0b",
                    }}
                  >
                    Wipe Pinecone Knowledge Base
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: isDark ? "#94a3b8" : "#64748b",
                      marginTop: 2,
                    }}
                  >
                    Purge all uploaded document vectors from Pinecone
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearKnowledgeBase}
                  disabled={clearing}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: isDark ? "#291e0a" : "#fef3c7",
                    color: isDark ? "#fcd34d" : "#b45309",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: clearing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Wipe Vectors</span>
                </button>
              </div>
            </div>

            {/* Section 3: System Status */}
            <div
              style={{
                marginTop: 20,
                padding: "12px 14px",
                borderRadius: 12,
                background: isDark ? "#090f0c" : "#f1f5f9",
                border: isDark ? "1px solid #1e3529" : "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} color="#10b981" />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isDark ? "#cbd5e1" : "#475569",
                  }}
                >
                  Pinecone Vector Index (1024-dim llama-text-embed-v2)
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: isDark ? "#064e3b" : "#d1fae5",
                  color: isDark ? "#34d399" : "#047857",
                }}
              >
                ONLINE & READY
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
