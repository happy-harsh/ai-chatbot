import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

// Custom fetch wrapper with extended timeout (60s) to handle multi-IP DNS resolution and network latency
const customFetch = (url: RequestInfo | URL, init?: RequestInit) => {
  return fetch(url, {
    ...init,
    signal: init?.signal || AbortSignal.timeout(60000),
  });
};

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
  fetchApi: customFetch,
});

export const pineconeIndex = pinecone.index(
  process.env.PINECONE_INDEX_NAME || "ai-chatbot"
);
