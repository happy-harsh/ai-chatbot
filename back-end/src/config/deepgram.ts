import { createClient } from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

// Use direct regional endpoint to bypass dead Anycast IP (66.103.225.59) that times out on Indian ISPs
const DEEPGRAM_URL =
  process.env.DEEPGRAM_URL || "https://api-alt-2.sac1.deepgram.com";

export const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "", {
  global: {
    url: DEEPGRAM_URL,
  },
});
