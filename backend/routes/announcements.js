const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const Group = require('../models/Group');

// Create announcement (Admin only)
router.post('/create', adminAuth, async (req, res) => {
  try {
    const { groupId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if announcement already exists for this group
    const existingAnnouncement = await Announcement.findOne({ groupId });
    if (existingAnnouncement) {
      return res.status(400).json({ message: 'Announcement already exists for this group' });
    }

    const announcement = new Announcement({
      groupId: group._id,
      groupName: group.name,
      groupCode: group.code,
      createdBy: req.user._id
    });

    await announcement.save();

    res.status(201).json({
      announcement: {
        id: announcement._id,
        groupId: announcement.groupId,
        groupName: announcement.groupName,
        groupCode: announcement.groupCode,
        createdAt: announcement.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all announcements
router.get('/all', auth, async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete announcement (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

