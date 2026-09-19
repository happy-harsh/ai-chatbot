import { Schema, model } from "mongoose";

const ConversationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    participants: { type: [String], required: true },
  },
  {
    timestamps: true,
  },
);

ConversationSchema.index({ participants: 1 });

export const Conversation = model("Conversation", ConversationSchema);
