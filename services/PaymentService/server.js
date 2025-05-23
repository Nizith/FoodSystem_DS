require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Import routes
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize express app
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors());

// Routes
// Add payment routes
app.use('/api/payment', require('./routes/paymentRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = 5100;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});