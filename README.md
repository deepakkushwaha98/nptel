# Psychology of Learning — Weekly MCQ Practice (MERN)

A full-stack MERN practice website based on the uploaded NPTEL Psychology of Learning weekly assignment PDFs (Weeks 1–11) and the Week 12 screenshot.

## Features
- Weekly question bank (Weeks 1–12), 10 questions per week
- MCQ practice with question navigation and a progress indicator
- Submit quiz, see score, correct answers, and explanations/revision notes
- Dashboard with weekly question counts and saved attempt history
- Express REST API and MongoDB persistence for quiz attempts
- Works in demo mode without MongoDB: questions still load; attempts are kept in browser local storage
- Responsive UI

## Requirements
- Node.js 18+
- MongoDB Community Server or MongoDB Atlas (optional for demo mode)

## Run locally

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
The API runs at `http://localhost:5000`.

### 2. Frontend (new terminal)
```bash
cd client
npm install
npm run dev
```
Open the URL shown by Vite (usually `http://localhost:5173`).

Set `VITE_API_URL=http://localhost:5000/api` in `client/.env` if needed.

### MongoDB
Set `MONGO_URI` in `server/.env`. If MongoDB is not available, the API still serves the question bank and the frontend stores attempts locally.

## API
- `GET /api/health`
- `GET /api/weeks`
- `GET /api/questions?week=1`
- `POST /api/attempts` — `{ week, score, total, answers }`
- `GET /api/attempts` — saved attempts when MongoDB is connected

## Question source notes
- Weeks 1–11 are transcribed from the uploaded NPTEL Psychology of Learning assignment PDFs.
- Week 12 is transcribed from the provided screenshot.
- Questions are presented as practice material; review the original lecture notes for full explanations.
