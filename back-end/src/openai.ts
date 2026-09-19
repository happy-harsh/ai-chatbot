

// import WebSocket, { WebSocketServer } from "ws";
// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const wss = new WebSocketServer({ port: 3001 });

// wss.on("connection", (socket) => {
//   console.log("Client connected");

//   const messages: { role: string; content: string }[] = [
//     { role: "system", content: "You are a helpful assistant." },
//   ];

//   socket.on("message", async (data) => {
//     const userMessage = data.toString();
//     messages.push({ role: "user", content: userMessage });

//     let fullReply = "";

//     const stream = await openai.responses.create({
//       model: "gpt-4.1-mini",
//       input: messages,
//       stream: true,
//     });

//     for await (const event of stream) {
//       if (event.type === "response.output_text.delta") {
//         fullReply += event.delta;

//         // 🚀 send chunk to frontend immediately
//         socket.send(
//           JSON.stringify({
//             type: "chunk",
//             data: event.delta,
//           })
//         );
//       }

//       if (event.type === "response.completed") {
//         break;
//       }
//     }

//     messages.push({ role: "assistant", content: fullReply });

//     // signal completion
//     socket.send(
//       JSON.stringify({
//         type: "done",
//       })
//     );
//   });

//   socket.on("close", () => {
//     console.log("Client disconnected");
//   });
// });

// console.log("WebSocket server running on ws://localhost:3001");
