// routes/messages.ts or in your router/controller
import { Router } from "express";
import { Message } from "../model/message";
import { Conversation } from "../model/conversation";

const router = Router();

router.get("/conversation/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [user1, user2] },
    });

    if (!conversation) return res.json([]);

    const msgs = await Message.find({ conversationId: conversation.id }).sort({
      createdAt: 1,
    });

    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// Delete specific conversation history
router.delete("/conversation/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [user1, user2] },
    });

    if (!conversation) {
      return res.json({ success: true, deletedCount: 0 });
    }

    const result = await Message.deleteMany({
      conversationId: conversation.id,
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Error clearing conversation:", err);
    res.status(500).json({ error: "Failed to clear conversation history" });
  }
});

// Delete all conversations for a user
router.delete("/user/:userId/all", async (req, res) => {
  const { userId } = req.params;

  try {
    const userConvs = await Conversation.find({
      participants: userId,
    });

    const convIds = userConvs.map((c) => c.id);
    const result = await Message.deleteMany({
      conversationId: { $in: convIds },
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("Error clearing all history:", err);
    res.status(500).json({ error: "Failed to clear all messages" });
  }
});

export default router;
