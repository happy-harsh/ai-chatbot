import dotenv from "dotenv";
dotenv.config();

import { readTextFile, splitChunk, storeDocuments } from "../utils/helpers";

async function main() {
  console.log("Starting local knowledge base upload to Pinecone...");

  try {
    const text = readTextFile("knowledge_base.txt");
    const chunks = splitChunk(text);
    console.log(`Split text into ${chunks.length} chunks.`);
    
    await storeDocuments(chunks);
    console.log("\n✅ Upload completed successfully using free local embeddings!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Upload failed:", error);
    process.exit(1);
  }
}

main();