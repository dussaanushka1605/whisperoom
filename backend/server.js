const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('your_mongodb_atlas')) {
  console.error('❌ ERROR: MONGO_URI not set in .env file!');
  console.error('Please set MONGO_URI in backend/.env file');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('Please check your MONGO_URI in backend/.env file');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
const groupsRouter = require('./routes/groups');
groupsRouter.setIO(io); // Pass socket.io instance to groups router for real-time updates
app.use('/api/groups', groupsRouter);
app.use('/api/messages', require('./routes/messages'));
app.use('/api/inbox', require('./routes/inbox'));
const blockRouter = require('./routes/block');
app.use('/api/block', blockRouter);
// Make io available to block router
app.set('io', io);
app.use('/api/announcements', require('./routes/announcements'));

// Socket.io connection handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // Join user's own room for targeted events
  if (socket.userId) {
    socket.join(socket.userId.toString());
  }

  // Join group room
  socket.on('join-group', async (groupId) => {
    try {
      const Group = require('./models/Group');
      const group = await Group.findById(groupId);
      
      if (!group) {
        socket.emit('error', { message: 'Group not found' });
        return;
      }

      // Check if user was removed from group
      const wasRemoved = group.removedUsers && group.removedUsers.some(
        r => r.userId.toString() === socket.userId.toString()
      );

      if (wasRemoved && socket.userRole !== 'admin') {
        socket.emit('error', { message: 'You have been removed from this group' });
        return;
      }

      // Check if user is member of group
      const member = group.members.find(m => m.userId.toString() === socket.userId);
      if (!member && socket.userRole !== 'admin') {
        socket.emit('error', { message: 'Not a member of this group' });
        return;
      }

      socket.join(groupId);
      socket.currentGroupId = groupId;
      
      // Get anonymous identity for this group
      const anonymousName = member ? member.anonymousName : 'Admin';
      socket.emit('joined-group', { groupId, anonymousName });
      
      // Notify others and send updated member count
      const updatedGroup = await Group.findById(groupId);
      socket.to(groupId).emit('user-joined', { 
        anonymousName,
        memberCount: updatedGroup.members.length 
      });
      
      // Send updated member count to all in room
      io.to(groupId).emit('member-count-updated', {
        memberCount: updatedGroup.members.length,
        members: updatedGroup.members.map(m => ({
          anonymousName: m.anonymousName
        }))
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Handle chat messages
  socket.on('send-message', async (data) => {
    try {
      const Message = require('./models/Message');
      const Group = require('./models/Group');
      
      const group = await Group.findById(data.groupId);
      if (!group) {
        socket.emit('error', { message: 'Group not found' });
        return;
      }

      const member = group.members.find(m => m.userId.toString() === socket.userId);
      if (!member && socket.userRole !== 'admin') {
        socket.emit('error', { message: 'Not a member of this group' });
        return;
      }

      const anonymousName = socket.userRole === 'admin' ? 'Admin' : member.anonymousName;

      // Calculate expiration time if auto-delete is enabled
      let expiresAt = null;
      if (data.autoDelete && data.autoDelete.enabled && data.autoDelete.deleteAfter) {
        expiresAt = new Date(Date.now() + (data.autoDelete.deleteAfter * 1000));
      }

      const message = new Message({
        groupId: data.groupId,
        userId: socket.userId,
        anonymousName: anonymousName,
        content: data.content,
        messageType: 'group',
        isFile: data.isFile || false,
        fileName: data.fileName || null,
        fileContent: data.fileContent || null,
        fileSize: data.fileSize || null,
        autoDelete: {
          enabled: data.autoDelete?.enabled || false,
          deleteAfter: data.autoDelete?.deleteAfter || null,
          expiresAt: expiresAt
        }
      });

      await message.save();
      console.log(`✅ Message saved: ${message._id} in group ${data.groupId} by user ${socket.userId}`);

      const messageData = {
        _id: message._id,
        groupId: message.groupId.toString(),
        userId: message.userId.toString(),
        anonymousName: message.anonymousName,
        content: message.content,
        messageType: message.messageType,
        isFile: message.isFile,
        fileName: message.fileName,
        fileContent: message.fileContent,
        fileSize: message.fileSize,
        autoDelete: message.autoDelete,
        createdAt: message.createdAt
      };

      // Get all sockets in the group room
      const BlockedUser = require('./models/BlockedUser');
      const socketsInRoom = await io.in(data.groupId).fetchSockets();
      
      // Emit to each recipient individually, checking for mutual blocking
      for (const s of socketsInRoom) {
        if (s.id === socket.id || !s.userId) continue; // Skip sender and sockets without userId
        
        const recipientUserId = s.userId.toString();
        
        // Check mutual blocking: if sender blocked recipient OR recipient blocked sender
        const senderBlockedRecipient = await BlockedUser.findOne({
          blockedBy: socket.userId,
          blockedUser: recipientUserId
        });
        
        const recipientBlockedSender = await BlockedUser.findOne({
          blockedBy: recipientUserId,
          blockedUser: socket.userId
        });
        
        // Only send message if neither has blocked the other (mutual blocking check)
        if (!senderBlockedRecipient && !recipientBlockedSender) {
          s.emit('new-message', messageData);
        }
      }
      
      // Send confirmation to sender only (so they see their own message)
      socket.emit('message-sent', messageData);
      
      // Log message save for permanent tracking
      const fileInfo = data.isFile ? ` [FILE: ${data.fileName}, ${data.fileSize} bytes]` : '';
      const autoDeleteInfo = data.autoDelete?.enabled ? ` [AUTO-DELETE: ${data.autoDelete.deleteAfter}s]` : '';
      console.log(`💬 Message saved PERMANENTLY: ID=${message._id}, From=${anonymousName}, Group=${data.groupId}, Content="${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}"${fileInfo}${autoDeleteInfo}`);
    } catch (error) {
      console.error('❌ Error saving message:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle inbox messages (Admin-User direct communication)
  socket.on('send-inbox-message', async (data) => {
    try {
      const InboxMessage = require('./models/InboxMessage');
      const BlockedUser = require('./models/BlockedUser');
      
      const { userId, messageText } = data;
      
      // If admin is sending, userId is the target user
      // If user is sending, userId is their own ID
      const targetUserId = socket.userRole === 'admin' ? userId : socket.userId;
      const senderUserId = socket.userId;
      
      if (!targetUserId || !messageText) {
        socket.emit('error', { message: 'userId and messageText are required' });
        return;
      }
      
      // Check if blocked
      const isBlocked = await BlockedUser.findOne({
        $or: [
          { blockedBy: senderUserId, blockedUser: targetUserId },
          { blockedBy: targetUserId, blockedUser: senderUserId }
        ]
      });
      
      if (isBlocked) {
        socket.emit('error', { message: 'Cannot send message. User is blocked.' });
        return;
      }
      
      // Generate consistent anonymous ID (must match route logic)
      const userIdStr = targetUserId.toString();
      const anonymousUserId = `User_${userIdStr.substring(userIdStr.length - 8)}`;
      const senderType = socket.userRole === 'admin' ? 'admin' : 'user';
      
      const message = new InboxMessage({
        userId: targetUserId,
        anonymousUserId,
        senderType,
        messageText: messageText.trim(),
        isRead: false
      });
      
      await message.save();
      
      const messageData = {
        _id: message._id,
        userId: message.userId.toString(),
        anonymousUserId: message.anonymousUserId,
        senderType: message.senderType,
        messageText: message.messageText,
        isRead: message.isRead,
        createdAt: message.createdAt
      };
      
      // Emit to both admin and the specific user
      if (socket.userRole === 'admin') {
        // Admin sending to user - notify the user
        io.emit('new-inbox-message', messageData);
        // Also notify admin's own socket
        socket.emit('inbox-message-sent', messageData);
      } else {
        // User sending to admin - notify admin
        io.emit('new-inbox-message', messageData);
        // Also notify user's own socket
        socket.emit('inbox-message-sent', messageData);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Auto-delete expired messages job (runs every minute)
// IMPORTANT: Messages are NOT deleted from database, only marked as deleted
setInterval(async () => {
  try {
    const Message = require('./models/Message');
    const now = new Date();
    
    // Find messages that have expired but not yet marked as deleted
    const expiredMessages = await Message.find({
      'autoDelete.enabled': true,
      'autoDelete.expiresAt': { $lte: now },
      'autoDelete.isDeleted': false
    });

    if (expiredMessages.length > 0) {
      const messageIds = expiredMessages.map(m => m._id.toString());
      const groupIds = [...new Set(expiredMessages.map(m => m.groupId.toString()))];

      // Mark messages as deleted (DO NOT DELETE FROM DATABASE - keep permanently)
      await Message.updateMany(
        {
          _id: { $in: expiredMessages.map(m => m._id) }
        },
        {
          $set: {
            'autoDelete.isDeleted': true,
            'autoDelete.deletedAt': now
          }
        }
      );

      // Notify all clients in affected groups
      groupIds.forEach(groupId => {
        const groupMessageIds = expiredMessages
          .filter(m => m.groupId.toString() === groupId)
          .map(m => m._id.toString());
        
        io.to(groupId).emit('messages-deleted', {
          messageIds: groupMessageIds,
          groupId: groupId
        });
      });

      console.log(`🗑️ Marked ${expiredMessages.length} expired message(s) as deleted (kept in database permanently)`);
    }
  } catch (error) {
    console.error('Error in auto-delete job:', error);
  }
}, 60000); // Run every minute

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 API available at /api`);
    console.log(`💓 Health check at /health`);
});


