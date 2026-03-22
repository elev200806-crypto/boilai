import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Chat (NVIDIA/OpenAI Proxy)
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;
    // Using environment variables for API configuration
    // Defaulting to the user-provided key for "fixed forever" integration
    const apiKey = process.env.OPENAI_API_KEY || "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";
    const baseUrl = process.env.OPENAI_API_BASE_URL || "https://integrate.api.nvidia.com/v1";
    const model = process.env.OPENAI_MODEL_NAME || "openai/gpt-oss-120b";

    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY not configured. Please add it to your environment variables." });
    }

    try {
      console.log(`Calling NVIDIA API: ${baseUrl}/chat/completions with model: ${model}`);
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`NVIDIA API Error (${response.status}):`, errorText);
        let errorMessage = `NVIDIA API Error ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error?.message || errorMessage;
        } catch (e) {}
        return res.status(response.status).json({ error: errorMessage });
      }

      // Stream the response back to the client
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (error) {
      console.error("Chat Proxy Error:", error);
      res.status(500).json({ error: "Failed to connect to AI engine." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TurboCode Engine running on http://localhost:${PORT}`);
  });
}

startServer();
