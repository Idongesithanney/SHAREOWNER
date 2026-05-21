import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import fs from "fs";
import admin from "firebase-admin";

// Initialize Firebase Admin (using local file config securely)
let adminDb: admin.firestore.Firestore | null = null;
try {
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  adminDb = admin.firestore();
  adminDb.settings({ databaseId: firebaseConfig.firestoreDatabaseId });
} catch (err) {
  console.error("Firebase Admin initialization error:", err);
}

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      // Convert messages to Gemini format if needed, but for simplicity assuming we pass just the latest or a concatenated history
      const formattedHistory = messages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
      
      const prompt = `You are a helpful customer support chatbot for an investment platform named SHAREOWNER LTD.
You assist users with common queries regarding investments, withdrawals, deposits, referrals, and platform features.
Be concise, friendly, and professional. Do not invent actual user data, tell them to check their dashboard instead.
Here is the chat history:
${formattedHistory}
Assistant:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.status(500).json({ error: "Failed to process chat request." });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      if (!adminDb) {
        throw new Error("Admin Firestore not initialized");
      }

      const usersSnap = await adminDb.collection("users").get();
      const usersRaw = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Build stats map for counting referrals
      const referralCountsMap: { [code: string]: number } = {};
      usersRaw.forEach(u => {
        if (u.referredBy) {
          referralCountsMap[u.referredBy] = (referralCountsMap[u.referredBy] || 0) + 1;
        }
      });

      // Filter to USER role only (excluding ADMINs from leaderboard)
      const participants = usersRaw
        .filter(u => u.role === 'USER')
        .map(u => {
          return {
            id: u.id,
            name: u.name || "Anonymous Partner",
            totalEarnings: Number(u.totalEarnings) || 0,
            referralCode: u.referralCode || "",
            referralsCount: referralCountsMap[u.referralCode] || 0
          };
        });

      // Sort by totalEarnings desc, limit to top 10
      participants.sort((a, b) => b.totalEarnings - a.totalEarnings);
      const leaderboard = participants.slice(0, 10);

      res.json({ leaderboard });
    } catch (error: any) {
      console.error("Leaderboard API Error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard statistics." });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
