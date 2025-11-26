const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');
const ThemeHistory = require('../models/ThemeHistory');

// Get socket.io instance (will be set by server.js)
let io = null;
const setIO = (socketIO) => {
  io = socketIO;
};

// Generate random group code
const generateGroupCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate anonymous name
const generateAnonymousName = () => {
  const adjectives = [
    "Happy", "Cheerful", "Bright", "Swift", "Gentle", "Brave", "Cool", "Wise",
    "Lucky", "Noble", "Bold", "Calm", "Kind", "Sunny", "Clever", "Witty",
    "Mighty", "Serene", "Jolly", "Proud", "Fierce", "Silent", "Golden", "Silver"
  ];
  
  const nouns = [
    "Panda", "Dragon", "Phoenix", "Tiger", "Eagle", "Wolf", "Fox", "Bear",
    "Lion", "Hawk", "Owl", "Dolphin", "Whale", "Butterfly", "Falcon", "Leopard",
    "Shark", "Raven", "Swan", "Deer", "Otter", "Lynx", "Koala", "Penguin"
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);
  
  return `${adjective} ${noun} ${number}`;
};

// Create group (Admin only)
router.post('/create', adminAuth, async (req, res) => {
  try {
    const { name, description } = req.body;

    let code = generateGroupCode();
    // Ensure unique code
    while (await Group.findOne({ code })) {
      code = generateGroupCode();
    }

    const group = new Group({
      name,
      code,
      description: description || '',
      createdBy: req.user._id,
      members: [],
      theme: 'default'
    });

    await group.save();

    res.status(201).json({
      group: {
        id: group._id,
        name: group.name,
        code: group.code,
        description: group.description,
        createdAt: group.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join group with code
router.post('/join', auth, async (req, res) => {
  try {
    const { code } = req.body;

    const group = await Group.findOne({ code: code.toUpperCase() });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user was removed from this group
    const wasRemoved = group.removedUsers && group.removedUsers.some(
      r => r.userId.toString() === req.user._id.toString()
    );

    if (wasRemoved && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You have been removed from this group. Please contact admin to rejoin.' });
    }

    // Check if user is already a member
    const existingMember = group.members.find(
      m => m.userId.toString() === req.user._id.toString()
    );

    if (existingMember) {
      // Reload group to get latest member count
      const updatedGroup = await Group.findById(group._id);
      return res.json({
        group: {
          id: updatedGroup._id,
          name: updatedGroup.name,
          code: updatedGroup.code,
          description: updatedGroup.description,
          anonymousName: existingMember.anonymousName,
          membersCount: updatedGroup.members.length
        }
      });
    }

    // Add user as member with anonymous name
    const anonymousName = generateAnonymousName();
    // Ensure unique anonymous name in group
    let finalAnonymousName = anonymousName;
    let attempts = 0;
    while (group.members.some(m => m.anonymousName === finalAnonymousName) && attempts < 10) {
      finalAnonymousName = generateAnonymousName();
      attempts++;
    }
    
    group.members.push({
      userId: req.user._id,
      anonymousName: finalAnonymousName,
      joinedAt: new Date()
    });

    await group.save();
    console.log(`✅ User ${req.user._id} joined group ${group._id} with anonymous name: ${finalAnonymousName}`);
    
    // Reload group to ensure we have the latest data
    const updatedGroup = await Group.findById(group._id);

    // Emit real-time member count update to all users in the group
    if (io) {
      io.to(group._id.toString()).emit('member-count-updated', {
        memberCount: updatedGroup.members.length,
        members: updatedGroup.members.map(m => ({
          anonymousName: m.anonymousName
        }))
      });
    }

    res.json({
      group: {
        id: updatedGroup._id,
        name: updatedGroup.name,
        code: updatedGroup.code,
        description: updatedGroup.description,
        anonymousName,
        membersCount: updatedGroup.members.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all groups (Admin sees all, users see only their groups)
router.get('/all', auth, async (req, res) => {
  try {
    let groups;
    
    if (req.user.role === 'admin') {
      // Admin sees all groups
      groups = await Group.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    } else {
      // Users see only groups they're members of
      groups = await Group.find({
        'members.userId': req.user._id
      }).populate('createdBy', 'name email').sort({ createdAt: -1 });
    }

    // For admin, hide user real names/emails in members
    const formattedGroups = groups.map(group => {
      const groupObj = group.toObject();
      
      // Only include actual members who joined (not creator unless they joined)
      const actualMembers = (groupObj.members || []).filter(member => {
        // Only show members who explicitly joined (not the creator unless they joined as a member)
        return member && member.userId && member.anonymousName;
      });
      
      if (req.user.role === 'admin') {
        // Admin only sees anonymous names of actual members
        groupObj.members = actualMembers.map(member => ({
          anonymousName: member.anonymousName,
          joinedAt: member.joinedAt
        }));
      } else {
        // Users see their own anonymous name and others' anonymous names
        const userMember = actualMembers.find(
          m => m.userId.toString() === req.user._id.toString()
        );
        groupObj.members = actualMembers.map(member => ({
          anonymousName: member.anonymousName,
          joinedAt: member.joinedAt
        }));
        groupObj.userAnonymousName = userMember ? userMember.anonymousName : null;
      }

      // Hide createdBy email for non-admin users
      if (req.user.role !== 'admin' && groupObj.createdBy) {
        groupObj.createdBy = { name: 'Admin' };
      }

      return groupObj;
    });

    res.json({ groups: formattedGroups || [] });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch groups' });
  }
});

// Get single group
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is member or admin
    const isMember = group.members.some(
      m => m.userId.toString() === req.user._id.toString()
    );

    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const groupObj = group.toObject();

    // Only include actual members who joined (not creator unless they joined)
    const actualMembers = groupObj.members.filter(member => {
      return member.userId && member.anonymousName;
    });

    // For admin, hide user real names/emails but include userId for blocking/reporting
    if (req.user.role === 'admin') {
      groupObj.members = actualMembers.map(member => ({
        userId: member.userId.toString(),
        anonymousName: member.anonymousName,
        joinedAt: member.joinedAt
      }));
    } else {
      const userMember = actualMembers.find(
        m => m.userId.toString() === req.user._id.toString()
      );
      groupObj.userAnonymousName = userMember ? userMember.anonymousName : null;
      groupObj.members = actualMembers.map(member => ({
        userId: member.userId.toString(),
        anonymousName: member.anonymousName,
        joinedAt: member.joinedAt
      }));
    }

    res.json({ group: groupObj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove user from group (Admin only)
router.post('/:groupId/remove-user', adminAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.groupId;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Find the member to remove
    const memberIndex = group.members.findIndex(
      m => m.userId.toString() === userId.toString()
    );

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'User is not a member of this group' });
    }

    // Check if already removed
    const alreadyRemoved = group.removedUsers && group.removedUsers.some(
      r => r.userId.toString() === userId.toString()
    );

    if (alreadyRemoved) {
      return res.status(400).json({ message: 'User is already removed from this group' });
    }

    // Remove from members
    const removedMember = group.members[memberIndex];
    group.members.splice(memberIndex, 1);

    // Add to removedUsers
    if (!group.removedUsers) {
      group.removedUsers = [];
    }
    group.removedUsers.push({
      userId: userId,
      removedAt: new Date(),
      removedBy: req.user._id
    });

    await group.save();

    // Emit real-time update to notify group members
    if (io) {
      io.to(groupId).emit('user-removed-from-group', {
        userId: userId.toString(),
        groupId: groupId,
        memberCount: group.members.length
      });

      // Notify the removed user
      io.to(userId.toString()).emit('removed-from-group', {
        groupId: groupId,
        groupName: group.name
      });

      // Update member count for all in group
      io.to(groupId).emit('member-count-updated', {
        memberCount: group.members.length,
        members: group.members.map(m => ({
          anonymousName: m.anonymousName,
          userId: m.userId.toString()
        }))
      });
    }

    res.json({ 
      message: 'User removed from group successfully',
      memberCount: group.members.length
    });
  } catch (error) {
    console.error('Error removing user from group:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update group theme (All users can change)
router.put('/:groupId/theme', auth, async (req, res) => {
  try {
    const { theme } = req.body;
    const groupId = req.params.groupId;

    if (!theme) {
      return res.status(400).json({ message: 'Theme is required' });
    }

    const validThemes = ['default', 'blue', 'green', 'purple', 'orange', 'red', 'pink', 'grey'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ message: 'Invalid theme' });
    }

        const group = await Group.findById(groupId);
        if (!group) {
          return res.status(404).json({ message: 'Group not found' });
        }

        const oldTheme = group.theme;
        group.theme = theme;
        await group.save();

        // Get anonymous ID for history
        const getAnonymousUserId = (userId) => {
          const userIdStr = userId.toString();
          return `User_${userIdStr.substring(userIdStr.length - 8)}`;
        };

        const changedByAnonymous = req.user.role === 'admin' 
          ? 'Admin' 
          : getAnonymousUserId(req.user._id);

        // Save theme change to history (permanent record)
        const themeHistory = new ThemeHistory({
          groupId: group._id,
          groupName: group.name,
          groupCode: group.code,
          changedBy: req.user._id,
          changedByAnonymous: changedByAnonymous,
          oldTheme: oldTheme,
          newTheme: theme
        });
        await themeHistory.save();
        console.log(`🎨 Theme history saved: ${changedByAnonymous} changed theme from "${oldTheme}" to "${theme}" in group "${group.name}" at ${new Date().toISOString()}`);

        // Emit theme update to all users in the group
        if (io) {
          io.to(groupId).emit('theme-updated', {
            groupId: groupId,
            theme: theme
          });
        }

        res.json({ 
          message: 'Theme updated successfully',
          theme: group.theme
        });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
module.exports.setIO = setIO;

