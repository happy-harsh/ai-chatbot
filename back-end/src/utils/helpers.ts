import { pinecone } from "../config/pinecone";
import fs from "fs";
import path from "path";

const EMBEDDING_MODEL =
  process.env.PINECONE_EMBEDDING_MODEL || "llama-text-embed-v2";

export function splitChunk(text: string, chunkSize = 500) {
  const paragraphs = text.split("\n");
  const chunks: string[] = [];

  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > chunkSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += para + "\n";
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// ============================================================================
// EMBEDDINGS FUNCTION (Matches Pinecone Index 1024-dim llama-text-embed-v2)
// ============================================================================
async function getEmbedding(text: string, inputType: "passage" | "query" = "query"): Promise<number[]> {
  const response = await pinecone.inference.embed(EMBEDDING_MODEL, [text], {
    inputType,
    truncate: "END",
  });
  return (response.data[0] as any).values as number[];
}

async function getEmbeddingsBatch(
  texts: string[],
  inputType: "passage" | "query" = "passage"
): Promise<number[][]> {
  const response = await pinecone.inference.embed(EMBEDDING_MODEL, texts, {
    inputType,
    truncate: "END",
  });
  return response.data.map((d: any) => d.values as number[]);
}

export const index = pinecone.index(
  process.env.PINECONE_INDEX_NAME || "ai-chatbot"
);

export async function storeDocuments(docs: string[]) {
  const validDocs = docs.map((d) => d.trim()).filter(Boolean);

  if (!validDocs.length) {
    throw new Error("No valid docs");
  }

  console.log(`Generating 1024-dim embeddings for ${validDocs.length} chunks via ${EMBEDDING_MODEL}...`);

  const BATCH_SIZE = 64; // Pinecone supports batch embedding
  const vectors: any[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
    const chunkBatch = validDocs.slice(i, i + BATCH_SIZE);
    const embeddings = await getEmbeddingsBatch(chunkBatch, "passage");

    chunkBatch.forEach((doc, batchIdx) => {
      const globalIdx = i + batchIdx;
      vectors.push({
        id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 7)}-${globalIdx}`,
        values: embeddings[batchIdx],
        metadata: { text: doc },
      });
    });
  }

  console.log(`Vectors created with dimension ${vectors[0]?.values?.length || 0}: ${vectors.length}`);

  if (!vectors.length) {
    throw new Error("No vectors created");
  }

  // Pinecone upsert in batches of 100
  for (let i = 0; i < vectors.length; i += 100) {
    const batch = vectors.slice(i, i + 100);
    await index.upsert(batch);
  }
}

export async function searchRelevantDocs(query: string) {
  try {
    const embedding = await getEmbedding(query, "query");

    const result = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    return result.matches.map((m: any) => m.metadata?.text || "").filter(Boolean);
  } catch (err) {
    console.error("Error searching relevant docs:", err);
    return [];
  }
}

export function readTextFile(fileName: string) {
  const filePath = path.join(__dirname, "../data", fileName);
  const content = fs.readFileSync(filePath, "utf-8");

  return content;
}
