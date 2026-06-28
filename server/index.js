const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Production-ready CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://brandsparkx-dashboard.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true, message: 'Server and Supabase DB are running ✅' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB not reachable', error: err.message });
  }
});

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/teams',       require('./routes/teams'));
app.use('/api/members',     require('./routes/members'));
app.use('/api/projects',    require('./routes/projects'));
app.use('/api/allocations', require('./routes/allocations'));
app.use('/api/requests',    require('./routes/requests'));
app.use('/api/tasks',       require('./routes/tasks'));
app.use('/api/ai',          require('./routes/ai'));
app.use('/api/comments',      require('./routes/comments'));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
