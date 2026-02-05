import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import appointmentsRoutes from './routes/appointments.js';
import prescriptionRoutes from './routes/prescription.js';
import consultationRoutes from './routes/consultation.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
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

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
