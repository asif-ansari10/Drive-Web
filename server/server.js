require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const folderRoutes = require('./routes/folders');
const fileRoutes = require('./routes/files');
const { requireAuth } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// DEV-only: CSP (adjust or remove for production)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' 'unsafe-inline' data: https:; " +
    "font-src 'self' https: data:; " +
    "connect-src 'self' http://localhost:4000 ws://localhost:5173 http://localhost:5173; " +
    "img-src 'self' data: https:;"
  );
  next();
});

// health + root
app.get('/_health', (req, res) => res.json({ ok: true, time: Date.now() }));
app.get('/', (req, res) => res.json({ ok: true, message: 'API running' }));
// avoid favicon 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', requireAuth, folderRoutes);
app.use('/api/files', requireAuth, fileRoutes);

// error handler - LAST
app.use((err, req, res, next) => {
  console.error('ERROR HANDLER:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const MONGO = process.env.MONGO_URI;
const PORT = process.env.PORT || 4000;
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Mongo connected');
    app.listen(PORT, () => console.log(`Server listening ${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connection error', err);
  });
