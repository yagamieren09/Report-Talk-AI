const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBhx59p517Oxi1rxdreSIfmFyL8PYkOOk4';

const PROMPT = `[IMPORTANT: Output raw JSON only. No thinking. No explanation. No markdown.]
You are a medical report reader. Extract ALL test results from this lab report image.

Return ONLY valid JSON, no markdown, no backticks, no extra text:

{"is_medical_report":true,"report_type":"CBC or Metabolic Panel or Thyroid or Lipid or Other","tests":[{"original_name":"exact name","plain_name":"simple English name","value":"value+unit","reference_range":"range","status":"LOW or NORMAL or HIGH","severity":"green or yellow or red","severity_label":"All Good or Keep Watch or See Doctor","explanation":"One sentence max 20 words."}],"overall_summary":"Two sentences max."}

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
                contents: [{
                    parts: [
                        { inline_data: { mime_type: mimeType, data: base64 } },
                        { text: PROMPT }
                    ]
                }],
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

module.exports = { callGemini, GEMINI_MODELS };
