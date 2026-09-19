import { Server } from "socket.io";
import { handleMessage, conversations } from "../services/chat.service";
import { resolveAssignee } from "../utils/utils";
import { getUsers } from "../services/user.service";
import { Conversation } from "../model/conversation";
import { Message } from "../model/message";
import { v4 as uuidv4 } from "uuid";
import { deepgram } from "../config/deepgram";
import { streamCartesiaTTS } from "../config/cartesia";

export const setupChatSocket = (io: Server) => {
  io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    socket.on("join", (userId: string) => {
      socket.join(userId);
      console.log(`${userId} joined`);
    });

    socket.on("message", async ({ from, to, content, documentName }) => {
      if (to !== "bot") {
        let conversation = await Conversation.findOne({
          participants: { $all: [from, to] },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            id: uuidv4(),
            participants: [from, to],
          });
        }
        await Message.create({
          id: uuidv4(),
          conversationId: conversation.id,
          from,
          to,
          content,
        });
        io.to(to).emit("message", { from, content });
        return;
      }

      let botConversation = await Conversation.findOne({
        participants: { $all: [from, "bot"] },
      });
      if (!botConversation) {
        botConversation = await Conversation.create({
          id: uuidv4(),
          participants: [from, "bot"],
        });
      }

      await Message.create({
        id: uuidv4(),
        conversationId: botConversation.id,
        from,
        to,
        content,
      });

      try {
        const { parsed, messages } = await handleMessage(
          from,
          content,
          (chunk) => {
            socket.emit("message_chunk", { chunk });
          },
          documentName
        );

        if (parsed.type === "message") {
          conversations.set(from, messages);
          const botConversation =
            (await Conversation.findOne({
              participants: { $all: [from, "bot"] },
            })) ||
            (await Conversation.create({
              id: uuidv4(),
              participants: [from, "bot"],
            }));

          await Message.create({
            id: uuidv4(),
            conversationId: botConversation.id,
            from: "bot",
            to: from,
            content: parsed.message,
            generatedBy: "bot",
          });

          socket.emit("message_complete", {
            from: "bot",
            content: parsed.message,
          });
          return;
        }

        if (parsed.type === "assign_task") {
          conversations.delete(from);

          const resolution = resolveAssignee(parsed.assignee, getUsers());

          if (!resolution) {
            socket.emit("message_complete", {
              from: "bot",
              content: `I couldn't find a user named "${parsed.assignee}".`,
            });
            return;
          }
          let conv = await Conversation.findOne({
            participants: { $all: [from, resolution] },
          });
          if (!conv) {
            conv = await Conversation.create({
              id: uuidv4(),
              participants: [from, resolution],
            });
          }

          await Message.create({
            id: uuidv4(),
            conversationId: conv.id,
            from,
            to: resolution,
            content: `Task: ${parsed.task}\n⏰ Deadline: ${parsed.deadline}`,
            generatedBy: "bot",
          });
          io.to(resolution).emit("message", {
            from: from,
            generatedBy: "bot",
            content: `Task: ${parsed.task}\n⏰ Deadline: ${parsed.deadline}`,
          });

          const botConv =
            (await Conversation.findOne({
              participants: { $all: [from, "bot"] },
            })) ||
            (await Conversation.create({
              id: uuidv4(),
              participants: [from, "bot"],
            }));

          await Message.create({
            id: uuidv4(),
            conversationId: botConv.id,
            from: "bot",
            to: from,
            content: "Task assigned successfully",
            generatedBy: "bot",
          });

          socket.emit("message_complete", {
            from: "bot",
            content: "Task assigned successfully",
          });
        }
      } catch (err: any) {
        console.error("Error in bot message handler:", err?.message || err);
        const userNotice =
          err?.status === 413 || err?.code === "rate_limit_exceeded"
            ? "⚠️ The question or conversation context was too long for the AI token limit. Please ask a shorter question or clear your chat."
            : "⚠️ An error occurred while generating a response. Please try again.";

        socket.emit("message_complete", {
          from: "bot",
          content: userNotice,
        });
        socket.emit("message", {
          from: "bot",
          content: userNotice,
          generatedBy: "bot",
        });
      }
    });

    socket.on("audio_message", async ({ from, to, audioBase64, mimeType, documentName }) => {
      try {
        if (!audioBase64) {
          console.warn("Audio message received with empty audioBase64");
          return;
        }

        const audioBuffer = Buffer.from(audioBase64, "base64");
        if (audioBuffer.length < 1500) {
          console.log(`Audio buffer too small (${audioBuffer.length} bytes). Skipping.`);
          socket.emit("audio_response_end", {
            from: to,
            to: from,
            transcript: "Audio was too short or silent. Please try speaking again.",
          });
          return;
        }

        const transcribeOptions: any = {
          model: "nova-2",
          language: "en-IN",
          smart_format: true,
          punctuate: true,
        };

        const { result, error } =
          await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            transcribeOptions
          );

        if (error) {
          console.warn("Deepgram transcription error:", error?.message || error);
          socket.emit("audio_response_end", {
            from: to,
            to: from,
            transcript: "Could not process audio. Please speak clearly for at least 1-2 seconds, or type your message.",
          });
          return;
        }

        const userSpokenText =
          result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

        if (!userSpokenText.trim()) {
          console.log("Audio too short or silent to transcribe. Skipping.");
          socket.emit("audio_response_end", {
            from: to,
            to: from,
            transcript: "Could not transcribe audio. Please try speaking louder or closer to the mic.",
          });
          return;
        }

        console.log(`🎙️ Spoken question from ${from} to ${to}: "${userSpokenText}"`);

        // If message is to another user (not bot), forward it
        if (to !== "bot") {
          let conversation = await Conversation.findOne({
            participants: { $all: [from, to] },
          });

          if (!conversation) {
            conversation = await Conversation.create({
              id: uuidv4(),
              participants: [from, to],
            });
          }
          await Message.create({
            id: uuidv4(),
            conversationId: conversation.id,
            from,
            to,
            content: userSpokenText,
          });
          io.to(to).emit("message", {
            from,
            content: userSpokenText,
            type: "audio",
            audioBase64,
            mimeType,
          });
          return;
        }

        // ====================================================================
        // MESSAGE TO BOT: TRANSCRIBE -> ASK AI -> SPEAK AI ANSWER
        // ====================================================================

        // 1. Emit user's transcript so the UI displays what was spoken
        socket.emit("user_transcript", {
          from,
          to: "bot",
          transcript: userSpokenText,
        });

        // 2. Save user message to database
        let botConversation = await Conversation.findOne({
          participants: { $all: [from, "bot"] },
        });
        if (!botConversation) {
          botConversation = await Conversation.create({
            id: uuidv4(),
            participants: [from, "bot"],
          });
        }

        await Message.create({
          id: uuidv4(),
          conversationId: botConversation.id,
          from,
          to: "bot",
          content: userSpokenText,
        });

        // 3. Process question through AI (RAG + LLM)
        let botReply = "";
        try {
          const { parsed, messages } = await handleMessage(
            from,
            userSpokenText,
            (chunk) => {
              socket.emit("message_chunk", { chunk });
            },
            documentName
          );

          if (parsed.type === "message") {
            botReply = parsed.message;
            conversations.set(from, messages);

            await Message.create({
              id: uuidv4(),
              conversationId: botConversation.id,
              from: "bot",
              to: from,
              content: botReply,
              generatedBy: "bot",
            });

            socket.emit("message_complete", {
              from: "bot",
              content: botReply,
            });
          } else if (parsed.type === "assign_task") {
            conversations.delete(from);
            const resolution = resolveAssignee(parsed.assignee, getUsers());

            if (!resolution) {
              botReply = `I couldn't find a user named "${parsed.assignee}".`;
            } else {
              let conv = await Conversation.findOne({
                participants: { $all: [from, resolution] },
              });
              if (!conv) {
                conv = await Conversation.create({
                  id: uuidv4(),
                  participants: [from, resolution],
                });
              }

              await Message.create({
                id: uuidv4(),
                conversationId: conv.id,
                from,
                to: resolution,
                content: `Task: ${parsed.task}\n⏰ Deadline: ${parsed.deadline}`,
                generatedBy: "bot",
              });
              io.to(resolution).emit("message", {
                from,
                generatedBy: "bot",
                content: `Task: ${parsed.task}\n⏰ Deadline: ${parsed.deadline}`,
              });

              botReply = `Task assigned to ${resolution} successfully!`;
            }

            await Message.create({
              id: uuidv4(),
              conversationId: botConversation.id,
              from: "bot",
              to: from,
              content: botReply,
              generatedBy: "bot",
            });

            socket.emit("message_complete", {
              from: "bot",
              content: botReply,
            });
          }
        } catch (aiError: any) {
          console.error("AI error processing voice query:", aiError?.message || aiError);
          botReply = "I encountered an error generating an answer. Please try asking again.";
          socket.emit("message_complete", {
            from: "bot",
            content: botReply,
          });
        }

        // 4. Prepare clean speakable text for Cartesia TTS (strip markdown asterisks, hashes, urls)
        const speakableText = botReply
          .replace(/[*_~`#>]/g, "")
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
          .replace(/•/g, "")
          .slice(0, 1000)
          .trim();

        console.log(`🔊 Speaking AI answer back via Cartesia TTS: "${speakableText.slice(0, 80)}..."`);

        // 5. Stream Cartesia TTS of the AI's actual answer back to the user
        streamCartesiaTTS(
          speakableText || botReply,
          (chunk) => {
            socket.emit("audio_response_chunk", {
              from: "bot",
              to: from,
              audioBase64: chunk.toString("base64"),
              mimeType: "audio/wav",
            });
          },
          () => {
            socket.emit("audio_response_end", {
              from: "bot",
              to: from,
              transcript: botReply,
            });
          },
          (err) => {
            console.error("Cartesia TTS error:", err);
            socket.emit("audio_response_end", {
              from: "bot",
              to: from,
              transcript: botReply,
            });
          }
        );
      } catch (err: any) {
        console.error("Audio transcription error:", err?.message || err);
        socket.emit("audio_response_end", {
          from: to,
          to: from,
          transcript: "Sorry, I had trouble processing the audio. Please try again or type your message.",
        });
      }
    });
  });
};
