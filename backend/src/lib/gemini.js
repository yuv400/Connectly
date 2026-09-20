import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./env.js";

if (!ENV.GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY is not set in .env — AI features will not work."
  );
}

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY || "");

// Using gemini-3.6-flash — fast, cost-efficient, current model
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-3.6-flash",
});
