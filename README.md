# 💊 ReportTalk

> AI-powered medical report analyser that explains your blood test results in simple, jargon-free language

🌐 **Live Demo:** https://report-talk-ai.onrender.com

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat&logo=mongodb&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=flat&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)
![Status](https://img.shields.io/badge/Status-Live-brightgreen?style=flat)

---

## 🌟 What It Does

Most people receive blood test results and have no idea what they mean. ReportTalk fixes that.

Upload a photo or PDF of any lab report — CBC, thyroid, kidney, liver, diabetes panel — and get a clear, simple explanation of every single test result. No medical jargon. No confusion. Just plain English.

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 **Auth** | Register and login with email + password. JWT tokens, bcrypt hashing |
| 💾 **History** | Every report saved to MongoDB with timestamp. View, reload, delete |
| 🛡️ **Rate Limiting** | 3 layers — 100 req/15min general, 10 req/15min auth, 20 analyses/hour |
| 📄 **PDF + Image Upload** | Supports JPG, PNG and PDF lab reports |
| 🤖 **AI Powered** | Google Gemini Vision reads and understands reports |
| 🎨 **Beautiful UI** | Clinical luxury design with light and dark mode |
| 📥 **Export as PDF** | Save explained results as a formatted PDF |
| 🔒 **Secure Backend** | API key stays on server, never in the browser |
| ⚡ **Auto Fallback** | Gemini 2.5 Flash → Flash-Lite → Pro automatically |
| 📱 **Mobile Responsive** | Works on all screen sizes |

---

## 🖥️ Live Demo

👉 **[https://report-talk-ai.onrender.com](https://report-talk-ai.onrender.com)**

1. Create a free account
2. Upload any blood test image or PDF
3. Get plain English explanations instantly
4. View your full report history anytime

---

## 🚀 Run Locally

### Requirements
- Node.js 18+ → [nodejs.org](https://nodejs.org)
- Free Gemini API key → [aistudio.google.com](https://aistudio.google.com/app/apikey)
- Free MongoDB Atlas URI → [mongodb.com/atlas](https://mongodb.com/atlas)

### Steps
```bash
# 1. Clone the repo
git clone https://github.com/yagamieren09/Report-Talk-AI.git
cd Report-Talk-AI/reporttalk/backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in your GEMINI_API_KEY, MONGODB_URI, JWT_SECRET

# 4. Start the server
node server.js

# 5. Open in browser
# http://localhost:3000
```

---

## 📁 Project Structure
```
reporttalk/
├── backend/
│   ├── server.js              ← Node.js server (raw http, no frameworks)
│   ├── package.json
│   ├── .env.example
│   ├── models/
│   │   ├── User.js            ← User schema with bcrypt password hashing
│   │   └── Report.js          ← Report schema with tests array
│   ├── middleware/
│   │   └── auth.js            ← JWT token verification
│   ├── routes/
│   │   ├── auth.js            ← Register, login, me
│   │   └── reports.js         ← Analyse, history, get, delete
│   └── services/
│       └── gemini.js          ← Gemini API with 3-model fallback
└── frontend/
    └── index.html             ← Full app UI (single file, no frameworks)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/analyse` | Yes | Analyse a report |
| GET | `/api/reports` | Yes | Paginated history |
| GET | `/api/reports/:id` | Yes | Single report |
| DELETE | `/api/reports/:id` | Yes | Delete report |
| GET | `/health` | No | Server status |

---

## 🛡️ Rate Limiting

| Route | Limit |
|-------|-------|
| All routes | 100 requests / 15 min |
| Auth routes | 10 requests / 15 min |
| Analyse route | 20 requests / hour |

---

## 🧠 How It Works

1. User registers and logs in — JWT token saved in browser
2. Uploads a lab report image or PDF
3. Frontend sends file to Node.js backend with auth token
4. Backend verifies token, forwards file to Google Gemini Vision API
5. Gemini extracts all test values and generates plain English explanations
6. Results saved to MongoDB under the user's account
7. Color coded cards returned — 🟢 Normal · 🟡 Watch · 🔴 See Doctor

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JS (single file) |
| Backend | Node.js (no frameworks) |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |
| AI | Google Gemini 2.5 Flash |
| PDF Preview | PDF.js |
| PDF Export | jsPDF |
| Rate Limiting | Custom JS Map implementation |
| Fonts | Instrument Serif + Geist |
| Hosting | Render.com |

---

## 🚢 Deployment

Deployed on **Render.com** (free tier).

Environment variables needed:
```
GEMINI_API_KEY=your_gemini_key
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
PORT=3000
```

---

## ⚠️ Disclaimer

ReportTalk is for **educational purposes only**. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified doctor for medical decisions.

---

## 📄 License

MIT License — feel free to use, modify, and share.

---

<p align="center">Built with ❤️ by <a href="https://github.com/yagamieren09">Karthik R</a></p>
