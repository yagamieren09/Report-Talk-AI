const Report = require('../models/Report');
const { callGemini } = require('../services/gemini');

async function analyse(req, res, user, body, contentType, parseMultipart) {
    try {
        let base64, mimeType, fileName = 'report';

        if (contentType.includes('multipart/form-data')) {
            const boundaryMatch = contentType.match(/boundary=(.+)$/);
            if (!boundaryMatch) return { status: 400, data: { error: 'No boundary' } };
            const parts = parseMultipart(body, boundaryMatch[1]);
            const filePart = parts.find(p => p.headers.includes('filename'));
            if (!filePart) return { status: 400, data: { error: 'No file found' } };

            const nameMatch = filePart.headers.match(/filename="([^"]+)"/);
            if (nameMatch) Object.assign(fileName, nameMatch[1]);

            const ctMatch = filePart.headers.match(/Content-Type:\s*(.+)/i);
            mimeType = ctMatch ? ctMatch[1].trim() : 'image/jpeg';

            base64 = filePart.data.toString('base64');
        } else if (contentType.includes('application/json')) {
            const parsed = JSON.parse(body.toString());
            base64 = parsed.base64;
            mimeType = parsed.mimeType || 'image/jpeg';
            fileName = parsed.fileName || 'report';
        } else {
            return { status: 400, data: { error: 'Unsupported content type' } };
        }

        const result = await callGemini(base64, mimeType);
        if (!result.ok) return { status: 500, data: { error: result.error } };

        let parsed;
        try { parsed = JSON.parse(result.text); }
        catch (e) { return { status: 500, data: { error: 'Parse failed', raw: result.text.substring(0, 200) } }; }

        // Save to MongoDB if it's a medical report
        if (parsed.is_medical_report && user) {
            const tests = parsed.tests || [];
            const attention_count = tests.filter(t => t.severity !== 'green').length;

            const reportDoc = await Report.create({
                userId: user._id,
                tests: tests,
                overall_summary: parsed.overall_summary,
                report_type: parsed.report_type || 'Unknown',
                total_tests: tests.length,
                attention_count: attention_count,
                normal_count: tests.length - attention_count,
                file_type: mimeType,
                file_name: typeof fileName === 'object' ? 'report' : fileName, // fallback
                model_used: result.model
            });
            parsed.reportId = reportDoc._id; // return ID to frontend
        }

        return { status: 200, data: { ...parsed, model: result.model } };
    } catch (e) {
        return { status: 500, data: { error: e.message } };
    }
}

async function history(req, res, user, url) {
    try {
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        const reports = await Report.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-tests.explanation'); // exclude large explanation field for list view if desired, but let's keep it simple

        const total = await Report.countDocuments({ userId: user._id });

        return {
            status: 200,
            data: {
                reports,
                page,
                totalPages: Math.ceil(total / limit),
                total
            }
        };
    } catch (error) {
        return { status: 500, data: { error: error.message } };
    }
}

async function getOne(req, res, user, id) {
    try {
        const report = await Report.findOne({ _id: id, userId: user._id });
        if (!report) return { status: 404, data: { error: 'Report not found' } };

        // Format to match Gemini output structure for frontend compatibility
        return {
            status: 200,
            data: {
                is_medical_report: true,
                report_type: report.report_type,
                tests: report.tests,
                overall_summary: report.overall_summary,
                model: report.model_used,
                _id: report._id,
                createdAt: report.createdAt
            }
        };
    } catch (error) {
        return { status: 500, data: { error: error.message } };
    }
}

async function deleteOne(req, res, user, id) {
    try {
        const result = await Report.findOneAndDelete({ _id: id, userId: user._id });
        if (!result) return { status: 404, data: { error: 'Report not found' } };

        return { status: 200, data: { success: true } };
    } catch (error) {
        return { status: 500, data: { error: error.message } };
    }
}

module.exports = { analyse, history, getOne, deleteOne };
