const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const InboxMessage = require('../models/InboxMessage');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

// Generate or get anonymous user ID
const getAnonymousUserId = (userId) => {
  // Generate consistent anonymous ID based on user ID
  // This ensures same user always gets same anonymous ID
  const userIdStr = userId.toString();
  // Use last 8 chars of ObjectId for consistency
  return `User_${userIdStr.substring(userIdStr.length - 8)}`;
};

// Admin: Get list of all users who sent messages (inbox list)
router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    // Get distinct users who have sent messages
    const usersWithMessages = await InboxMessage.distinct('userId');
    
    // Get latest message for each user
    const userList = await Promise.all(
      usersWithMessages.map(async (userId) => {
        const latestMessage = await InboxMessage.findOne({ userId })
          .sort({ createdAt: -1 })
          .limit(1);
        
        const user = await User.findById(userId).select('_id');
        const anonymousUserId = getAnonymousUserId(userId);
        
        // Count unread messages for admin
        const unreadCount = await InboxMessage.countDocuments({
          userId,
          senderType: 'user',
          isRead: false
        });
        
        return {
          userId: userId.toString(),
          anonymousUserId,
          latestMessage: latestMessage ? {
            messageText: latestMessage.messageText,
            content: latestMessage.messageText, // Keep for backward compatibility
            createdAt: latestMessage.createdAt,
            senderType: latestMessage.senderType
          } : null,
          unreadCount
        };
      })
    );
    
    // Sort by latest message time
    userList.sort((a, b) => {
      if (!a.latestMessage) return 1;
      if (!b.latestMessage) return -1;
      return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
    });
    
    res.json({ users: userList });
  } catch (error) {
    console.error('Error fetching inbox users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get chat history with specific user
router.get('/admin/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const messages = await InboxMessage.find({ userId })
      .sort({ createdAt: 1 })
      .limit(200);
    
    // Mark messages as read
    await InboxMessage.updateMany(
      { userId, senderType: 'user', isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    const anonymousUserId = getAnonymousUserId(userId);
    
    res.json({
      userId,
      anonymousUserId,
      messages: messages.map(msg => ({
        _id: msg._id,
        senderType: msg.senderType,
        anonymousUserId: msg.anonymousUserId,
        messageText: msg.messageText,
        isRead: msg.isRead,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching user chat:', error);
    res.status(500).json({ message: error.message });
  }
});

// User: Get their chat history with admin
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const anonymousUserId = getAnonymousUserId(userId);
    
    const messages = await InboxMessage.find({ userId })
      .sort({ createdAt: 1 })
      .limit(200);
    
    // Mark admin messages as read
    await InboxMessage.updateMany(
      { userId, senderType: 'admin', isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({
      anonymousUserId,
      messages: messages.map(msg => ({
        _id: msg._id,
        senderType: msg.senderType,
        anonymousUserId: msg.anonymousUserId,
        messageText: msg.messageText,
        isRead: msg.isRead,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching user inbox:', error);
    res.status(500).json({ message: error.message });
  }
});

// Send message (both admin and user)
router.post('/send', auth, async (req, res) => {
  try {
    const { userId, messageText } = req.body;
    
    // If admin is sending, userId is the target user
    // If user is sending, userId is their own ID
    const targetUserId = req.user.role === 'admin' ? userId : req.user._id;
    const senderUserId = req.user._id;
    
    if (!targetUserId || !messageText) {
      return res.status(400).json({ message: 'userId and messageText are required' });
    }
    
    // Check if blocked
    const isBlocked = await BlockedUser.findOne({
      $or: [
        { blockedBy: senderUserId, blockedUser: targetUserId },
        { blockedBy: targetUserId, blockedUser: senderUserId }
      ]
    });
    
    if (isBlocked) {
      return res.status(403).json({ message: 'Cannot send message. User is blocked.' });
    }
    
    const anonymousUserId = getAnonymousUserId(targetUserId);
    const senderType = req.user.role === 'admin' ? 'admin' : 'user';
    
    const message = new InboxMessage({
      userId: targetUserId,
      anonymousUserId,
      senderType,
      messageText: messageText.trim(),
      isRead: false
    });
    
    await message.save();
    
    res.json({
      message: {
        _id: message._id,
        userId: message.userId.toString(),
        anonymousUserId: message.anonymousUserId,
        senderType: message.senderType,
        messageText: message.messageText,
        isRead: message.isRead,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

