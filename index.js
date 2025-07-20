const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
// const Dairy = require('./models/DairyModel');
// const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const connectWithRetry = () => {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      console.log('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Add MongoDB connection event listeners
mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected! Attempting to reconnect...');
  connectWithRetry();
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error event:', err);
});

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally, shut down gracefully or alert
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  // Optionally, shut down gracefully or alert
});

// Import routes
const authRoutes = require('./routes/auth');

const dairyRoutes = require('./routes/dairy');
const deviceRoutes = require('./routes/device');
const reportRoutes = require('./routes/Reports');
const uploadRoutes = require('./routes/upload');
// async function createAdmin() {
//   const existingAdmin = await Dairy.findOne({ email: 'admin@example.com' });
//   if (!existingAdmin) {
//     const hashed = await bcrypt.hash('admin123', 10);
//     await Dairy.create({
//       dairyCode: 'ADM',
//       dairyName: 'Admin',
//       email: 'admin@example.com',
//       password: hashed,
//       role: 'admin'
//     });
//     console.log('✅ Admin user created');
//   } else {
//     console.log('Admin already exists');
//   }
// }

// createAdmin();
// Mount routes
app.use('/api/auth', authRoutes);

// Dairy routes
app.use('/api/dairy', dairyRoutes);  // handles all dairy-related routes (add, edit, delete)

// Device routes
app.use('/api/device', deviceRoutes);  // handles all device-related routes (add, edit, delete)

app.use('/api/reports', reportRoutes);

app.use('/api/upload', uploadRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || 3701;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
