import { Schema, model } from "mongoose";

const MessageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    conversationId: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    content: { type: String, required: true },
    generatedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, 
  },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = model("Message", MessageSchema);
