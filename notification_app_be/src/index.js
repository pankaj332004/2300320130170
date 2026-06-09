const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require(path.join(__dirname, '..', '..', 'logging_middleware', 'index.js'));
const {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markRead,
  addClient,
  removeClient,
} = require('./notifications');

const app = express();
app.use(cors());
app.use(express.json());
app.use(logger);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/notifications', (req, res) => {
  const { userId, title, message, type } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ error: 'Missing userId or message' });
  }
  const notification = createNotification({ userId, title, message, type });
  res.status(201).json(notification);
});

app.get('/api/users/:userId/notifications', (req, res) => {
  const { userId } = req.params;
  res.json(getNotificationsForUser(userId));
});

app.get('/api/users/:userId/notifications/unread-count', (req, res) => {
  const { userId } = req.params;
  res.json({ userId, unreadCount: getUnreadCount(userId) });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const notification = markRead(id);
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  res.json(notification);
});

app.get('/api/notifications/stream', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write('retry: 10000\n\n');

  addClient(userId, res);
  req.on('close', () => removeClient(userId, res));
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Notification BE running on ${port}`));
