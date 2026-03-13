const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

async function register(req, res, body) {
    try {
        const { name, email, password } = body;
        if (!name || !email || !password) {
            return { status: 400, data: { error: 'Please provide all fields' } };
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return { status: 400, data: { error: 'Email already in use' } };
        }

        const user = await User.create({ name, email, password });

        // JWT expires in 7 days
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        return { status: 201, data: { token, user } };
    } catch (error) {
        return { status: 500, data: { error: error.message } };
    }
}

async function login(req, res, body) {
    try {
        const { email, password } = body;
        if (!email || !password) {
            return { status: 400, data: { error: 'Please provide email and password' } };
        }

        const user = await User.findOne({ email });
        if (!user) {
            return { status: 401, data: { error: 'Invalid credentials' } };
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return { status: 401, data: { error: 'Invalid credentials' } };
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        return { status: 200, data: { token, user } };
    } catch (error) {
        return { status: 500, data: { error: error.message } };
    }
}

async function me(req, res, user) {
    return { status: 200, data: { user } };
}

module.exports = { register, login, me };
