const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    original_name: String,
    plain_name: String,
    value: String,
    reference_range: String,
    status: String,
    severity: String,
    severity_label: String,
    explanation: String
}, { _id: false });

const reportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tests: [testSchema],
    overall_summary: String,
    report_type: String,
    total_tests: Number,
    attention_count: Number,
    normal_count: Number,
    file_type: String,
    file_name: String,
    model_used: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
