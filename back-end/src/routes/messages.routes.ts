// routes/messages.ts or in your router/controller
import { Router } from "express";
import { Message } from "../model/message";
import { Conversation } from "../model/conversation";

const router = Router();

router.get("/conversation/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [user1, user2], $size: 2 },
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

export default router;
