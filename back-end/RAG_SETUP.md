# RAG Setup with Pinecone

## Prerequisites

1. **Pinecone Account**: Create an account at [pinecone.io](https://pinecone.io)
2. **OpenAI API Key**: Get your API key from [platform.openai.com](https://platform.openai.com)
3. **Create a Pinecone Index**: Create an index named "knowledge-base" with dimension 1536 (for OpenAI embeddings)

## Environment Variables

Add these to your `.env` file:

```env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENV=your_pinecone_environment  # e.g., "us-east-1-aws"
OPENAI_API_KEY=your_openai_api_key_here
```

## Setup Steps

### 1. Install Dependencies
```bash
npm install @langchain/openai @langchain/pinecone --legacy-peer-deps
```

### 2. Create Pinecone Index
- Go to Pinecone dashboard
- Create a new index named "knowledge-base"
- Set dimension to 1536 (OpenAI embeddings)
- Choose metric: cosine
- Set environment (e.g., us-east-1-aws)

### 3. Upload Knowledge Base
```bash
npm run upload-kb
```

This will:
- Read `src/data/knowledge_base.txt`
- Split it into chunks
- Create embeddings using OpenAI
- Upload to Pinecone

### 4. Use in Your Chat Application

Import and use the `queryKnowledgeBase` function:

```typescript
import { queryKnowledgeBase } from "./utils/vector";

// In your chat handler
async function handleChatMessage(userMessage: string) {
  // Get relevant context from knowledge base
  const context = await queryKnowledgeBase(userMessage, 3);

  // Use context to generate response
  const prompt = `
Context: ${context}
Question: ${userMessage}
  `;

  // Pass to your AI model
  const response = await yourAIModel.generate(prompt);
  return response;
}
```

## Files Created

- `src/config/pinecone.ts` - Pinecone configuration
- `src/utils/vector.ts` - Vector store utilities (upload & query functions)
- `src/scripts/upload-knowledge-base.ts` - Script to upload knowledge base
- `src/examples/rag-example.ts` - Example usage

## How It Works

1. **Chunking**: Knowledge base is split into 500-character chunks with 50-character overlap
2. **Embeddings**: Each chunk is converted to a 1536-dimensional vector using OpenAI embeddings
3. **Storage**: Vectors are stored in Pinecone for fast similarity search
4. **Retrieval**: When a user asks a question, the system finds the most relevant chunks
5. **Generation**: The retrieved context is used to generate accurate responses

## Testing

You can test the RAG functionality:

```typescript
import { queryKnowledgeBase } from "./utils/vector";

const result = await queryKnowledgeBase("What is Savan's role?");
console.log(result);
```

## Notes

- The knowledge base file is at `src/data/knowledge_base.txt`
- You can update this file and re-run `npm run upload-kb` to refresh the vector store
- The default retrieval returns top 3 most relevant chunks (configurable)