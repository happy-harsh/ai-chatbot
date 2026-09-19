import WebSocket from "ws";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY || "";
const CARTESIA_VERSION = "2024-06-10";
const CARTESIA_MODEL_ID = process.env.CARTESIA_MODEL_ID || "sonic-3.6";

let cartesiaSocket: WebSocket | null = null;

function getCartesiaSocket(): WebSocket {
  if (
    !cartesiaSocket ||
    cartesiaSocket.readyState === WebSocket.CLOSED ||
    cartesiaSocket.readyState === WebSocket.CLOSING
  ) {
    cartesiaSocket = new WebSocket("wss://api.cartesia.ai/tts/websocket", {
      headers: {
        "Cartesia-Version": CARTESIA_VERSION,
        "X-API-Key": CARTESIA_API_KEY,
      },
    });

    cartesiaSocket.on("open", () =>
      console.log("Cartesia WebSocket connected")
    );
    cartesiaSocket.on("error", (err) =>
      console.error("Cartesia WebSocket error:", err)
    );
    cartesiaSocket.on("close", () =>
      console.log("Cartesia WebSocket closed")
    );
  }
  return cartesiaSocket;
}

// Pre-warm the socket connection on startup
if (CARTESIA_API_KEY) {
  getCartesiaSocket();
}

export function streamCartesiaTTS(
  text: string,
  onAudioChunk: (chunk: Buffer) => void,
  onEnd: () => void,
  onError: (err: any) => void,
) {
  const socket = getCartesiaSocket();
  const contextId = randomUUID();

  const handleMessage = (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Only process messages for this context
      if (msg.context_id && msg.context_id !== contextId) {
        return;
      }

      if (msg.type === "chunk" && msg.data) {
        onAudioChunk(Buffer.from(msg.data, "base64"));
      } else if (msg.type === "done") {
        onEnd();
        socket.off("message", handleMessage);
      } else if (msg.type === "error") {
        onError(new Error(msg.error));
        socket.off("message", handleMessage);
      }
    } catch (err) {
      onError(err);
      socket.off("message", handleMessage);
    }
  };

  socket.on("message", handleMessage);

  const payload = JSON.stringify({
    context_id: contextId,
    model_id: CARTESIA_MODEL_ID,
    voice: { mode: "id", id: "e07c00bc-4134-4eae-9ea4-1a55fb45746b" },
    output_format: {
      container: "raw",
      encoding: "pcm_s16le",
      sample_rate: 44100,
    },
    language: "en",
    transcript: text,
  });

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(payload);
  } else {
    socket.once("open", () => {
      socket.send(payload);
    });
  }
}
