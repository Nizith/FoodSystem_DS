const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { JWT_SECRET, JWT_EXPIRE, ADMIN_REGISTRATION_KEY } = require('../config/config');

// Generate JWT Token
const generateToken = (tokenPayload) => {
    return jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRE
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, adminKey } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }

        // Check for admin registration
        let role = 'customer';
        if (adminKey && adminKey === ADMIN_REGISTRATION_KEY) {
            role = 'admin';
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role
        });

        // Generate token
        const tokenPayload = { id: user._id, name, email, role };
        const token = generateToken(tokenPayload);

        // Decode the token (optional, without verifying)
        const decoded = jwt.decode(token);

        res.status(201).json({
            success: true,
            token,
            decoded,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error in register:', error); // Log the full error
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate token
        const tokenPayload = { id: user._id, name: user.name, email: user.email, role: user.role };
        const token = generateToken(tokenPayload);

        const decoded = jwt.decode(token);

        res.status(200).json({
            success: true,
            token,            
            expiresAt: new Date(decoded.exp * 1000).toLocaleString(),
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error in login:', error); 
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// @desc    Verify token
// @route   POST /api/auth/verify-token
// @access  Public
exports.verifyToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token is required' });
        }

        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);

        res.status(200).json({
            success: true,
            valid: true,
            user: decoded, // Return the decoded token payload
        });
    } catch (error) {
        console.error('Error in verifying token:', error.message);
        res.status(401).json({
            success: false,
            valid: false,
            message: 'Invalid or expired token',
        });
    }
};
