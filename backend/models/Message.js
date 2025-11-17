const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  anonymousName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['group', 'chatbot'],
    default: 'group'
  },
  isFile: {
    type: Boolean,
    default: false
  },
  fileName: {
    type: String,
    trim: true
  },
  fileContent: {
    type: String
  },
  fileSize: {
    type: Number
  },
  autoDelete: {
    enabled: {
      type: Boolean,
      default: false
    },
    deleteAfter: {
      type: Number, // seconds
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);

