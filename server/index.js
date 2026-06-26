const express = require('express');
const cors = require('cors');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://brandsparkx-dashboard.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    // Health check also verifies DB connectivity
    await db.query('SELECT 1');
    res.json({ success: true, message: 'Server and Supabase DB are running ✅' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB not reachable' });
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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
