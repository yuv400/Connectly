import Message from "../models/Message.js";
import User from "../models/User.js";
import {
  summarizeConversation,
  askAboutConversation,
  generateMessage,
  translateMessage,
} from "../services/ai.service.js";

// ---------------------------------------------------------------------------
// Helper: verify the logged-in user is a participant in the conversation
// with otherUserId. Returns null if valid, or an error response object.
// ---------------------------------------------------------------------------
async function verifyConversationAccess(myId, otherUserId, res) {
  if (!otherUserId) {
    res.status(400).json({ message: "otherUserId is required." });
    return false;
  }

  // Make sure the other user actually exists
  const otherUserExists = await User.exists({ _id: otherUserId });
  if (!otherUserExists) {
    res.status(404).json({ message: "User not found." });
    return false;
  }

  // Verify this user is a participant in the conversation
  const isParticipant = await Message.exists({
    $or: [
      { senderId: myId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: myId },
    ],
  });

  if (!isParticipant) {
    res
      .status(403)
      .json({ message: "Access denied: you are not part of this conversation." });
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Helper: fetch and format messages for AI context.
// Attaches sender's fullName to each message for readable context.
// ---------------------------------------------------------------------------
async function getConversationMessages(myId, otherUserId) {
  const messages = await Message.find({
    $or: [
      { senderId: myId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: myId },
    ],
  })
    .sort({ createdAt: 1 }) // oldest first
    .populate("senderId", "fullName") // attach sender name
    .lean();

  // Normalize: attach senderName for the AI service
  return messages.map((msg) => ({
    ...msg,
    senderName: msg.senderId?.fullName || "Unknown",
  }));
}

// ---------------------------------------------------------------------------
// POST /api/ai/summarize
// Body: { otherUserId: string }
// ---------------------------------------------------------------------------
export const summarize = async (req, res) => {
  try {
    const myId = req.user._id;
    const { otherUserId } = req.body;

    const hasAccess = await verifyConversationAccess(myId, otherUserId, res);
    if (!hasAccess) return;

    const messages = await getConversationMessages(myId, otherUserId);

    if (messages.length === 0) {
      return res
        .status(200)
        .json({ summary: "This conversation has no messages yet." });
    }

    const result = await summarizeConversation(messages);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in summarize controller:", error.message);
    if (error.message.includes("AI service")) {
      return res.status(503).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/ask
// Body: { otherUserId: string, question: string }
// ---------------------------------------------------------------------------
export const ask = async (req, res) => {
  try {
    const myId = req.user._id;
    const { otherUserId, question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: "Question is required." });
    }

    const hasAccess = await verifyConversationAccess(myId, otherUserId, res);
    if (!hasAccess) return;

    const messages = await getConversationMessages(myId, otherUserId);
    const result = await askAboutConversation(messages, question);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in ask controller:", error.message);
    if (error.message.includes("AI service")) {
      return res.status(503).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/generate-message
// Body: { prompt: string, tone?: string }
// No otherUserId needed — this is a standalone generation, no message access.
// ---------------------------------------------------------------------------
export const generate = async (req, res) => {
  try {
    const { prompt, tone } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: "Prompt is required." });
    }

    const result = await generateMessage(prompt, tone);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in generate controller:", error.message);
    if (error.message.includes("AI service")) {
      return res.status(503).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/translate
// Body: { text: string, targetLanguage: string }
// No otherUserId needed — translates a single provided text string.
// ---------------------------------------------------------------------------
export const translate = async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Text to translate is required." });
    }
    if (!targetLanguage) {
      return res.status(400).json({ message: "Target language is required." });
    }

    const result = await translateMessage(text, targetLanguage);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in translate controller:", error.message);
    if (error.message.includes("AI service")) {
      return res.status(503).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error." });
  }
};
