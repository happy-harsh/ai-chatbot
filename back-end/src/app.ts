import express from "express";
import cors from "cors";
import multer from "multer";
import authRoutes, { registerRouter } from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import messageRoutes from "./routes/messages.routes";
import connectDB from "./config/connection";
import dotenv from "dotenv";
import { clearAllDocuments, readTextFile, splitChunk, storeDocuments } from "./utils/helpers";
import { extractTextFromBuffer } from "./utils/doc-parser";

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();
connectDB();

export const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"]
  : "*";

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Health check endpoint for cloud deployment platforms (Render, Railway, Fly.io, AWS)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
  });
});

// Routes
app.use("/login", authRoutes);
app.use("/register", registerRouter);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/messages", messageRoutes);

// Dynamic Document Upload Endpoint for RAG (Supports .txt, .pdf, .docx, .pptx, etc.)
app.post("/upload-document", upload.single("file"), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`📄 Received file upload: ${req.file.originalname} (${req.file.size} bytes)`);

    const extractedText = await extractTextFromBuffer(
      req.file.buffer,
      req.file.originalname
    );

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ error: "Could not extract text from document" });
    }

    const chunks = splitChunk(extractedText);
    console.log(`Extracted ${extractedText.length} chars, created ${chunks.length} chunks.`);

    // Tag chunks with documentName and clear out any old un-associated vectors
    const documentName = req.file.originalname;
    const userId = req.body?.userId || "";

    await storeDocuments(chunks, {
      documentName,
      userId,
      clearPrevious: true,
    });

    return res.json({
      success: true,
      message: `Successfully indexed "${documentName}" into Pinecone!`,
      filename: documentName,
      chunksCount: chunks.length,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return res.status(500).json({ error: error.message || "Failed to process document" });
  }
});

// Wipe all Pinecone vectors endpoint (used by Settings Modal)
app.delete("/documents/clear-all", async (req: any, res: any) => {
  try {
    await clearAllDocuments();
    return res.json({
      success: true,
      message: "Successfully cleared all documents from Pinecone knowledge base",
    });
  } catch (err: any) {
    console.error("Error clearing documents:", err);
    return res.status(500).json({
      error: err?.message || "Failed to clear documents from Pinecone",
    });
  }
});

app.post("/upload", async (req, res) => {
  try {
    const text = readTextFile("knowledge_base.txt");
    console.log(text, "text");
    const chunks = splitChunk(text);
    console.log(chunks, "chunks");
    console.log("Chunks:", chunks.length);
    await storeDocuments(chunks);
    res.json({ success: true });
  } catch (error) {
    console.log(error);
  }
});
