const mongoose = require('mongoose');
const User = require('./models/User');
const Report = require('./models/Report');
require('dotenv').config();

const API = 'http://localhost:3000';

const results = [];
function addRes(testIdx, testName, expected, result, passFail, error = '') {
    results.push({ testIdx, testName, expected, result, passFail, error });
    console.log(`[${passFail}] ${testIdx}. ${testName}`);
    if (error) console.log(`   Error: ${error}`);
}

async function runTests() {
    if (!process.env.MONGODB_URI) { console.log("No MONGODB_URI found"); process.exit(1); }
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({ email: "test@reporttalk.com" });

    let token = null;

    // 1. Health
    try {
        const r1 = await fetch(`${API}/health`);
        const d1 = await r1.json();
        if (d1.status === 'ok' && d1.db === 'connected' && d1.uptime) {
            addRes(1, 'SERVER HEALTH CHECK', '{ status: "ok", db: "connected", uptime: "Xs" }', JSON.stringify(d1), 'Pass');
        } else {
            addRes(1, 'SERVER HEALTH CHECK', '{ status: "ok", ... }', JSON.stringify(d1), 'Fail', 'Unexpected response payload');
        }
    } catch (e) { addRes(1, 'SERVER HEALTH CHECK', '{ status: "ok", ... }', 'Error', 'Fail', e.message); }

    // 2. Register
    try {
        const r2 = await fetch(`${API}/api/auth/register`, {
            method: 'POST', body: JSON.stringify({ name: 'Test User', email: 'test@reporttalk.com', password: 'test123' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const d2 = await r2.json();
        if (r2.status === 201 && d2.token && d2.user && !d2.user.password) {
            addRes(2, 'AUTH — REGISTER', '201 response with token and user object', JSON.stringify(d2), 'Pass');
            token = d2.token;
        } else {
            addRes(2, 'AUTH — REGISTER', '201 response with token and user object', JSON.stringify({ status: r2.status, ...d2 }), 'Fail', 'Missing token/user or password included');
        }
    } catch (e) { addRes(2, 'AUTH — REGISTER', '', 'Error', 'Fail', e.message); }

    // 3. Duplicate Email
    try {
        const r3 = await fetch(`${API}/api/auth/register`, {
            method: 'POST', body: JSON.stringify({ name: 'Test User 2', email: 'test@reporttalk.com', password: 'password123' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const d3 = await r3.json();
        if (r3.status === 400 && d3.error === 'Email already in use') {
            addRes(3, 'AUTH — DUPLICATE EMAIL', '400 error with message', JSON.stringify({ status: r3.status, ...d3 }), 'Pass');
        } else {
            addRes(3, 'AUTH — DUPLICATE EMAIL', '400 error with message', JSON.stringify({ status: r3.status, ...d3 }), 'Fail', d3.error);
        }
    } catch (e) { addRes(3, 'AUTH — DUPLICATE EMAIL', '', 'Error', 'Fail', e.message); }

    // 4. Login
    try {
        const r4 = await fetch(`${API}/api/auth/login`, {
            method: 'POST', body: JSON.stringify({ email: 'test@reporttalk.com', password: 'test123' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const d4 = await r4.json();
        if (r4.status === 200 && d4.token && d4.user) {
            addRes(4, 'AUTH — LOGIN', '200 response with token and user', JSON.stringify(d4), 'Pass');
        } else {
            addRes(4, 'AUTH — LOGIN', '200 response', JSON.stringify({ status: r4.status, ...d4 }), 'Fail', d4.error);
        }
    } catch (e) { addRes(4, 'AUTH — LOGIN', '', 'Error', 'Fail', e.message); }

    // 5. Wrong Password
    try {
        const r5 = await fetch(`${API}/api/auth/login`, {
            method: 'POST', body: JSON.stringify({ email: 'test@reporttalk.com', password: 'wrongpassword' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const d5 = await r5.json();
        if (r5.status === 401 && (d5.error === 'Invalid email or password' || d5.error === 'Invalid credentials')) {
            addRes(5, 'AUTH — WRONG PASSWORD', '401 error', JSON.stringify({ status: r5.status, ...d5 }), 'Pass');
        } else {
            addRes(5, 'AUTH — WRONG PASSWORD', '401 error', JSON.stringify({ status: r5.status, ...d5 }), 'Fail', d5.error);
        }
    } catch (e) { addRes(5, 'AUTH — WRONG PASSWORD', '', 'Error', 'Fail', e.message); }

    // 6. Get Me (protected)
    try {
        const r6 = await fetch(`${API}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const d6 = await r6.json();
        if (r6.status === 200 && d6.user) {
            addRes(6, 'AUTH — GET ME (protected route)', '200 with user object', JSON.stringify(d6), 'Pass');
        } else {
            addRes(6, 'AUTH — GET ME (protected route)', '200', JSON.stringify({ status: r6.status, ...d6 }), 'Fail', d6.error);
        }
    } catch (e) { addRes(6, 'AUTH — GET ME (protected route)', '', 'Error', 'Fail', e.message); }

    // 7. No Token (protected)
    try {
        const r7 = await fetch(`${API}/api/auth/me`);
        const d7 = await r7.json();
        if (r7.status === 401) {
            addRes(7, 'AUTH — NO TOKEN (protected route)', '401 error', JSON.stringify({ status: r7.status, ...d7 }), 'Pass');
        } else {
            addRes(7, 'AUTH — NO TOKEN (protected route)', '401 error', JSON.stringify({ status: r7.status, ...d7 }), 'Fail', d7.error);
        }
    } catch (e) { addRes(7, 'AUTH — NO TOKEN (protected route)', '', 'Error', 'Fail', e.message); }

    // 8. Empty History
    try {
        const r8 = await fetch(`${API}/api/reports`, { headers: { 'Authorization': `Bearer ${token}` } });
        const d8 = await r8.json();
        if (r8.status === 200 && d8.reports && d8.reports.length === 0) {
            addRes(8, 'REPORTS — EMPTY HISTORY', '{ reports: [], pagination: { page: 1, total: 0 } }', JSON.stringify(d8), 'Pass');
        } else {
            addRes(8, 'REPORTS — EMPTY HISTORY', '{ reports: [] }', JSON.stringify({ status: r8.status, ...d8 }), 'Fail', 'Not empty or invalid structure');
        }
    } catch (e) { addRes(8, 'REPORTS — EMPTY HISTORY', '', 'Error', 'Fail', e.message); }

    // 9. Rate Limiting Request
    try {
        let finalStatus = 0;
        let finalData = null;
        for (let i = 0; i < 11; i++) {
            const r9 = await fetch(`${API}/api/auth/login`, {
                method: 'POST', body: JSON.stringify({ email: 'test@reporttalk.com', password: 'wrongpassword' }),
                headers: { 'Content-Type': 'application/json' }
            });
            finalStatus = r9.status;
            finalData = await r9.json();
        }
        if (finalStatus === 429) {
            addRes(9, 'RATE LIMITING — AUTH ROUTE', '429 Too Many Requests error', JSON.stringify({ status: finalStatus, ...finalData }), 'Pass');
        } else {
            addRes(9, 'RATE LIMITING — AUTH ROUTE', '429 error on 11th request', JSON.stringify({ status: finalStatus, ...finalData }), 'Fail', `Received ${finalStatus} instead of 429`);
        }
    } catch (e) { addRes(9, 'RATE LIMITING — AUTH ROUTE', '', 'Error', 'Fail', e.message); }

    console.log("==== RESULT JSON ====");
    console.log(JSON.stringify(results, null, 2));
    process.exit();
}

runTests();
