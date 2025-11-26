const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Message = require('../models/Message');
const Group = require('../models/Group');
const BlockedUser = require('../models/BlockedUser');

// Get messages for a group
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user was removed from group
    const wasRemoved = group.removedUsers && group.removedUsers.some(
      r => r.userId.toString() === req.user._id.toString()
    );

    if (wasRemoved && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You have been removed from this group' });
    }

    // Check if user is member or admin
    const isMember = group.members.some(
      m => m.userId.toString() === req.user._id.toString()
    );

    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

        const messages = await Message.find({ 
          groupId: req.params.groupId,
          messageType: 'group',
          // Only show messages that are not marked as deleted
          $or: [
            { 'autoDelete.isDeleted': { $ne: true } },
            { 'autoDelete.isDeleted': { $exists: false } }
          ]
        })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

    // Get all blocked relationships for current user
    const blockedByMe = await BlockedUser.find({ blockedBy: req.user._id }).lean();
    const blockedByMeSet = new Set(blockedByMe.map(b => b.blockedUser.toString()));
    
    const blockedMe = await BlockedUser.find({ blockedUser: req.user._id }).lean();
    const blockedMeSet = new Set(blockedMe.map(b => b.blockedBy.toString()));

    // Filter messages based on mutual blocking
    const filteredMessages = messages.filter(msg => {
      if (!msg.userId) return true; // Include messages without userId
      
      const messageUserId = msg.userId.toString();
      
      // Exclude if current user blocked the sender
      if (blockedByMeSet.has(messageUserId)) {
        return false;
      }
      
      // Exclude if sender blocked the current user
      if (blockedMeSet.has(messageUserId)) {
        return false;
      }
      
      return true;
    });

    // Include userId in response for frontend filtering
    const messagesWithUserId = filteredMessages.map(msg => ({
      ...msg,
      userId: msg.userId ? msg.userId.toString() : undefined
    }));

    res.json({ messages: messagesWithUserId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

