// =====================================================
// NexusStore - Node.js + Express + MongoDB Atlas
// =====================================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Serve frontend files
app.use(express.static(__dirname));


// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "nexusstore_secret_key_change_this";

const PORT = process.env.PORT || 5000;


// =====================================================
// CHECK MONGODB URI
// =====================================================

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not configured.");
    process.exit(1);
}


// =====================================================
// USER SCHEMA
// =====================================================

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);


// =====================================================
// CONTACT SCHEMA
// =====================================================

const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            trim: true
        },

        subject: {
            type: String,
            required: true,
            trim: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

const Contact = mongoose.model("Contact", contactSchema);


// =====================================================
// FEEDBACK SCHEMA
// =====================================================

const feedbackSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60
        },

        email: {
            type: String,
            trim: true,
            maxlength: 254
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);


// =====================================================
// HOME / HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "NexusStore backend is running!",
        database: mongoose.connection.readyState === 1
            ? "MongoDB connected"
            : "MongoDB not connected"
    });
});


// =====================================================
// REGISTER
// POST /api/auth/register
// =====================================================

app.post("/api/auth/register", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });
        }

        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters."
            });
        }

        // Convert email to lowercase
        const cleanEmail = email.trim().toLowerCase();

        // Check existing user
        const existingUser = await User.findOne({
            email: cleanEmail
        });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "Email already registered."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = new User({
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword
        });

        await newUser.save();

        console.log("✅ New user registered:", cleanEmail);

        return res.status(201).json({
            success: true,
            message: "User registered successfully!"
        });

    } catch (error) {

        console.error("❌ Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});


// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

app.post("/api/auth/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: cleanEmail
        });

        if (!user) {

            return res.status(400).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {

            return res.status(400).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.json({
            success: true,
            message: "Login successful!",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error("❌ Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});


// =====================================================
// CONTACT
// POST /api/contact
// =====================================================

app.post("/api/contact", async (req, res) => {

    try {

        const {
            name,
            email,
            subject,
            message
        } = req.body;

        if (!name || !email || !subject || !message) {

            return res.status(400).json({
                success: false,
                message: "Please fill in all contact form fields."
            });
        }

        const newContactMessage = new Contact({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim()
        });

        await newContactMessage.save();

        return res.status(201).json({
            success: true,
            message: "Message sent successfully and saved to MongoDB."
        });

    } catch (error) {

        console.error("❌ Contact error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save your message: " + error.message
        });
    }
});


// =====================================================
// CONTACT SUPPORT
// POST /api/contact-support
// =====================================================

app.post("/api/contact-support", async (req, res) => {

    try {

        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";

        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim()
                : "";

        const message =
            typeof req.body.message === "string"
                ? req.body.message.trim()
                : "";

        if (!name || !email || !message) {

            return res.status(400).json({
                success: false,
                message: "Please fill in your name, email, and message."
            });
        }

        await new Contact({
            name,
            email,
            subject: `NexusStore contact from ${name}`,
            message
        }).save();

        return res.status(201).json({
            success: true,
            message: "Your message was sent and saved to MongoDB."
        });

    } catch (error) {

        console.error("❌ Support error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save your message."
        });
    }
});


// =====================================================
// GET FEEDBACK
// GET /api/feedback
// =====================================================

app.get("/api/feedback", async (req, res) => {

    try {

        const feedback = await Feedback
            .find()
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,

            feedback: feedback.map(
                ({
                    _id,
                    name,
                    message,
                    createdAt
                }) => ({
                    id: _id.toString(),
                    name,
                    message,
                    createdAt
                })
            )
        });

    } catch (error) {

        console.error("❌ Get feedback error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load feedback."
        });
    }
});


// =====================================================
// POST FEEDBACK
// POST /api/feedback
// =====================================================

app.post("/api/feedback", async (req, res) => {

    try {

        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";

        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim()
                : "";

        const message =
            typeof req.body.message === "string"
                ? req.body.message.trim()
                : "";

        if (!name || !message) {

            return res.status(400).json({
                success: false,
                message: "Please provide your name and comment."
            });
        }

        if (
            name.length > 60 ||
            email.length > 254 ||
            message.length > 1000
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Name must be 60 characters or fewer, email 254 characters or fewer, and comment 1000 characters or fewer."
            });
        }

        const entry = await new Feedback({
            name,
            email,
            message
        }).save();

        return res.status(201).json({
            success: true,
            message: "Your feedback has been saved.",

            feedback: {
                id: entry._id.toString(),
                name: entry.name,
                message: entry.message,
                createdAt: entry.createdAt
            }
        });

    } catch (error) {

        console.error("❌ Feedback error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to save feedback."
        });
    }
});


// =====================================================
// 404 API HANDLER
// =====================================================

app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });

});


// =====================================================
// START SERVER
// =====================================================

async function startServer() {

    try {

        console.log("Connecting to MongoDB Atlas...");

        await mongoose.connect(MONGODB_URI);

        console.log("✅ Connected to MongoDB Atlas");

        app.listen(PORT, () => {

            console.log(
                `🚀 NexusStore server running on port ${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "❌ MongoDB connection error:",
            error.message
        );

        process.exit(1);
    }
}

startServer();
