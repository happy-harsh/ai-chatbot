import { openai } from "../config/openai";
import { SYSTEM_PROMPT } from "../utils/prompts";
import { z } from "zod";
import { searchRelevantDocs } from "../utils/helpers";

const ResponseSchema = z.object({
  message: z.string().nullable(),
  assignee: z.string().nullable(),
  type: z.enum(["message", "assign_task"]),
  task: z.string().nullable(),
  deadline: z.string().nullable(),
});

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const conversations = new Map<string, ChatTurn[]>();

const SELECTED_MODEL =
  process.env.MODEL_NAME ||
  (process.env.GROQ_API_KEY ? "groq/compound-mini" : "gpt-4o");

/**
 * Contextualization: Reformulates follow-up queries using chat history so Pinecone vector search receives standalone entities.
 */
async function reformulateQuery(
  history: ChatTurn[],
  userQuery: string
): Promise<string> {
  const trimmed = userQuery.trim().toLowerCase();

  // Handle affirmative / summary replies directly
  const affirmativeTriggers = [
    "yes",
    "yes pls",
    "yes please",
    "sure",
    "ok",
    "okay",
    "yeah",
    "yep",
    "please do",
    "go ahead",
    "summarize",
    "summarize it",
    "summarize this",
    "tell me",
    "tell me more",
  ];

  if (affirmativeTriggers.includes(trimmed) || trimmed.startsWith("yes ")) {
    return "Comprehensive summary of the candidate's background, skills, experience, and uploaded document.";
  }

  // If the query mentions summarizing or details
  if (trimmed.includes("summarize") || trimmed.includes("resume") || trimmed.includes("pdf")) {
    return userQuery;
  }

  if (!history || history.length === 0) {
    return userQuery;
  }

  // Skip reformulation for short greetings
  if (
    trimmed.length < 12 ||
    ["hi", "hello", "hey", "who are you", "help", "good morning"].includes(trimmed)
  ) {
    return userQuery;
  }

  try {
    const prompt = `Given the chat history below and a follow-up question, rewrite the follow-up question into a standalone search query that includes all necessary names, subjects, and context. Do NOT answer the question, output ONLY the rewritten standalone question.

Chat History:
${history.slice(-4).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

Follow-Up Question: ${userQuery}
Standalone Search Query:`;

    const completion = await openai.chat.completions.create({
      model: SELECTED_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
      stream: false,
    });

    const standalone = completion.choices[0]?.message?.content?.trim();
    if (standalone && standalone.length > 3) {
      console.log(`🔍 Reformulated Query: "${userQuery}" ──> "${standalone}"`);
      return standalone;
    }
  } catch (err) {
    console.warn("Query reformulation fallback, using raw query:", err);
  }

  return userQuery;
}

export const handleMessage = async (
  from: string,
  content: string,
  onChunk?: (chunk: string) => void
) => {
  const history: ChatTurn[] = conversations.get(from) ?? [];

  // 1. Reformulate follow-up queries using clean conversation history
  const standaloneQuery = await reformulateQuery(history, content);

  // 2. Search Pinecone vector DB with the standalone query
  const contextDocs = await searchRelevantDocs(standaloneQuery);
  console.log("Retrieved RAG Context Docs count:", contextDocs.length);

  // Keep top 3 most relevant chunks and limit context size to avoid token overflow
  const limitedDocs = contextDocs.slice(0, 3);
  let contextText = limitedDocs.join("\n\n").trim();
  if (contextText.length > 3000) {
    contextText = contextText.slice(0, 3000) + "... [truncated]";
  }

  // 3. Build a clean, lean prompt payload for this turn
  const promptMessages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (contextText.length > 0) {
    promptMessages.push({
      role: "system",
      content: `The user has uploaded documents to this chat. Here is the relevant content from the uploaded documents:\n\n${contextText}\n\nIMPORTANT INSTRUCTIONS:
- The document has ALREADY been uploaded and provided above. NEVER ask the user to upload the document or PDF again.
- If the user says "yes", "yes pls", "summarize", or asks for information, answer immediately using the uploaded document content above.
- If the user's question cannot be answered from the document, state what is missing while referencing the document content you have.`,
    });
  }

  // Include only the last 6 turns (3 back-and-forth pairs) of conversation history
  const recentHistory = history.slice(-6);
  for (const turn of recentHistory) {
    promptMessages.push({
      role: turn.role,
      content: turn.content,
    });
  }

  // Append current user message
  promptMessages.push({
    role: "user",
    content,
  });

  // 4. Stream completion using the high-throughput Groq model
  const completion = await openai.chat.completions.create({
    model: SELECTED_MODEL,
    messages: promptMessages,
    stream: true,
    response_format: { type: "json_object" },
  });

  let fullText = "";
  let visibleText = "";

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (!delta) continue;

    fullText += delta;

    const messageKeyIndex = fullText.indexOf('"message"');
    if (messageKeyIndex === -1) continue;

    const afterMessage = fullText.slice(messageKeyIndex);

    const colonIndex = afterMessage.indexOf(":");
    if (colonIndex === -1) continue;

    const valueAfterColon = afterMessage.slice(colonIndex + 1).trim();

    if (!valueAfterColon.startsWith('"')) {
      continue;
    }

    const firstQuote = afterMessage.indexOf('"', colonIndex + 1);
    if (firstQuote === -1) continue;

    const secondQuote = afterMessage.indexOf('"', firstQuote + 1);

    const currentMessage =
      secondQuote === -1
        ? afterMessage.slice(firstQuote + 1)
        : afterMessage.slice(firstQuote + 1, secondQuote);

    const newText = currentMessage.slice(visibleText.length);

    if (newText) {
      visibleText += newText;
      onChunk?.(newText);
    }
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(fullText);
  } catch (err) {
    parsed = { type: "message", message: visibleText || fullText };
  }

  parsed.type = parsed.type || "message";
  parsed.message = parsed.message ?? visibleText;

  // 5. Update and preserve clean history (only dialog turns, max 20)
  const updatedHistory: ChatTurn[] = [
    ...history.slice(-18),
    { role: "user", content },
    { role: "assistant", content: parsed.message ?? "" },
  ];

  conversations.set(from, updatedHistory);

  return {
    parsed,
    messages: updatedHistory,
  };
};
