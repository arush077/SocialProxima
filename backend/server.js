require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const connectDB = require('./db');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const discoveryRoutes = require('./routes/discovery');
const connectionRoutes = require('./routes/connections');
const chatRoutes = require('./routes/chats');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsOrigin(origin, callback) {
  // Allow non-browser clients (no Origin header) and anything in the allow-list.
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`Origin ${origin} is not allowed by CORS`));
}

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'SocialProxima API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/chats', chatRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('unauthorized'));
    }
    const payload = jwt.verify(token, JWT_SECRET);
    socket.userId = payload.sub;
    return next();
  } catch {
    return next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  socket.emit('ready', { userId: socket.userId });
});

app.set('io', io);

connectDB().then(async () => {
  await User.syncIndexes();

  server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
