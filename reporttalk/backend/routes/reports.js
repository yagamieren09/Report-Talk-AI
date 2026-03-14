const jwt = require('jsonwebtoken');
const Report = require('../models/Report');

function verifyToken(req) {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) throw new Error('No token');
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
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
        parts.push({ headers: headers, data: data });
        start = bEnd;
    }
    return parts;
}

async function analyseReport(req, res) {
    try {
        const userId = verifyToken(req);
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Must be multipart/form-data' }));
            return;
        }
        const boundaryMatch = contentType.split('boundary=');
        if (!boundaryMatch[1]) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No boundary found' }));
            return;
        }
        const boundary = boundaryMatch[1];
        const chunks = [];
        await new Promise((resolve, reject) => {
            req.on('data', function (chunk) { chunks.push(chunk); });
            req.on('end', resolve);
            req.on('error', reject);
        });
        const body = Buffer.concat(chunks);
        const parts = parseMultipart(body, boundary);
        const filePart = parts.find(function (p) {
            return p.headers.includes('filename');
        });
        if (!filePart) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No file found' }));
            return;
        }
        const ctMatch = filePart.headers.match(/Content-Type:\s*(.+)/i);
        const mimeType = ctMatch ? ctMatch[1].trim() : 'image/jpeg';
        const base64 = filePart.data.toString('base64');
        const nameMatch = filePart.headers.match(/filename="(.+?)"/i);
        const fileName = nameMatch ? nameMatch[1] : 'report';
        const fileType = mimeType === 'application/pdf' ? 'pdf' : 'image';
        const { analyseWithGemini } = require('../services/gemini');
        const result = await analyseWithGemini(base64, mimeType);
        if (!result.ok) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: result.error }));
            return;
        }
        const data = result.data;
        if (!data.is_medical_report) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ is_medical_report: false }));
            return;
        }
        const attn = data.tests.filter(function (t) {
            return t.severity !== 'green';
        }).length;
        const report = await Report.create({
            userId: userId,
            overall_summary: data.overall_summary,
            tests: data.tests,
            report_type: data.report_type || 'Lab Report',
            file_name: fileName,
            file_type: fileType,
            model_used: result.model,
            total_tests: data.tests.length,
            attention_count: attn,
            normal_count: data.tests.length - attn
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            is_medical_report: true,
            report_id: report._id,
            overall_summary: data.overall_summary,
            report_type: data.report_type,
            tests: data.tests,
            model: result.model
        }));
    } catch (err) {
        const status = err.message === 'No token' ? 401 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

async function getReports(req, res) {
    try {
        const userId = verifyToken(req);
        const urlParts = req.url.split('?');
        const params = new URLSearchParams(urlParts[1] || '');
        const page = parseInt(params.get('page')) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const total = await Report.countDocuments({ userId: userId });
        const reports = await Report.find({ userId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('overall_summary report_type file_name file_type total_tests attention_count normal_count createdAt');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            reports: reports,
            pagination: {
                page: page,
                total: total,
                pages: Math.ceil(total / limit)
            }
        }));
    } catch (err) {
        const status = err.message === 'No token' ? 401 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

async function getReport(req, res, id) {
    try {
        const userId = verifyToken(req);
        const report = await Report.findOne({ _id: id, userId: userId });
        if (!report) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Report not found' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
    } catch (err) {
        const status = err.message === 'No token' ? 401 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

async function deleteReport(req, res, id) {
    try {
        const userId = verifyToken(req);
        const report = await Report.findOneAndDelete({ _id: id, userId: userId });
        if (!report) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Report not found' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Deleted' }));
    } catch (err) {
        const status = err.message === 'No token' ? 401 : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

module.exports = { analyseReport, getReports, getReport, deleteReport };
