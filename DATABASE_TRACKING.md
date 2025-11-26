# Complete Database Tracking System

## ✅ All Data is Permanently Stored in MongoDB

### **Key Principle: Nothing is Deleted, Only Marked as Hidden**

---

## 📊 What is Tracked in Database

### 1. **Messages (Permanent Storage)**

**Collection**: `messages`

**All messages are saved permanently**, even with auto-delete enabled:
- ✅ Message content
- ✅ Sender anonymous name
- ✅ User ID (for tracking)
- ✅ Group ID
- ✅ Timestamp
- ✅ File sharing details (if file message)
- ✅ Auto-delete status (enabled/disabled)
- ✅ **`isDeleted` flag**: When auto-delete expires, message is marked as `isDeleted: true` but **NOT removed from database**
- ✅ **`deletedAt` timestamp**: When the message was marked as deleted

**Example:**
```json
{
  "_id": ObjectId("..."),
  "groupId": ObjectId("..."),
  "userId": ObjectId("..."),
  "anonymousName": "Witty Butterfly 0",
  "content": "Hello everyone!",
  "isFile": false,
  "autoDelete": {
    "enabled": true,
    "deleteAfter": 60,
    "expiresAt": "2025-11-16T10:05:00Z",
    "isDeleted": true,        // ✅ Marked as deleted but still in DB
    "deletedAt": "2025-11-16T10:06:00Z"
  },
  "createdAt": "2025-11-16T10:04:00Z"
}
```

**To see ALL messages (including deleted):**
```javascript
db.messages.find()  // Shows all messages
db.messages.find({ "autoDelete.isDeleted": true })  // Shows only deleted ones
db.messages.find({ "autoDelete.isDeleted": { $ne: true } })  // Shows active ones
```

---

### 2. **Block/Unblock History (Complete Tracking)**

**Collection**: `blockhistories`

**Every block and unblock action is permanently recorded:**
- ✅ Who blocked (`blockedByAnonymous`)
- ✅ Who was blocked (`blockedUserAnonymous`)
- ✅ Action type (`blocked` or `unblocked`)
- ✅ Timestamp of action
- ✅ Reason (if provided)

**Example:**
```json
{
  "_id": ObjectId("..."),
  "blockedBy": ObjectId("..."),
  "blockedByAnonymous": "Admin",
  "blockedUser": ObjectId("..."),
  "blockedUserAnonymous": "User_12345678",
  "action": "blocked",        // or "unblocked"
  "reason": "",
  "createdAt": "2025-11-16T17:18:54Z"
}
```

**To see all block/unblock history:**
```javascript
db.blockhistories.find().sort({ createdAt: -1 })
```

**API Endpoint**: `GET /api/block/history` (Admin only)

---

### 3. **Theme Changes (Complete History)**

**Collection**: `themehistories`

**Every theme change is permanently recorded:**
- ✅ Group ID and name
- ✅ Who changed it (`changedByAnonymous`)
- ✅ Old theme
- ✅ New theme
- ✅ Timestamp

**Example:**
```json
{
  "_id": ObjectId("..."),
  "groupId": ObjectId("..."),
  "groupName": "Study Group",
  "groupCode": "ABC123",
  "changedBy": ObjectId("..."),
  "changedByAnonymous": "User_87654321",
  "oldTheme": "default",
  "newTheme": "blue",
  "createdAt": "2025-11-16T10:30:00Z"
}
```

**To see all theme changes:**
```javascript
db.themehistories.find().sort({ createdAt: -1 })
```

**API Endpoint**: `GET /api/groups/:groupId/theme-history` (Admin only)

---

### 4. **File Sharing (Already Tracked)**

**Collection**: `messages`

**File sharing details are stored in messages:**
- ✅ `isFile`: Boolean flag
- ✅ `fileName`: Name of shared file
- ✅ `fileContent`: File content (text-only)
- ✅ `fileSize`: File size in bytes
- ✅ All other message fields (sender, timestamp, etc.)

**Example:**
```json
{
  "_id": ObjectId("..."),
  "groupId": ObjectId("..."),
  "userId": ObjectId("..."),
  "anonymousName": "Silent Phoenix 22",
  "content": "Shared file: notes.txt",
  "isFile": true,
  "fileName": "notes.txt",
  "fileContent": "This is the file content...",
  "fileSize": 1024,
  "createdAt": "2025-11-16T10:15:00Z"
}
```

**To see all file shares:**
```javascript
db.messages.find({ "isFile": true })
```

---

### 5. **Anonymous Member IDs Per Group**

**Collection**: `groups`

**Stored in `members[]` array:**
- ✅ `userId`: User ObjectId
- ✅ `anonymousName`: Anonymous ID per group
- ✅ `joinedAt`: When they joined

**Example:**
```json
{
  "_id": ObjectId("..."),
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

## 🔍 How to Query Everything

### **All Messages (Including Deleted)**
```javascript
// All messages
db.messages.find()

// Only active messages (not deleted)
db.messages.find({ "autoDelete.isDeleted": { $ne: true } })

// Only deleted messages
db.messages.find({ "autoDelete.isDeleted": true })

// Messages from specific user
db.messages.find({ "userId": ObjectId("...") })

// File messages
db.messages.find({ "isFile": true })
```

### **Block/Unblock History**
```javascript
// All history
db.blockhistories.find().sort({ createdAt: -1 })

// Only blocks
db.blockhistories.find({ "action": "blocked" })

// Only unblocks
db.blockhistories.find({ "action": "unblocked" })

// History for specific user
db.blockhistories.find({ 
  $or: [
    { "blockedBy": ObjectId("...") },
    { "blockedUser": ObjectId("...") }
  ]
})
```

### **Theme Changes**
```javascript
// All theme changes
db.themehistories.find().sort({ createdAt: -1 })

// Theme changes for specific group
db.themehistories.find({ "groupId": ObjectId("...") })

// Theme changes by specific user
db.themehistories.find({ "changedBy": ObjectId("...") })
```

### **File Shares**
```javascript
// All file shares
db.messages.find({ "isFile": true })

// File shares in specific group
db.messages.find({ 
  "groupId": ObjectId("..."),
  "isFile": true 
})
```

---

## 📝 Summary

✅ **All messages are permanently stored** - even with auto-delete, they're marked as deleted but kept in database

✅ **Complete block/unblock history** - every action is recorded with timestamps

✅ **Complete theme change history** - every change is tracked

✅ **File sharing tracked** - all file details stored in messages

✅ **Anonymous member IDs stored** - per group in `groups.members[]`

✅ **Everything is queryable** - use MongoDB queries to see all data

---

## 🎯 Key Collections

1. **messages** - All messages (including deleted ones)
2. **blockhistories** - Complete block/unblock history
3. **themehistories** - Complete theme change history
4. **blockedusers** - Current block status (with anonymous IDs)
5. **groups** - Groups with anonymous member IDs
6. **inboxmessages** - Admin-user direct messages
7. **reports** - User reports

**Nothing is permanently deleted - everything is tracked!**

