const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { computeModuleCountsForUser } = require('./moduleCounts');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Invalid token'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`Socket connected: ${user.email} (${user.role})`);

    socket.join(`user_${user.userId}`);
    socket.join(`role_${user.role}`);

    // Send initial module counts
    try {
      const counts = await computeModuleCountsForUser(user.userId);
      socket.emit('module_update', counts);
    } catch (err) {
      console.error('Initial module counts error:', err);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.email}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitToUser(userId, event, data) {
  io.to(`user_${userId}`).emit(event, data);
}

function emitToRole(role, event, data) {
  io.to(`role_${role}`).emit(event, data);
}

async function sendModuleUpdateToUser(userId) {
  const counts = await computeModuleCountsForUser(userId);
  io.to(`user_${userId}`).emit('module_update', counts);
}

async function sendModuleUpdateToRole(role) {
  // For role-based counts, we'll emit to each user in that role individually.
  // Simpler: emit to all sockets in that role room with counts computed per role? 
  // But computeModuleCountsForUser is per user. We'll use getUserIdsByRole and loop.
  const User = require('./models/User');
  const users = await User.findAll({ where: { role }, attributes: ['id'] });
  for (const user of users) {
    const counts = await computeModuleCountsForUser(user.id);
    io.to(`user_${user.id}`).emit('module_update', counts);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRole,
  sendModuleUpdateToUser,
  sendModuleUpdateToRole,
};