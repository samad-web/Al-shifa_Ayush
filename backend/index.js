import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from './routes/auth.js';
// ... other imports
import userRoutes from './routes/user.js';
import appointmentsRoutes from './routes/appointments.js';
import prescriptionRoutes from './routes/prescription.js';
import consultationRoutes from './routes/consultation.js';
import notificationRoutes from './routes/notifications.js';
import reportsRoutes from './routes/reports.js';
import bulkRoutes from './routes/bulk.js';
import pharmacyRoutes from './routes/pharmacy.js';
import triageRoutes from './routes/triage.js';
import wellnessRoutes from './routes/wellness.js';
import chatRoutes from './routes/chat.js';
import { initializeWebSocket } from './websocket/index.js';
import { schedulerService } from './services/scheduler.service.js';

const app = express();
const httpServer = createServer(app);

// Request Logger for Debugging CORS/Requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    process.env.FRONTEND_URL,
    // Support Render internal networking or same-origin requests
    '*.onrender.com'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// User profile routes
app.use('/api/user', userRoutes);

// Appointments routes
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/chat', chatRoutes);

// Serve static files from the React app
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 4000;

// Initialize WebSocket server
initializeWebSocket(httpServer);

// Initialize scheduler for automated tasks
schedulerService.init();

httpServer.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('WebSocket server initialized');
  console.log('Scheduler service running');
});
