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
