const notifications = [];
const clients = new Map();

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function createNotification({ userId, title, message, type = 'Info' }) {
  const id = makeId();
  const item = {
    id,
    userId,
    title: title || 'Notification',
    message,
    type,
    read: false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notifications.unshift(item);
  notifyUser(userId, item);
  return item;
}

function getNotificationsForUser(userId) {
  return notifications.filter((notification) => notification.userId === userId);
}

function getUnreadCount(userId) {
  return notifications.filter((notification) => notification.userId === userId && !notification.read).length;
}

function markRead(notificationId) {
  const notification = notifications.find((item) => item.id === notificationId);
  if (!notification) return null;
  notification.read = true;
  notification.updatedAt = new Date().toISOString();
  notifyUser(notification.userId, notification, 'notification.update');
  return notification;
}

function addClient(userId, res) {
  const existing = clients.get(userId) || new Set();
  existing.add(res);
  clients.set(userId, existing);
}

function removeClient(userId, res) {
  const existing = clients.get(userId);
  if (!existing) return;
  existing.delete(res);
  if (existing.size === 0) {
    clients.delete(userId);
  }
}

function notifyUser(userId, payload, event = 'notification.created') {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const data = JSON.stringify(payload);
  for (const res of userClients) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${data}\n\n`);
  }
}

module.exports = {
  createNotification,
  getNotificationsForUser,
  getUnreadCount,
  markRead,
  addClient,
  removeClient,
};
