import { pipeline } from "@xenova/transformers";

let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    // Uses Xenova/all-MiniLM-L6-v2 model (384 dimensions) locally in Node.js
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractorPromise;
}

/**
 * Generate a 384-dimensional vector embedding locally without API keys.
 */
export async function getLocalEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
