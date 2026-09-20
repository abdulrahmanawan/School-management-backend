const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

// ── Security & Middleware ──
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// ── Health Check Route ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Route Registrations ──
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/admissions', require('./routes/admissionRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/online-classes', require('./routes/onlineClassRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/library', require('./routes/libraryRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/subject-results', require('./routes/subjectResultRoutes'));
app.use('/api/parent', require('./routes/parentRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

// ── Error Handler ──
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;