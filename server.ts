import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

function cleanAiResponse(text: string): string {
  if (!text) return "";
  
  let cleaned = text.trim();
  
  // 1. Strip Markdown code block wrappers at start and end of string
  const codeBlockRegex = /^```(?:markdown|html|text)?\s*\n?([\s\S]*?)\n?\s*```$/i;
  let matches = cleaned.match(codeBlockRegex);
  if (matches) {
    cleaned = matches[1].trim();
  } else {
    const genericCodeBlockRegex = /^```(?:markdown|html|text)?\s*([\s\S]*?)\s*```$/i;
    matches = cleaned.match(genericCodeBlockRegex);
    if (matches) {
      cleaned = matches[1].trim();
    }
  }

  // 2. Remove common conversational introductory filler phrases
  const introPatterns = [
    /^here is the updated text:?\s*\n*/i,
    /^here is the polished text:?\s*\n*/i,
    /^here is the summary:?\s*\n*/i,
    /^here is the translation:?\s*\n*/i,
    /^here's the updated text:?\s*\n*/i,
    /^here's the polished text:?\s*\n*/i,
    /^here's the summary:?\s*\n*/i,
    /^here's the translation:?\s*\n*/i,
    /^sure, here is the updated text:?\s*\n*/i,
    /^sure, here is the polished text:?\s*\n*/i,
    /^sure, here's the updated text:?\s*\n*/i,
    /^sure, here's the polished text:?\s*\n*/i,
    /^sure, here is the summary:?\s*\n*/i,
    /^sure, here's the summary:?\s*\n*/i,
    /^sure, here is the translation:?\s*\n*/i,
    /^sure, here's the translation:?\s*\n*/i,
    /^sure! here is the text:?\s*\n*/i,
    /^here is the translation of your text into [a-zA-Z]+:?\s*\n*/i,
    /^sure, here are the corrections:?\s*\n*/i,
    /^here are the corrections for the text:?\s*\n*/i,
    /^as requested, here is the text:?\s*\n*/i,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of introPatterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, "").trim();
        changed = true;
      }
    }
  }

  // 3. Remove common conversational outro phrases at the very end
  const outroPatterns = [
    /\s*\n*hope this helps!?$/i,
    /\s*\n*let me know if you need anything else!?$/i,
    /\s*\n*let me know if you want me to make any other changes!?$/i,
    /\s*\n*let me know if you need any other changes!?$/i,
    /\s*\n*let me know if you need further assistance!?$/i,
    /\s*\n*i hope this helps!?$/i,
    /\s*\n*hope this is what you were looking for!?$/i,
    /\s*\n*i hope this is what you were looking for!?$/i,
  ];

  changed = true;
  while (changed) {
    changed = false;
    for (const pattern of outroPatterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, "").trim();
        changed = true;
      }
    }
  }

  return cleaned;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON bodies
  app.use(express.json({ limit: "10mb" }));

  // API endpoint for Gemini Writing Assistant
  app.post("/api/gemini/assist", async (req, res) => {
    try {
      const { action, text, context, customPrompt } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets." 
        });
      }

      // Initialize GoogleGenAI SDK with user-agent for telemetry
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      let prompt = "";
      const systemInstruction = 
        "You are an expert AI writing assistant integrated into Lumina Notes, a beautiful, rich text markdown-based editor. " +
        "Your task is to refine, translate, format, or continue the user's text precisely. " +
        "You must return ONLY the resulting processed/generated text. " +
        "Do NOT include any conversational filler, explanations, markdown code blocks wrap (such as ```markdown), intro, or outro text. " +
        "Output ONLY the raw markdown/HTML content itself so it can be seamlessly inserted back into the editor.";

      switch (action) {
        case "summarize":
          prompt = `Provide a concise, beautifully structured summary of the following text using bullet points if appropriate:\n\n${text}`;
          break;
        case "improve":
          prompt = `Improve the writing quality, professional tone, grammar, and sentence flow of the following text while preserving its core meaning:\n\n${text}`;
          break;
        case "grammar":
          prompt = `Correct any spelling, grammar, and punctuation mistakes in the following text, keeping the exact style and formatting otherwise:\n\n${text}`;
          break;
        case "longer":
          prompt = `Elongate and expand the following text, elaborating with detail and flow, while keeping the original context and style:\n\n${text}`;
          break;
        case "shorter":
          prompt = `Condense and shorten the following text to be highly concise and punchy without losing key details:\n\n${text}`;
          break;
        case "tone_professional":
          prompt = `Rewrite the following text to have a highly professional, polished, executive tone:\n\n${text}`;
          break;
        case "tone_casual":
          prompt = `Rewrite the following text to have a friendly, warm, casual, and conversational tone:\n\n${text}`;
          break;
        case "tone_creative":
          prompt = `Rewrite the following text to be highly engaging, vivid, and creatively styled:\n\n${text}`;
          break;
        case "translate":
          prompt = `Precisely translate the following text into ${customPrompt}. Maintain any markdown/HTML structure and formatting unchanged. Do not translate tags:\n\n${text}`;
          break;
        case "custom":
          prompt = `Task: ${customPrompt}\n\nSelected text to edit:\n"${text}"\n\nFull Note Context (for reference):\n"${context || ""}"\n\nExecute the task precisely and output ONLY the final edited text.`;
          break;
        case "complete":
          prompt = `You are a smart inline auto-completion engine. Continue writing naturally based on the current context.\n\nNote Title/Context: "${context || ""}"\n\nText up to cursor:\n"${text}"\n\nGenerate the next logical 1-3 sentences/paragraphs. Do NOT repeat what was already written. Output ONLY the new text to append.`;
          break;
        default:
          return res.status(400).json({ error: "Invalid action specified." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const resultText = response.text || "";
      res.json({ result: cleanAiResponse(resultText) });
    } catch (err: unknown) {
      console.error("Gemini service error:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred with the Gemini AI service.";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Serve static assets or use Vite Dev Server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Development mode: Vite middleware mounted successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production mode: Serving static files from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lumina Notes backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Lumina Notes server:", err);
});
