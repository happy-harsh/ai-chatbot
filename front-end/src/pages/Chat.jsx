import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
const AI_USER = {
  id: "bot",
  displayName: "AI Assistant 🤖",
  isSystem: true,
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const Chat = ({ currentUser, socket }) => {
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const isStartingRecordingRef = useRef(false);
  const shouldCancelRecordingRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await axios.post(`${API_URL}/upload-document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Switch active chat to AI Assistant so the user can immediately ask questions
      const botUser = users.find((u) => u.id === "bot") || AI_USER;
      setActiveUser(botUser);

      // Post an immediate confirmation message in the bot chat
      setMessages((prev) => ({
        ...prev,
        bot: [
          ...(prev.bot || []),
          {
            from: "bot",
            content: `📄 **${file.name}** is indexed and ready! You can now ask me any question about it.\n\nTry asking:\n• "Can you summarize this document?"\n• "What are the main skills or points mentioned?"\n• Or any specific detail from "${file.name}"`,
            type: "text",
            generatedBy: "bot",
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

  // Audio playback refs & voice controls
  const audioContextRef = useRef(null);
  const audioBufferQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const isVoiceMutedRef = useRef(false);

  // Stop AI voice reading immediately
  const stopAiVoice = () => {
    if (activeSourcesRef.current.length > 0) {
      activeSourcesRef.current.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
    setIsAiSpeaking(false);
  };

  // Toggle voice mute on/off
  const toggleVoiceMute = () => {
    setIsVoiceMuted((prev) => {
      const nextVal = !prev;
      isVoiceMutedRef.current = nextVal;
      if (nextVal) {
        stopAiVoice();
      }
      return nextVal;
    });
  };

  // Initialize Web Audio API context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || window.webkitAudioContext
      )();
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  // Play audio chunk using Web Audio API
  const playAudioChunk = async (pcmData) => {
    if (isVoiceMutedRef.current) return;

    initAudioContext();
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    try {
      setIsAiSpeaking(true);

      // PCM data is 16-bit signed integers at 44100 Hz
      const sampleRate = 44100;
      const numberOfChannels = 1; // mono
      const numSamples = pcmData.length / 2; // 2 bytes per sample (16-bit)

      // Create an AudioBuffer
      const audioBuffer = audioContext.createBuffer(
        numberOfChannels,
        numSamples,
        sampleRate,
      );

      // Convert PCM bytes to Float32Array for Web Audio API
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(pcmData.buffer);

      for (let i = 0; i < numSamples; i++) {
        // Read 16-bit signed integer and convert to float (-1.0 to 1.0)
        const int16 = dataView.getInt16(i * 2, true); // true = little endian
        channelData[i] = int16 / 32768.0;
      }

      // Create a buffer source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setIsAiSpeaking(false);
        }
      };

      // Schedule playback
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
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
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          selectedMimeType = "audio/webm";
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
          console.log("Recording cancelled by user.");
        } else if (duration < 1200) {
          alert("Recording too short. Please speak for at least 1-2 seconds.");
        } else {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: selectedMimeType,
          });
          console.log("Recorded audioBlob size:", audioBlob.size, "duration:", duration);

          if (audioBlob.size >= 2500) {
            sendAudio(audioBlob);
          } else {
            alert("No clear audio captured. Please speak closer to your microphone.");
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
      console.error("Microphone access denied:", err);
      alert("Microphone access was denied or not available.");
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeUser]);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get(`${API_URL}/users`);
      const otherUsers = res.data.filter((u) => u.id !== currentUser.id);
      setUsers([...otherUsers, AI_USER]);
    };
    fetchUsers();

    // Handle audio response chunks
    socket.on("audio_response_chunk", ({ audioBase64, mimeType }) => {
      if (isVoiceMutedRef.current) return;
      console.log("Received audio chunk, size:", audioBase64.length);

      // Decode base64 to binary
      const binary = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

      // Play the chunk immediately
      playAudioChunk(binary);
    });

    // Handle audio response end
    socket.on("audio_response_end", ({ transcript }) => {
      console.log("Audio playback complete, transcript:", transcript);

      // Reset audio timing for next message
      if (audioContextRef.current) {
        nextStartTimeRef.current = audioContextRef.current.currentTime;
      }
      setIsTyping(false);

      if (!transcript) return;

      // Add bot's answer only if not already added by message_complete or streaming
      setMessages((prev) => {
        const botMessages = prev.bot || [];
        const last = botMessages[botMessages.length - 1];
        if (
          last &&
          (last.content === transcript ||
            last.content?.trim() === transcript?.trim())
        ) {
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
            },
          ],
        };
      });
    });

    // Handle user's speech transcription display
    socket.on("user_transcript", ({ transcript }) => {
      if (!transcript) return;
      setMessages((prev) => {
        const botMessages = prev.bot || [];
        const updated = [...botMessages];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].from === currentUser.id && updated[i].type === "audio") {
            updated[i] = { ...updated[i], transcript };
            break;
          }
        }
        return { ...prev, bot: updated };
      });
    });

    // Handle regular messages
    socket.on("message", (msg) => {
      console.log(msg, "message");
      setMessages((prev) => ({
        ...prev,
        [msg.from]: [...(prev[msg.from] || []), msg],
      }));
      setIsTyping(false);
    });

    // Handle streaming chunks from AI
    socket.on("message_chunk", ({ chunk }) => {
      console.log(chunk, "text chunk");
      setIsTyping(true);

      setMessages((prev) => {
        const botMessages = prev.bot || [];
        const last = botMessages[botMessages.length - 1];

        // If already streaming, append
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

        // First chunk → create streaming message
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
            },
          ],
        };
      });
    });

    // Handle message completion
    socket.on("message_complete", ({ from, content }) => {
      setIsTyping(false);
      setMessages((prev) => {
        const userMessages = prev[from] || [];
        const lastMessage = userMessages[userMessages.length - 1];

        // If last message was streaming, mark it as complete
        if (lastMessage && lastMessage.streaming) {
          const completedMessage = {
            ...lastMessage,
            streaming: false,
            content: lastMessage.content,
          };
          return {
            ...prev,
            [from]: [...userMessages.slice(0, -1), completedMessage],
          };
        }

        // Otherwise, add as a new complete message
        return {
          ...prev,
          [from]: [
            ...userMessages,
            {
              from,
              content,
              streaming: false,
              type: "text",
              generatedBy: from === "bot" ? "bot" : undefined,
            },
          ],
        };
      });
    });

    return () => {
      socket.off("message");
      socket.off("message_chunk");
      socket.off("message_complete");
      socket.off("audio_response_chunk");
      socket.off("audio_response_end");

      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (!activeUser || !message.trim()) return;

    const msg = {
      from: currentUser.id,
      to: activeUser.id,
      content: message,
      type: "text",
    };

    socket.emit("message", msg);

    setMessages((prev) => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), msg],
    }));

    setMessage("");
  };

  const handleQuickPrompt = (promptText) => {
    if (!activeUser || !promptText.trim()) return;

    const msg = {
      from: currentUser.id,
      to: activeUser.id,
      content: promptText,
      type: "text",
    };

    socket.emit("message", msg);

    setMessages((prev) => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), msg],
    }));
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const sendAudio = async (audioBlob) => {
    if (!activeUser || !audioBlob || audioBlob.size < 1500) return;

    const base64Audio = await blobToBase64(audioBlob);

    const audioMsg = {
      from: currentUser.id,
      to: activeUser.id,
      type: "audio",
      audio: URL.createObjectURL(audioBlob),
      mimeType: audioBlob.type,
    };

    socket.emit("audio_message", {
      from: currentUser.id,
      to: activeUser.id,
      audioBase64: base64Audio,
      mimeType: audioBlob.type,
    });

    setMessages((prev) => ({
      ...prev,
      [activeUser.id]: [...(prev[activeUser.id] || []), audioMsg],
    }));
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id) => {
    const colors = [
      "#667eea",
      "#f56565",
      "#48bb78",
      "#ed8936",
      "#9f7aea",
      "#38b2ac",
      "#ed64a6",
      "#4299e1",
    ];
    const index = id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const handleSelectUser = async (user) => {
    setActiveUser(user);

    try {
      const res = await axios.get(
        `${API_URL}/messages/conversation/${currentUser.id}/${user.id}`,
      );
      console.log(res, "response");
      setMessages((prev) => ({
        ...prev,
        [user.id]: res.data,
      }));
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.currentUserAvatar}>
            <div
              style={{
                ...styles.avatarCircle,
                background: getAvatarColor(currentUser.id),
              }}
            >
              {getInitials(currentUser.displayName)}
            </div>
            <div style={styles.currentUserInfo}>
              <div style={styles.currentUserName}>
                {currentUser.displayName}
              </div>
              <div style={styles.onlineStatus}>
                <span style={styles.onlineDot}></span>
                Online
              </div>
            </div>
          </div>
        </div>

        <h3 style={styles.sidebarTitle}>Messages</h3>
        <div style={styles.usersList}>
          {users.map((u) => {
            const isActive = activeUser?.id === u.id;

            const lastMsgObj = messages[u.id]?.[messages[u.id].length - 1];

            const lastMessage = lastMsgObj
              ? lastMsgObj.type === "audio"
                ? "🎤 Voice message"
                : (lastMsgObj.content || "").slice(0, 40) + "..."
              : "Start a conversation";

            return (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                style={{
                  ...styles.userItem,
                  background: isActive ? "#eef2ff" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #667eea"
                    : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    ...styles.userAvatar,
                    background:
                      u.id === "bot"
                        ? "linear-gradient(135deg, #667eea, #764ba2)"
                        : getAvatarColor(u.id),
                  }}
                >
                  {u.id === "bot" ? "🤖" : getInitials(u.displayName)}
                </div>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>{u.displayName}</div>
                  <div style={styles.userPreview}>{lastMessage}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat */}
      <div style={styles.chat}>
        {activeUser ? (
          <>
            <div style={styles.header}>
              <div style={styles.headerContent}>
                <div
                  style={{
                    ...styles.headerAvatar,
                    background:
                      activeUser.id === "bot"
                        ? "linear-gradient(135deg, #667eea, #764ba2)"
                        : getAvatarColor(activeUser.id),
                  }}
                >
                  {activeUser.id === "bot"
                    ? "🤖"
                    : getInitials(activeUser.displayName)}
                </div>
                <div>
                  <div style={styles.headerName}>{activeUser.displayName}</div>
                  <div style={styles.headerStatus}>
                    {isTyping && activeUser.id === "bot" ? (
                      <>
                        <span style={styles.typingDot}></span>
                        thinking...
                      </>
                    ) : isAiSpeaking && activeUser.id === "bot" ? (
                      <span
                        style={{
                          color: "#059669",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
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
                        ></span>
                        Speaking aloud...
                      </span>
                    ) : (
                      "Active now"
                    )}
                  </div>
                </div>
              </div>

              {/* Bot Voice Controls */}
              {activeUser.id === "bot" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isAiSpeaking && (
                    <button
                      type="button"
                      onClick={stopAiVoice}
                      style={{
                        padding: "6px 14px",
                        background: "#ef4444",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "20px",
                        fontSize: 13,
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 10px rgba(239, 68, 68, 0.4)",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.transform = "scale(1.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                      title="Stop AI voice reading immediately"
                    >
                      ⏹️ Stop Voice
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={toggleVoiceMute}
                    style={{
                      padding: "6px 12px",
                      background: isVoiceMuted ? "#f3f4f6" : "#e0e7ff",
                      color: isVoiceMuted ? "#6b7280" : "#4338ca",
                      border: `1px solid ${isVoiceMuted ? "#d1d5db" : "#c7d2fe"}`,
                      borderRadius: "20px",
                      fontSize: 13,
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.15s ease",
                    }}
                    title={
                      isVoiceMuted
                        ? "Enable AI voice reading"
                        : "Mute AI voice reading"
                    }
                  >
                    {isVoiceMuted ? "🔇 Voice Muted" : "🔊 Voice On"}
                  </button>
                </div>
              )}
            </div>

            <div style={styles.messages}>
              {(messages[activeUser.id] || []).map((m, i) => {
                const isMe = m.from === currentUser.id;
                const isBotGenerated = m.generatedBy === "bot";
                const isStreaming = m.streaming === true;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                      animation: "slideIn 0.3s ease",
                    }}
                  >
                    {isBotGenerated && (
                      <div style={styles.botLabel}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ marginRight: 4 }}
                        >
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Generated by AI
                        {isStreaming && (
                          <span style={styles.streamingIndicator}>
                            <span style={styles.streamingDot}></span>
                            <span style={styles.streamingDot}></span>
                            <span style={styles.streamingDot}></span>
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 8,
                        maxWidth: "75%",
                      }}
                    >
                      {!isMe && (
                        <div
                          style={{
                            ...styles.messageAvatar,
                            background:
                              activeUser.id === "bot"
                                ? "linear-gradient(135deg, #667eea, #764ba2)"
                                : getAvatarColor(activeUser.id),
                          }}
                        >
                          {activeUser.id === "bot"
                            ? "🤖"
                            : getInitials(activeUser.displayName)}
                        </div>
                      )}
                      <div
                        style={{
                          ...styles.message,
                          background: isMe
                            ? "linear-gradient(135deg, #667eea, #764ba2)"
                            : "#ffffff",
                          color: isMe ? "#fff" : "#1f2937",
                          borderRadius: isMe
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          opacity: isStreaming ? 0.95 : 1,
                        }}
                      >
                        {m.type === "audio" ? (
                          <div>
                            <audio
                              controls
                              src={m.audio}
                              style={{ width: 220, display: "block" }}
                            />
                            {m.transcript && (
                              <div
                                style={{
                                  fontSize: 13,
                                  marginTop: 6,
                                  opacity: 0.9,
                                  fontStyle: "italic",
                                  lineHeight: 1.3,
                                }}
                              >
                                🗣️ "{m.transcript}"
                              </div>
                            )}
                          </div>
                        ) : (
                          m.content
                        )}
                        {isStreaming && <span style={styles.cursor}>|</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {activeUser.id === "bot" && (
              <div style={styles.quickPromptContainer}>
                <button
                  type="button"
                  style={styles.quickPromptChip}
                  onClick={() =>
                    handleQuickPrompt(
                      "Summarize the uploaded resume and key background.",
                    )
                  }
                >
                  📋 Summarize Document
                </button>
                <button
                  type="button"
                  style={styles.quickPromptChip}
                  onClick={() =>
                    handleQuickPrompt(
                      "What are the key technical skills and tech stack?",
                    )
                  }
                >
                  🛠️ Skills & Tech Stack
                </button>
                <button
                  type="button"
                  style={styles.quickPromptChip}
                  onClick={() =>
                    handleQuickPrompt(
                      "What projects and work experience are listed?",
                    )
                  }
                >
                  💼 Work Experience
                </button>
              </div>
            )}

            {/* 🗣️ ACTIVE SPEAKING BANNER */}
            {activeUser.id === "bot" && isAiSpeaking && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "8px 16px",
                  margin: "0 20px 10px 20px",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#1e40af",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 16 }}>🗣️</span>
                  <span>AI is reading its answer aloud...</span>
                </div>
                <button
                  type="button"
                  onClick={stopAiVoice}
                  style={{
                    padding: "5px 14px",
                    background: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.3)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                  title="Stop AI voice reading immediately"
                >
                  ⏹️ Stop Voice
                </button>
              </div>
            )}

            <div style={styles.inputBar}>
              {/* 📎 DOCUMENT UPLOAD BUTTON */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.pdf,.docx,.doc,.pptx,.ppt,.json,.md,.csv"
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "none",
                  marginRight: 8,
                  background: isUploading ? "#fbbf24" : "#e5e7eb",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                title={
                  isUploading
                    ? "Indexing document into Pinecone..."
                    : "Upload document (.txt, .pdf, .docx, .pptx, .json)"
                }
              >
                {isUploading ? "⏳" : "📎"}
              </button>

              {isRecording ? (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 16px",
                    height: 48,
                    background: "#fef2f2",
                    borderRadius: 24,
                    border: "2px solid #ef4444",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#ef4444",
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
                      Recording: 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                    </span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      (Speak now, click ⏹️ when finished)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #fca5a5",
                      color: "#b91c1c",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "4px 10px",
                      borderRadius: 12,
                    }}
                    title="Cancel and discard voice recording"
                  >
                    ✕ Cancel
                  </button>
                </div>
              ) : (
                <input
                  style={styles.input}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    activeUser?.id === "bot"
                      ? "Ask AI Assistant anything about your PDF or document..."
                      : "Type your message..."
                  }
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
              )}

              {/* 🎤 AUDIO BUTTON */}
              <button
                type="button"
                onClick={toggleRecording}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: isRecording ? "2px solid #ef4444" : "none",
                  marginRight: 8,
                  marginLeft: 8,
                  background: isRecording ? "#ef4444" : "#e5e7eb",
                  color: isRecording ? "#ffffff" : "#374151",
                  cursor: "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: isRecording
                    ? "0 0 12px rgba(239, 68, 68, 0.6)"
                    : "none",
                }}
                title={
                  isRecording
                    ? "Click to finish and send recording"
                    : "Click to record voice message"
                }
              >
                {isRecording ? "⏹️" : "🎤"}
              </button>

              {/* 📤 SEND BUTTON */}
              <button
                style={{
                  ...styles.sendBtn,
                  opacity: message.trim() ? 1 : 0.5,
                }}
                onClick={sendMessage}
                disabled={!message.trim()}
                onMouseEnter={(e) => {
                  if (message.trim()) {
                    e.target.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "scale(1)";
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>💬</div>
            <div style={styles.emptyTitle}>Select a conversation</div>
            <div style={styles.emptySubtitle}>
              Choose a contact from the sidebar to start chatting
            </div>
          </div>
        )}
      </div>

      {/* Add animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes typing {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes streamingDots {
          0%, 20% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    height: "100vh",
    display: "flex",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    background: "#f3f4f6",
  },
  sidebar: {
    width: 320,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
  },
  sidebarHeader: {
    padding: 20,
    borderBottom: "1px solid #e5e7eb",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  currentUserAvatar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 16,
    border: "3px solid rgba(255,255,255,0.3)",
  },
  currentUserInfo: {
    flex: 1,
  },
  currentUserName: {
    fontSize: 16,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 4,
  },
  onlineStatus: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#48bb78",
    boxShadow: "0 0 8px rgba(72,187,120,0.6)",
    animation: "pulse 2s ease-in-out infinite",
  },
  sidebarTitle: {
    padding: "16px 20px 12px",
    fontSize: 14,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: 0,
  },
  usersList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px",
  },
  userItem: {
    padding: "12px 12px",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "all 0.2s ease",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: 2,
  },
  userPreview: {
    fontSize: 13,
    color: "#9ca3af",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#f9fafb",
  },
  header: {
    padding: 16,
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 600,
    color: "#1f2937",
  },
  headerStatus: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#667eea",
    animation: "typing 1.4s ease-in-out infinite",
  },
  messages: {
    flex: 1,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto",
    background: "linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 12,
    flexShrink: 0,
  },
  message: {
    padding: "12px 16px",
    fontSize: 14,
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
    wordWrap: "break-word",
  },
  botLabel: {
    fontSize: 11,
    marginBottom: 6,
    color: "#667eea",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  streamingIndicator: {
    display: "flex",
    gap: 3,
  },
  streamingDot: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#667eea",
    animation: "streamingDots 1.4s ease-in-out infinite",
  },
  cursor: {
    marginLeft: 2,
    animation: "blink 1s step-end infinite",
    fontWeight: 300,
  },
  quickPromptContainer: {
    display: "flex",
    gap: "8px",
    padding: "8px 16px",
    background: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
    overflowX: "auto",
  },
  quickPromptChip: {
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "16px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#374151",
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    transition: "all 0.2s ease",
  },
  inputBar: {
    padding: 16,
    display: "flex",
    gap: 12,
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    boxShadow: "0 -1px 3px rgba(0,0,0,0.04)",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 24,
    border: "2px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    transition: "all 0.2s ease",
    background: "#f9fafb",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
    transition: "all 0.2s ease",
  },
  empty: {
    margin: "auto",
    textAlign: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
  },
};
