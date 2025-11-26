# MongoDB Storage Verification

## ✅ All Data is Stored Correctly in MongoDB

### 1. Messages Collection (`messages`)

**What's Stored:**
- ✅ All message content
- ✅ Sender anonymous name
- ✅ User ID (ObjectId reference)
- ✅ Group ID (ObjectId reference)
- ✅ Timestamp (createdAt, updatedAt)
- ✅ File sharing data (if file message): `isFile`, `fileName`, `fileContent`, `fileSize`
- ✅ Auto-delete data: `enabled`, `deleteAfter`, `expiresAt`, `isDeleted`, `deletedAt`

**Verification Queries:**
```javascript
// See all messages
db.messages.find().sort({ createdAt: -1 })

// See only active (non-deleted) messages
db.messages.find({ 
  $or: [
    { "autoDelete.isDeleted": { $ne: true } },
    { "autoDelete.isDeleted": { $exists: false } }
  ]
})

// See only deleted messages (permanently stored)
db.messages.find({ "autoDelete.isDeleted": true })

// See file messages
db.messages.find({ isFile: true })

// Count messages per group
db.messages.aggregate([
  { $group: { _id: "$groupId", count: { $sum: 1 } } }
])
```

**Key Point:** Messages with auto-delete are **NOT removed** from database. They are marked `isDeleted: true` but remain permanently stored.

---

### 2. Groups Collection (`groups`)

**What's Stored:**
- ✅ Group name, code, description
- ✅ Created by (admin ObjectId)
- ✅ **Members array** with `userId` and `anonymousName` per group
- ✅ Removed users array
- ✅ Theme (default, blue, green, purple, orange, red, pink, grey)

**Verification Queries:**
```javascript
// See all groups
db.groups.find()

// See group with members (anonymous IDs per group)
db.groups.findOne({ code: "ABC123" })

// Count members per group
db.groups.aggregate([
  { $project: { name: 1, memberCount: { $size: "$members" } } }
])

// See groups with specific theme
db.groups.find({ theme: "blue" })

// See removed users
db.groups.find({ "removedUsers": { $exists: true, $ne: [] } })
```

**Key Point:** Each group stores anonymous member IDs in `members[]` array. Same user has different anonymous names in different groups.

---

### 3. BlockedUsers Collection (`blockedusers`)

**What's Stored:**
- ✅ `blockedBy` (ObjectId)
- ✅ **`blockedByAnonymous`** (e.g., "Admin" or "User_12345678")
- ✅ `blockedUser` (ObjectId)
- ✅ **`blockedUserAnonymous`** (e.g., "User_87654321")
- ✅ Reason (optional)
- ✅ Timestamps

**Verification Queries:**
```javascript
// See all blocked relationships
db.blockedusers.find()

// See who blocked whom (with anonymous IDs)
db.blockedusers.find().forEach(block => {
  print(`${block.blockedByAnonymous} blocked ${block.blockedUserAnonymous}`)
})

// See who a specific user blocked
db.blockedusers.find({ "blockedByAnonymous": "Admin" })

// See who blocked a specific user
db.blockedusers.find({ "blockedUserAnonymous": "User_12345678" })
```

**Key Point:** Anonymous IDs are stored, making it easy to see who blocked whom without looking up ObjectIds.

---

### 4. BlockHistories Collection (`blockhistories`)

**What's Stored:**
- ✅ All block actions (`action: "blocked"`)
- ✅ All unblock actions (`action: "unblocked"`)
- ✅ `blockedByAnonymous` and `blockedUserAnonymous`
- ✅ Reason (if provided)
- ✅ Timestamp

**Verification Queries:**
```javascript
// See all block/unblock history
db.blockhistories.find().sort({ createdAt: -1 })

// See only block actions
db.blockhistories.find({ action: "blocked" })

// See only unblock actions
db.blockhistories.find({ action: "unblocked" })

// See history for a specific user
db.blockhistories.find({ 
  $or: [
    { "blockedByAnonymous": "Admin" },
    { "blockedUserAnonymous": "Admin" }
  ]
}).sort({ createdAt: -1 })

// Count blocks vs unblocks
db.blockhistories.aggregate([
  { $group: { _id: "$action", count: { $sum: 1 } } }
])
```

**Key Point:** Complete permanent history of all block/unblock actions with timestamps.

---

### 5. ThemeHistories Collection (`themehistories`)

**What's Stored:**
- ✅ Group ID, name, code
- ✅ Who changed it (`changedByAnonymous`)
- ✅ Old theme → New theme
- ✅ Timestamp

**Verification Queries:**
```javascript
// See all theme changes
db.themehistories.find().sort({ createdAt: -1 })

// See theme changes for a specific group
db.themehistories.find({ groupId: ObjectId("...") })

// See who changed themes
db.themehistories.find({ "changedByAnonymous": "Admin" })

// See theme change timeline for a group
db.themehistories.find({ groupId: ObjectId("...") })
  .sort({ createdAt: 1 })
  .forEach(change => {
    print(`${change.changedByAnonymous} changed theme from "${change.oldTheme}" to "${change.newTheme}" at ${change.createdAt}`)
  })
```

**Key Point:** Complete permanent history of all theme changes with who made them.

---

### 6. Users Collection (`users`)

**What's Stored:**
- ✅ Name, email, password (hashed)
- ✅ Role (admin/user)
- ✅ Timestamps

**Verification Queries:**
```javascript
// See all users (passwords are hashed)
db.users.find({}, { password: 0 })  // Exclude password field

// Count admins vs users
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
])
```

**Key Point:** Passwords are hashed with bcrypt. Admin never sees real user names/emails in groups.

---

### 7. InboxMessages Collection (`inboxmessages`)

**What's Stored:**
- ✅ User ID and anonymous user ID
- ✅ Sender type (admin/user)
- ✅ Message text
- ✅ Read status
- ✅ Timestamps

**Verification Queries:**
```javascript
// See all inbox messages
db.inboxmessages.find().sort({ createdAt: -1 })

// See unread messages
db.inboxmessages.find({ isRead: false })

// See messages from admin
db.inboxmessages.find({ senderType: "admin" })
```

---

### 8. Reports Collection (`reports`)

**What's Stored:**
- ✅ Reported by (ObjectId)
- ✅ Reported user (ObjectId)
- ✅ Reason and description
- ✅ Status
- ✅ Admin notes
- ✅ Timestamps

**Verification Queries:**
```javascript
// See all reports
db.reports.find().sort({ createdAt: -1 })

// See pending reports
db.reports.find({ status: "pending" })
```

---

## 📊 Summary: What's Permanently Stored

1. ✅ **All Messages** - Even auto-deleted ones (marked `isDeleted: true`)
2. ✅ **All Block/Unblock Actions** - Complete history in `blockhistories`
3. ✅ **All Theme Changes** - Complete history in `themehistories`
4. ✅ **Anonymous Member IDs** - Stored per group in `groups.members[]`
5. ✅ **Block Relationships** - With anonymous IDs in `blockedusers`
6. ✅ **File Sharing** - All file messages stored with content
7. ✅ **All User Actions** - Everything is tracked and stored

## 🔍 Quick Verification Commands

```javascript
// Check total messages (including deleted)
db.messages.countDocuments()

// Check deleted messages
db.messages.countDocuments({ "autoDelete.isDeleted": true })

// Check block history entries
db.blockhistories.countDocuments()

// Check theme history entries
db.themehistories.countDocuments()

// Check groups with anonymous members
db.groups.find({}, { name: 1, "members.anonymousName": 1 })
```

---

## ✅ Verification Status: ALL DATA STORED CORRECTLY

All MongoDB collections are storing data correctly with:
- ✅ Permanent storage (nothing deleted, only marked)
- ✅ Anonymous IDs for privacy
- ✅ Complete history tracking
- ✅ Proper indexing for performance

