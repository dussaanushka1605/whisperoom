# MongoDB Database Structure for Whisperoom

## Database: `whisperoom`

### Collections Overview

1. **users** - User accounts
2. **groups** - Chat groups with anonymous member IDs
3. **messages** - Group chat messages
4. **inboxmessages** - Admin-user direct messages
5. **announcements** - Admin announcements
6. **blockedusers** - Block relationships
7. **reports** - User reports

---

## 1. **users** Collection

**Schema:**
```javascript
{
  _id: ObjectId,
  name: String,           // User's real name
  email: String,          // User's email (unique)
  password: String,       // Hashed password
  role: String,           // 'admin' or 'user'
  createdAt: Date,
  updatedAt: Date
}
```

**Important:** Admin never sees real names/emails - only anonymous IDs in groups.

---

## 2. **groups** Collection

**Schema:**
```javascript
{
  _id: ObjectId,
  name: String,           // Group name
  code: String,           // Unique 6-character code (e.g., "ABC123")
  description: String,    // Group description
  createdBy: ObjectId,    // Reference to User (admin)
  members: [              // ✅ ANONYMOUS MEMBER IDs PER GROUP
    {
      userId: ObjectId,   // Reference to User
      anonymousName: String,  // ✅ Anonymous ID (e.g., "Witty Butterfly 0")
      joinedAt: Date
    }
  ],
  removedUsers: [         // Users removed by admin
    {
      userId: ObjectId,
      removedAt: Date,
      removedBy: ObjectId
    }
  ],
  theme: String,          // Group theme color
  createdAt: Date,
  updatedAt: Date
}
```

**Key Feature:** ✅ **Anonymous member IDs are stored per group in the `members` array**
- Each member has a unique `anonymousName` per group
- Same user can have different anonymous names in different groups
- Admin only sees `anonymousName`, never real `userId` details

**Example:**
```json
{
  "_id": "...",
  "name": "Study Group",
  "code": "ABC123",
  "members": [
    {
      "userId": ObjectId("..."),
      "anonymousName": "Witty Butterfly 0",
      "joinedAt": "2025-11-16T10:00:00Z"
    },
    {
      "userId": ObjectId("..."),
      "anonymousName": "Silent Phoenix 22",
      "joinedAt": "2025-11-16T10:05:00Z"
    }
  ]
}
```

---

## 3. **messages** Collection

**Schema:**
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,      // Reference to Group
  userId: ObjectId,       // Reference to User (sender)
  anonymousName: String,  // Anonymous name used in this group
  content: String,        // Message text
  messageType: String,    // 'group' or 'chatbot'
  isFile: Boolean,        // Is this a file message?
  fileName: String,       // File name (if isFile = true)
  fileContent: String,    // File content (text-only)
  fileSize: Number,       // File size in bytes
  autoDelete: {
    enabled: Boolean,     // Is auto-delete enabled?
    deleteAfter: Number,  // Seconds until deletion
    expiresAt: Date       // When message expires
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Important Notes:**
- Messages are saved to database when sent
- Messages with `autoDelete.enabled: true` are automatically deleted after `expiresAt`
- Only messages with auto-delete enabled are deleted by the job
- Regular messages (without auto-delete) are **permanently stored**

**Why only 4 messages showing?**
- If you enabled auto-delete on messages, they get deleted after the timer expires
- Check if messages have `autoDelete.enabled: true` in MongoDB
- Regular messages (without auto-delete) should all be saved

---

## 4. **inboxmessages** Collection

**Schema:**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,       // User ID (for admin-user chat)
  anonymousUserId: String, // Anonymous user ID
  messageText: String,    // Message content
  senderType: String,     // 'admin' or 'user'
  isRead: Boolean,        // Read/unread status
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. **announcements** Collection

**Schema:**
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,      // Reference to Group
  groupName: String,      // Group name
  groupCode: String,      // Group code
  createdBy: ObjectId,   // Reference to User (admin)
  createdAt: Date,
  updatedAt: Date
}
```

---

## 6. **blockedusers** Collection

**Schema:**
```javascript
{
  _id: ObjectId,
  blockedBy: ObjectId,              // User who blocked (ObjectId reference)
  blockedByAnonymous: String,       // ✅ Anonymous ID of who blocked (e.g., "Admin", "User_12345678")
  blockedUser: ObjectId,            // User who was blocked (ObjectId reference)
  blockedUserAnonymous: String,     // ✅ Anonymous ID of who was blocked (e.g., "User_87654321")
  reason: String,                    // Optional reason for blocking
  createdAt: Date,
  updatedAt: Date
}
```

**Key Feature:** ✅ **Anonymous identifiers are stored** so you can easily see who blocked whom in MongoDB
- `blockedByAnonymous`: Shows who did the blocking (e.g., "Admin" or "User_12345678")
- `blockedUserAnonymous`: Shows who was blocked (e.g., "User_87654321")
- Makes it easy to understand block relationships without looking up ObjectIds

**Example:**
```json
{
  "_id": ObjectId("..."),
  "blockedBy": ObjectId("..."),
  "blockedByAnonymous": "Admin",
  "blockedUser": ObjectId("..."),
  "blockedUserAnonymous": "User_12345678",
  "reason": "",
  "createdAt": "2025-11-16T17:18:54.519Z",
  "updatedAt": "2025-11-16T17:18:54.519Z"
}
```

---

## 7. **reports** Collection

**Schema:**
```javascript
{
  _id: ObjectId,
  reportedUser: ObjectId, // User who was reported
  reportedBy: ObjectId,   // User who reported
  reason: String,         // Report reason
  description: String,     // Report description
  status: String,         // 'pending' or 'resolved'
  createdAt: Date,
  updatedAt: Date
}
```

---

## ✅ Verification Checklist

### Anonymous Member IDs Per Group
- ✅ **Stored in `groups.members[]` array**
- ✅ Each member has `userId` and `anonymousName`
- ✅ Anonymous names are unique per group
- ✅ Generated when user joins group
- ✅ Stored permanently in database

### Messages Storage
- ✅ All messages are saved to `messages` collection
- ✅ Messages with auto-delete are deleted after expiration
- ✅ Regular messages (no auto-delete) are permanently stored
- ✅ Check `autoDelete.enabled` field to see if message will be deleted

---

## 🔍 Troubleshooting: Why Only 4 Messages?

1. **Check auto-delete status:**
   ```javascript
   // In MongoDB, check if messages have auto-delete enabled
   db.messages.find({ "autoDelete.enabled": true })
   ```

2. **Check all messages:**
   ```javascript
   // Count all messages
   db.messages.countDocuments()
   
   // See all messages
   db.messages.find().pretty()
   ```

3. **Check if messages are being saved:**
   - Look at backend console logs for "✅ Message saved" messages
   - Check for "❌ Error saving message" errors

4. **Auto-delete job:**
   - Runs every 60 seconds
   - Only deletes messages with `autoDelete.enabled: true` and `expiresAt` in the past
   - Regular messages are NOT deleted

---

## 📝 Summary

✅ **Anonymous member IDs are stored in MongoDB** in the `groups.members[]` array
✅ **All messages are saved** unless they have auto-delete enabled
✅ **Check auto-delete status** if messages are missing

