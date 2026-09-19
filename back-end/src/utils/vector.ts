import fs from "fs";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { pineconeIndex } from "../config/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Upload knowledge base to Pinecone vector store
 */
export async function uploadKnowledgeBaseToPinecone() {
  try {
    console.log("Loading knowledge base...");

    // 1. Load the knowledge base file
    const filePath = "./src/data/knowledge_base.txt";
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // 2. Split text into chunks with overlap for better context
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ["\n\n", "\n", " ", ""],
    });

    const chunks = await textSplitter.splitText(fileContent);
    console.log(`Created ${chunks.length} chunks from knowledge base`);

    // 3. Initialize OpenAI embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // 4. Create Pinecone vector store from documents
    console.log("Creating embeddings and uploading to Pinecone...");

    await PineconeStore.fromTexts(
      chunks,
      chunks.map((_, i) => ({ id: `chunk_${i}`, source: "knowledge_base.txt" })),
      embeddings,
      {
        pineconeIndex,
        namespace: "knowledge-base",
      }
    );

    console.log("✅ Successfully uploaded knowledge base to Pinecone!");
    console.log(`Total chunks uploaded: ${chunks.length}`);

  } catch (error) {
    console.error("Error uploading to Pinecone:", error);
    throw error;
  }
}

/**
 * Query the knowledge base for relevant context
 */
export async function queryKnowledgeBase(query: string, k: number = 3) {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex,
        namespace: "knowledge-base",
      }
    );

    // Use similaritySearchWithScore and then map to documents
    const results = await vectorStore.similaritySearchWithScore(query, k);
    return results.map(([doc]) => doc.pageContent).join("\n\n");

  } catch (error) {
    console.error("Error querying knowledge base:", error);
    throw error;
  }
}