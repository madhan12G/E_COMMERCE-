// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_db';

// User Schema & Model
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

const feedbackSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, trim: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
const JWT_SECRET = 'your_super_secret_jwt_key_here';

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ success: true, message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Contact Message Endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all contact form fields.'
            });
        }

        const newContactMessage = new Contact({
            name,
            email,
            subject,
            message
        });

        await newContactMessage.save();

        res.status(201).json({
            success: true,
            message: 'Message sent successfully and saved to MongoDB.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Unable to save your message: ' + error.message
        });
    }
});

// Contact & Feedback page support form
app.post('/api/contact-support', async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in your name, email, and message.'
            });
        }

        await new Contact({
            name,
            email,
            subject: `NexusStore contact from ${name}`,
            message
        }).save();

        res.status(201).json({
            success: true,
            message: 'Your message was sent and saved to MongoDB.'
        });
    } catch (error) {
        console.error('Unable to save support message:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to save your message. Please try again.'
        });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 }).lean();
        res.json({
            success: true,
            feedback: feedback.map(({ _id, name, message, createdAt }) => ({
                id: _id.toString(),
                name,
                message,
                createdAt
            }))
        });
    } catch (error) {
        console.error('Unable to load feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to load feedback. Please try again.'
        });
    }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

        if (!name || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your name and comment.'
            });
        }
        if (name.length > 60 || email.length > 254 || message.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Name must be 60 characters or fewer, email 254 characters or fewer, and comment 1000 characters or fewer.'
            });
        }

        const entry = await new Feedback({ name, email, message }).save();
        res.status(201).json({
            success: true,
            message: 'Your feedback has been saved.',
            feedback: {
                id: entry._id.toString(),
                name: entry.name,
                message: entry.message,
                createdAt: entry.createdAt
            }
        });
    } catch (error) {
        console.error('Unable to save feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to save feedback. Please try again.'
        });
    }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB.');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exitCode = 1;
    }
}

startServer();