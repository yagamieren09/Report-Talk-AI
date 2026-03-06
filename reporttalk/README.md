# 💊 ReportTalk v2.0

Upload any medical lab report (image or PDF) and get plain English explanations instantly.

---

## 🚀 Quick Start (5 minutes)

### Step 1 — Get a Gemini API Key (free)
1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key** → **Create new project**
3. Copy the key (starts with `AIzaSy...`)

### Step 2 — Set your API key

**Windows:**
```
set GEMINI_API_KEY=AIzaSy_your_key_here
```

**Mac / Linux:**
```
export GEMINI_API_KEY=AIzaSy_your_key_here
```

**Or** just open `backend/server.js` and replace line 5:
```js
const GEMINI_API_KEY = 'AIzaSy_your_key_here';
```

### Step 3 — Start the server
```bash
cd backend
node server.js
```

### Step 4 — Open the app
Open your browser and go to:
```
http://localhost:3000
```

That's it! 🎉

---

## 📁 Project Structure

```
reporttalk/
├── backend/
│   ├── server.js       ← Node.js server (hides API key)
│   └── package.json
└── frontend/
    └── index.html      ← Full app UI
```

---

## ✨ Features

- **PDF upload** — upload lab reports as PDFs directly
- **Image upload** — JPG, PNG supported
- **Drag & drop** — drag files onto the upload zone
- **PDF export** — save your results as a beautiful PDF
- **Dark mode** — toggle between light and dark
- **Secure** — API key stays on your server, never in the browser
- **Auto fallback** — tries Gemini 2.5 Flash → Flash-Lite → Pro automatically
- **Demo mode** — try without a real report

---

## 🔒 Security

Your Gemini API key is stored only on the server and never sent to the browser.
The frontend talks to your local server (`localhost:3000`), not Google directly.

---

## 🛠 Requirements

- Node.js 18 or higher
- A free Gemini API key from https://aistudio.google.com

---

## ⚠️ Disclaimer

For educational purposes only. Always consult a qualified doctor for medical decisions.
