require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoice');
const templateRoutes = require('./routes/template');
const receiptRoutes = require('./routes/receipt');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081', 'exp://*'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure pdf output dir
const pdfOutputDir = process.env.PDF_OUTPUT_DIR || './generated_pdfs';
if (!fs.existsSync(pdfOutputDir)) {
  fs.mkdirSync(pdfOutputDir, { recursive: true });
}

// Ensure other directories exist
const directories = [
  path.join(__dirname, 'public', 'uploads'),
  path.join(__dirname, 'public', 'previews')
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/receipts', receiptRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/previews', express.static(path.join(__dirname, 'public', 'previews')));
app.use('/pdfs', express.static(path.join(__dirname, pdfOutputDir)));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Invoice App Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      invoices: '/api/invoices',
      templates: '/api/templates',
      receipts: '/api/receipts'
    }
  });
});

// 404 handler - FIXED
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : error.message 
  });
});

const PORT = process.env.PORT || 4000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await mongoose.connection.close();
  process.exit(0);
});