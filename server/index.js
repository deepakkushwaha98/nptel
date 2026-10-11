import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, "data/questions.json"), "utf8"));

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const mongoEnabled = Boolean(process.env.MONGO_URI && process.env.MONGO_URI.trim());

console.log(mongoEnabled ? "MongoDB enabled" : "MongoDB not configured; running in local-only mode.");

app.get("/api/health", (_req, res) => res.json({ ok: true, mongoConnected: false }));
app.get("/api/weeks", (_req, res) => {
  const map = new Map();
  for (const q of questions) {
    if (!map.has(q.week)) map.set(q.week, { week: q.week, title: q.weekTitle, count: 0 });
    map.get(q.week).count++;
  }
  res.json([...map.values()]);
});
app.get("/api/questions", (req, res) => {
  const week = Number(req.query.week);
  if (!Number.isInteger(week) || week < 1 || week > 12) return res.status(400).json({ message: "Choose a week from 1 to 12." });
  const weekQuestions = questions.filter(q => q.week === week);
  res.json(shuffleArray(weekQuestions));
});
app.post("/api/attempts", async (req, res) => {
  const { week, score, total, answers = [] } = req.body;
  if (!Number.isInteger(week) || week < 1 || week > 12 || !Number.isFinite(score) || !Number.isFinite(total) || total < 1) {
    return res.status(400).json({ message: "Invalid attempt data." });
  }
  if (!mongoEnabled) {
    return res.status(200).json({ message: "MongoDB is not configured; attempt saved locally by the frontend only." });
  }
  res.status(200).json({ message: "MongoDB is configured but not used in this local-only setup." });
});
app.get("/api/attempts", async (_req, res) => {
  res.json([]);
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
