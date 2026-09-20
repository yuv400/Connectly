import { geminiModel } from "../lib/gemini.js";

// Maximum number of messages to include in AI context.
// Prevents sending thousands of messages to the AI.
const MAX_CONTEXT_MESSAGES = 100;

/**
 * Formats raw message documents into a readable conversation context string.
 * Each line: [HH:MM] SenderName: message text
 * Image-only messages are shown as [image].
 *
 * @param {Array} messages - Array of Message docs (populated with sender fullName)
 * @returns {string}
 */
function formatContext(messages) {
  const recent = messages.slice(-MAX_CONTEXT_MESSAGES);

  return recent
    .map((msg) => {
      const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const name = msg.senderName || "Unknown";
      const content = msg.text ? msg.text : "[image]";
      return `[${time}] ${name}: ${content}`;
    })
    .join("\n");
}

/**
 * Summarizes a conversation.
 * Returns structured sections: Summary, Decisions, Tasks, Deadlines, Important Points.
 */
export async function summarizeConversation(messages) {
  if (!messages || messages.length === 0) {
    return { error: "No messages to summarize." };
  }

  const context = formatContext(messages);

  const prompt = `You are an AI assistant that analyzes chat conversations.

Here is the conversation between users:

${context}

Please analyze this conversation and provide a structured summary with the following sections.
IMPORTANT: Only extract information that is EXPLICITLY mentioned in the conversation.
Do NOT invent names, tasks, decisions, or deadlines that aren't stated.
If a section has no relevant content, write "None found in this conversation."

Format your response EXACTLY like this (use these exact section headers):

**Summary**
[2-4 sentence overview of what was discussed]

**Decisions**
[Bullet list of decisions made, or "None found in this conversation."]

**Tasks**
[Bullet list of tasks with assignees if mentioned, or "None found in this conversation."]

**Deadlines**
[Any dates or deadlines mentioned, or "None found in this conversation."]

**Important Points**
[Other key points worth noting, or "None found in this conversation."]`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    return { summary: text };
  } catch (error) {
    console.error("AI summarize error:", error.message, error?.status, error?.errorDetails);
    throw new Error("AI service failed to generate summary.");
  }
}

/**
 * Answers a user's question about a conversation.
 * Strictly grounded — will not hallucinate answers.
 */
export async function askAboutConversation(messages, question) {
  if (!messages || messages.length === 0) {
    return { answer: "There are no messages in this conversation to answer your question." };
  }

  if (!question || !question.trim()) {
    return { answer: "Please provide a question." };
  }

  const context = formatContext(messages);

  const prompt = `You are an AI assistant that answers questions about chat conversations.
You MUST only use information that is explicitly present in the conversation below.
If the answer is not in the conversation, you MUST say: "The conversation does not contain enough information to answer this question."
Do NOT guess, infer, or hallucinate any names, tasks, decisions, or dates.

Conversation:
${context}

User's question: ${question.trim()}

Provide a clear, concise answer based only on the conversation above.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    return { answer: text };
  } catch (error) {
    console.error("AI ask error:", error.message);
    throw new Error("AI service failed to answer the question.");
  }
}

/**
 * Generates a draft message based on a user prompt and optional tone.
 * The generated message is NEVER sent automatically.
 */
export async function generateMessage(userPrompt, tone = "neutral") {
  if (!userPrompt || !userPrompt.trim()) {
    return { generatedMessage: "" };
  }

  const toneMap = {
    professional: "professional and formal",
    friendly: "warm and friendly",
    shorter: "concise and brief",
    grammar: "grammatically correct with improved clarity",
    neutral: "clear and natural",
  };

  const toneDescription = toneMap[tone] || toneMap.neutral;

  const prompt = `You are a helpful writing assistant. Generate a chat message based on the user's request.

User's request: ${userPrompt.trim()}
Tone: Make the message ${toneDescription}.

Rules:
- Generate ONLY the message text, nothing else.
- Do NOT include any preamble like "Here is a message:" or quotes around it.
- Keep it conversational and appropriate for a chat application.
- Do not add signatures or sign-offs unless explicitly requested.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text().trim();
    return { generatedMessage: text };
  } catch (error) {
    console.error("AI generate error:", error.message);
    throw new Error("AI service failed to generate a message.");
  }
}

/**
 * Translates a single message to the target language.
 * NEVER modifies or returns the original message.
 */
export async function translateMessage(text, targetLanguage) {
  if (!text || !text.trim()) {
    return { translation: "" };
  }

  const supportedLanguages = {
    hindi: "Hindi",
    english: "English",
    spanish: "Spanish",
    french: "French",
    german: "German",
    arabic: "Arabic",
    chinese: "Simplified Chinese",
    japanese: "Japanese",
  };

  const langName = supportedLanguages[targetLanguage?.toLowerCase()] || targetLanguage;

  const prompt = `Translate the following message to ${langName}.
Return ONLY the translated text. Do NOT include the original text, explanations, or any other content.

Message to translate:
${text.trim()}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const translated = result.response.text().trim();
    return { translation: translated, targetLanguage: langName };
  } catch (error) {
    console.error("AI translate error:", error.message);
    throw new Error("AI service failed to translate the message.");
  }
}
