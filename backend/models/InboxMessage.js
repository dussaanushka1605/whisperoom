const mongoose = require('mongoose');

const inboxMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  anonymousUserId: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    enum: ['admin', 'user'],
    required: true
  },
  messageText: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
inboxMessageSchema.index({ userId: 1, createdAt: -1 });
inboxMessageSchema.index({ anonymousUserId: 1, createdAt: -1 });

module.exports = mongoose.model('InboxMessage', inboxMessageSchema);

