# 💊 ReportTalk

> Upload any blood test or lab report and get plain English explanations instantly — powered by Google Gemini AI

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=flat&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## 🌟 What It Does

Most people receive blood test results and have no idea what they mean. ReportTalk fixes that.

Upload a photo or PDF of any lab report — CBC, thyroid, kidney, liver, diabetes panel — and get a clear, simple explanation of every single test result. No medical jargon. No confusion. Just plain English.

---

## ✨ Features

- 📄 **PDF + Image Upload** — supports JPG, PNG, and PDF lab reports
- 🤖 **AI-Powered** — uses Google Gemini Vision to read and understand reports
- 🎨 **Beautiful UI** — clinical luxury design with light and dark mode
- 📥 **Export as PDF** — save your explained results as a formatted PDF
- 🔒 **Secure Backend** — API key stays on your server, never in the browser
- ⚡ **Auto Fallback** — tries Gemini 2.5 Flash → Flash-Lite → Pro automatically
- 🌙 **Dark Mode** — fully designed dark theme
- 📱 **Mobile Responsive** — works on all screen sizes
- ✨ **Demo Mode** — try it without a real report

---

## 🖥️ Demo

| Upload Screen | Results Screen |
|---|---|
| Drop your report or click to upload | Color-coded cards for every test |

---

## 🚀 Quick Start

### Requirements
- Node.js 18 or higher — [nodejs.org](https://nodejs.org)
- Free Gemini API key — [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/reporttalk.git
cd reporttalk
```

### 2. Add your API key
Open `backend/server.js` and edit line 5:
```js
const GEMINI_API_KEY = 'AIzaSy_your_key_here';
```

### 3. Start the server
```bash
cd backend
node server.js
```

### 4. Open the app
```
http://localhost:3000
```

---

## 📁 Project Structure
```
reporttalk/
├── backend/
│   ├── server.js        ← Node.js server (hides API key)
│   └── package.json
├── frontend/
│   └── index.html       ← Full app UI (single file)
└── README.md
```

---

## 🔒 Security

Your Gemini API key is stored only on the server and never sent to the browser. The frontend communicates with your local server at `localhost:3000`, not with Google directly.

---

## 🧠 How It Works

1. User uploads a lab report image or PDF
2. Frontend sends the file to the Node.js backend
3. Backend forwards it to Google Gemini Vision API with a structured prompt
4. Gemini extracts all test values and generates plain English explanations
5. Results are returned as color-coded cards — 🟢 Normal, 🟡 Watch, 🔴 See Doctor

---

## 🛠️ Tech Stack

| Layer | Technology |
| Frontend | HTML, CSS, Vanilla JS |
| Backend | Node.js (no frameworks) |
| AI | Google Gemini 2.5 Flash |
| PDF Preview | PDF.js |
| PDF Export | jsPDF |
| Fonts | Instrument Serif + Geist |

---

## ⚠️ Disclaimer

ReportTalk is for **educational purposes only**. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified doctor for medical decisions.

---

## 📄 License

MIT License — feel free to use, modify, and share.

---

<p align="center">Built with ❤️ by <a href="https://github.com/yagamieren09">Karthik R</a></p>
