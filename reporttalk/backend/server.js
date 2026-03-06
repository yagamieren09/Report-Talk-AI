const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ── CONFIG ── Put your Gemini API key here
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBhx59p517Oxi1rxdreSIfmFyL8PYkOOk4';
const PORT = process.env.PORT || 3000;

const PROMPT = `[IMPORTANT: Output raw JSON only. No thinking. No explanation. No markdown.]
You are a medical report reader. Extract ALL test results from this lab report image.

Return ONLY valid JSON, no markdown, no backticks, no extra text:

{"is_medical_report":true,"tests":[{"original_name":"exact name","plain_name":"simple English name","value":"value+unit","reference_range":"range","status":"LOW or NORMAL or HIGH","severity":"green or yellow or red","severity_label":"All Good or Keep Watch or See Doctor","explanation":"One sentence max 20 words."}],"overall_summary":"Two sentences max."}

Severity: green=in range or within 10%, yellow=10-30% outside, red=30%+ outside or critical.
Not a medical report: {"is_medical_report":false,"tests":[],"overall_summary":""}
ONLY JSON. Nothing else.`;

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'
];

async function callGemini(base64, mimeType) {
  let lastErr = '';
  for (const model of GEMINI_MODELS) {
    try {
      const body = JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: PROMPT }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        lastErr = err?.error?.message || `HTTP ${resp.status}`;
        if (resp.status === 400 || resp.status === 403) break;
        continue;
      }

      const data = await resp.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) clean = m[0];
      return { ok: true, text: clean, model };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { ok: false, error: lastErr };
}

function parseMultipart(body, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = 0;

  while (start < body.length) {
    const bStart = body.indexOf(boundaryBuf, start);
    if (bStart === -1) break;
    const headerStart = bStart + boundaryBuf.length + 2;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;
    const headers = body.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    const bEnd = body.indexOf(boundaryBuf, dataStart);
    if (bEnd === -1) break;
    const data = body.slice(dataStart, bEnd - 2);
    parts.push({ headers, data });
    start = bEnd;
  }
  return parts;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, obj) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    cors(res);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(200); res.end(); return; }

  // Serve frontend
  if (req.method === 'GET' && url.pathname === '/') {
    return serveFile(res, path.join(__dirname, '../frontend/index.html'), 'text/html');
  }

  // Health check
  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { status: 'ok', models: GEMINI_MODELS });
  }

  // Analyse endpoint
  if (req.method === 'POST' && url.pathname === '/analyse') {
    const contentType = req.headers['content-type'] || '';
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        let base64, mimeType;

        if (contentType.includes('multipart/form-data')) {
          // PDF or image upload
          const boundaryMatch = contentType.match(/boundary=(.+)$/);
          if (!boundaryMatch) return json(res, 400, { error: 'No boundary' });
          const parts = parseMultipart(body, boundaryMatch[1]);
          const filePart = parts.find(p => p.headers.includes('filename'));
          if (!filePart) return json(res, 400, { error: 'No file found' });

          const ctMatch = filePart.headers.match(/Content-Type:\s*(.+)/i);
          mimeType = ctMatch ? ctMatch[1].trim() : 'image/jpeg';

          // For PDF: convert first page to jpeg using sharp/canvas — use base64 directly
          // Gemini supports PDF natively!
          if (mimeType === 'application/pdf') {
            base64 = filePart.data.toString('base64');
            mimeType = 'application/pdf';
          } else {
            base64 = filePart.data.toString('base64');
          }
        } else if (contentType.includes('application/json')) {
          const parsed = JSON.parse(body.toString());
          base64 = parsed.base64;
          mimeType = parsed.mimeType || 'image/jpeg';
        } else {
          return json(res, 400, { error: 'Unsupported content type' });
        }

        const result = await callGemini(base64, mimeType);
        if (!result.ok) return json(res, 500, { error: result.error });

        let parsed;
        try { parsed = JSON.parse(result.text); }
        catch (e) { return json(res, 500, { error: 'Parse failed', raw: result.text.substring(0, 200) }); }

        return json(res, 200, { ...parsed, model: result.model });
      } catch (e) {
        return json(res, 500, { error: e.message });
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🏥 ReportTalk Backend running at http://localhost:${PORT}`);
  console.log(`📋 Open http://localhost:${PORT} in your browser`);
  if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log('\n⚠️  Set your Gemini API key:');
    console.log('   Windows: set GEMINI_API_KEY=your_key_here');
    console.log('   Mac/Linux: export GEMINI_API_KEY=your_key_here');
    console.log('   Or edit server.js line 5\n');
  }
});
