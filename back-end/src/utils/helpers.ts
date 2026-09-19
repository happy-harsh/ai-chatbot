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

export async function clearAllDocuments() {
  try {
    const stats = await index.describeIndexStats();
    if (!stats.totalRecordCount || stats.totalRecordCount === 0) {
      console.log("ℹ️ Pinecone index is already completely empty (0 records).");
      return { success: true, count: 0 };
    }
    await index.deleteAll();
    console.log("🧹 Successfully wiped all vectors from Pinecone index.");
    return { success: true };
  } catch (err: any) {
    if (
      err?.name === "PineconeNotFoundError" ||
      err?.status === 404 ||
      err?.message?.includes("404")
    ) {
      console.log("ℹ️ Pinecone index has no records to delete (404 handled).");
      return { success: true, count: 0 };
    }
    console.error("Error wiping Pinecone documents:", err);
    throw err;
  }
}

export async function storeDocuments(
  docs: string[],
  metadata?: {
    documentName?: string;
    userId?: string;
    clearPrevious?: boolean;
  }
) {
  const validDocs = docs.map((d) => d.trim()).filter(Boolean);

  if (!validDocs.length) {
    throw new Error("No valid docs");
  }

  // If clearPrevious is requested (e.g. ChatGPT-style fresh document context), wipe older vectors safely
  if (metadata?.clearPrevious) {
    try {
      console.log("🧹 Clearing previous Pinecone vectors for clean document context...");
      await clearAllDocuments();
    } catch (cleanErr) {
      console.warn("Notice while clearing previous vectors:", cleanErr);
    }
  }

  console.log(
    `Generating 1024-dim embeddings for ${validDocs.length} chunks via ${EMBEDDING_MODEL} (Doc: "${metadata?.documentName || "Unknown"}")...`
  );

  const BATCH_SIZE = 64; // Pinecone supports batch embedding
  const vectors: any[] = [];
  const timestamp = Date.now();
  const docName = metadata?.documentName || "Uploaded Document";
  const userId = metadata?.userId || "";

  for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
    const chunkBatch = validDocs.slice(i, i + BATCH_SIZE);
    const embeddings = await getEmbeddingsBatch(chunkBatch, "passage");

    chunkBatch.forEach((doc, batchIdx) => {
      const globalIdx = i + batchIdx;
      vectors.push({
        id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 7)}-${globalIdx}`,
        values: embeddings[batchIdx],
        metadata: {
          text: doc,
          documentName: docName,
          userId,
          timestamp,
        },
      });
    });
  }

  console.log(
    `Vectors created with dimension ${vectors[0]?.values?.length || 0}: ${vectors.length}`
  );

  if (!vectors.length) {
    throw new Error("No vectors created");
  }

  // Pinecone upsert in batches of 100
  for (let i = 0; i < vectors.length; i += 100) {
    const batch = vectors.slice(i, i + 100);
    await index.upsert(batch);
  }
}

export async function searchRelevantDocs(
  query: string,
  options?: { documentName?: string; userId?: string }
) {
  try {
    const embedding = await getEmbedding(query, "query");

    const queryPayload: any = {
      vector: embedding,
      topK: 6,
      includeMetadata: true,
    };

    if (options?.documentName) {
      queryPayload.filter = {
        documentName: { $eq: options.documentName },
      };
    }

    let result = await index.query(queryPayload);

    // If a document filter was applied but yielded 0 matches (e.g. subtle naming difference),
    // fallback to querying without the filter
    if (options?.documentName && (!result.matches || result.matches.length === 0)) {
      console.log(`Document filter for "${options.documentName}" returned 0 matches; querying all vectors.`);
      result = await index.query({
        vector: embedding,
        topK: 6,
        includeMetadata: true,
      });
    }

    return (result.matches || [])
      .map((m: any) => m.metadata?.text || "")
      .filter(Boolean);
  } catch (err) {
    console.error("Error searching relevant docs:", err);
    return [];
  }
}

export function readTextFile(fileName: string) {
  const p1 = path.join(__dirname, "../data", fileName);
  const p2 = path.join(process.cwd(), "src/data", fileName);
  const p3 = path.join(process.cwd(), "data", fileName);

  const filePath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : p3;
  if (!fs.existsSync(filePath)) {
    console.warn(`File "${fileName}" not found at ${filePath}`);
    return "";
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return content;
}
