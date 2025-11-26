# Whisperoom - File Descriptions

## 📁 Complete File Structure with Descriptions

This document explains what each file in the project does and which features it implements.

---

## 🗂️ Root Directory

### Documentation Files
- **`README.md`** - Basic project overview and setup instructions
- **`PROJECT_STRUCTURE.md`** - Complete directory structure and organization
- **`DATABASE_TRACKING.md`** - Database tracking system documentation
- **`MONGODB_STRUCTURE.md`** - MongoDB schema and collection details
- **`QUICK_START.md`** - Step-by-step setup guide
- **`REQUIREMENTS_COVERAGE.md`** - Requirements checklist and verification
- **`FILE_DESCRIPTIONS.md`** - This file - descriptions of all files

### Batch Files
- **`start-backend.bat`** - Windows batch file to start backend server
- **`start-frontend.bat`** - Windows batch file to start frontend server

---

## 🔧 Backend Directory (`backend/`)

### Core Server
- **`server.js`** - Main Express server with Socket.io setup
  - Handles WebSocket connections
  - Real-time message broadcasting
  - Group join/leave events
  - Auto-delete message job
  - CORS configuration

### Models (`backend/models/`)
- **`User.js`** - User authentication model
  - Fields: name, email, password (hashed), role (admin/user)
  - Password hashing with bcrypt
  - Password comparison method

- **`Group.js`** - Group model with anonymous members
  - Fields: name, code, description, createdBy, members[], removedUsers[], theme
  - Members array stores userId and anonymousName per group
  - Theme field for group-specific themes

- **`Message.js`** - Group chat messages model
  - Fields: groupId, userId, anonymousName, content, messageType, isFile, fileName, fileContent, fileSize, autoDelete
  - Auto-delete fields: enabled, deleteAfter, expiresAt, isDeleted, deletedAt
  - **All messages stored permanently** (even deleted ones)

- **`InboxMessage.js`** - Admin-user direct messages model
  - Fields: userId, anonymousUserId, senderType (admin/user), messageText, isRead, readAt
  - Used for chatbot inbox system

- **`BlockedUser.js`** - Block relationships model
  - Fields: blockedBy, blockedByAnonymous, blockedUser, blockedUserAnonymous, reason
  - Stores anonymous IDs for easy identification

- **`BlockHistory.js`** - Block/unblock history tracking
  - Fields: blockedBy, blockedByAnonymous, blockedUser, blockedUserAnonymous, action (blocked/unblocked), reason
  - **Permanent record** of all block/unblock actions

- **`ThemeHistory.js`** - Theme change history tracking
  - Fields: groupId, groupName, groupCode, changedBy, changedByAnonymous, oldTheme, newTheme
  - **Permanent record** of all theme changes

- **`Report.js`** - User reports model
  - Fields: reportedBy, reportedUser, reason, description, status, adminNotes

- **`Announcement.js`** - Admin announcements model
  - Fields: title, content, createdBy, targetGroup (optional)

### Routes (`backend/routes/`)
- **`auth.js`** - Authentication routes
  - `POST /signup` - User registration
  - `POST /login` - User login (returns JWT token)
  - `GET /admin-id` - Get admin user ID

- **`groups.js`** - Group management routes
  - `POST /create` - Create new group (admin only)
  - `POST /join` - Join group with code
  - `GET /all` - Get all groups
  - `GET /:id` - Get specific group details
  - `POST /:groupId/remove-user` - Remove user from group (admin only)
  - `PUT /:groupId/theme` - Update group theme
  - `GET /:groupId/theme-history` - Get theme change history (admin only)

- **`messages.js`** - Message routes
  - `GET /group/:groupId` - Get messages for a group
  - Filters blocked users and deleted messages

- **`inbox.js`** - Admin-user inbox routes
  - `GET /admin/users` - Get list of users who sent messages (admin)
  - `GET /admin/user/:userId` - Get chat history with specific user (admin)
  - `GET /user-messages` - Get user's messages with admin
  - `POST /send` - Send inbox message
  - `POST /mark-read` - Mark messages as read (admin)
  - `POST /mark-read-user` - Mark messages as read (user)

- **`block.js`** - Block/unblock/report routes
  - `POST /block` - Block a user
  - `POST /unblock` - Unblock a user
  - `GET /blocked` - Get list of blocked users
  - `GET /check/:userId` - Check block status
  - `POST /report` - Report a user
  - `GET /reports` - Get all reports (admin only)
  - `PATCH /reports/:reportId` - Update report status (admin only)
  - `GET /history` - Get block/unblock history (admin only)

- **`announcements.js`** - Announcement routes
  - `POST /create` - Create announcement (admin only)
  - `GET /all` - Get all announcements
  - `GET /group/:groupId` - Get announcements for a group

### Middleware (`backend/middleware/`)
- **`auth.js`** - Authentication middleware
  - `auth` - JWT token verification
  - `adminAuth` - Admin role verification

### Setup Scripts
- **`ensureAdmin.js`** - Creates/updates admin user
  - Email: admin@gmail.com
  - Password: admin123
  - Run once: `node ensureAdmin.js`

---

## 🎨 Frontend Directory (`frontend/`)

### Pages (`frontend/app/`)
- **`page.tsx`** - Login/Signup page
  - Handles user authentication
  - Redirects to dashboard or groups based on role

- **`layout.tsx`** - Root layout
  - Wraps all pages
  - Provides AuthContext

- **`dashboard/page.tsx`** - Admin dashboard
  - Create new groups
  - Join existing groups
  - View all groups
  - Access chatbot inbox
  - View reports

- **`dashboard/reports/page.tsx`** - Reports page
  - View all user reports
  - Update report status (admin only)

- **`groups/page.tsx`** - Groups list page
  - Shows all groups user is member of
  - Join new groups with code

- **`groups/[id]/page.tsx`** - Group chat page
  - Real-time group chat interface
  - File sharing
  - Theme selection
  - Auto-delete messages
  - Block/unblock users
  - Report users
  - Remove users (admin only)
  - Typing indicators

- **`inbox/page.tsx`** - Admin inbox page
  - List of users who sent messages
  - Chat history with selected user
  - Block/unblock users
  - Report users
  - Typing indicators

- **`user-inbox/page.tsx`** - User inbox page
  - Direct chat with admin
  - Block/unblock admin
  - Report admin
  - Typing indicators

### Components (`frontend/components/`)
- **`Login.tsx`** - Login/Signup component
  - Signup form (name, email, password)
  - Login form (email, password)
  - JWT token storage

- **`ThemeToggle.tsx`** - Dark mode toggle
  - Switches between light/dark theme
  - Used in dashboard and groups pages

### UI Components (`frontend/components/ui/`)
- **shadcn/ui components** - Pre-built UI components
  - `button.tsx` - Button component
  - `card.tsx` - Card component
  - `dialog.tsx` - Dialog/Modal component
  - `input.tsx` - Input field component
  - `label.tsx` - Label component
  - `popover.tsx` - Popover component
  - `scroll-area.tsx` - Scrollable area component
  - `tabs.tsx` - Tabs component
  - `textarea.tsx` - Textarea component
  - `toaster.tsx` - Toast notification component
  - `badge.tsx` - Badge component

### Contexts (`frontend/contexts/`)
- **`AuthContext.tsx`** - Authentication context
  - Provides user state
  - Handles login/logout
  - Token management
  - Role checking

### Libraries (`frontend/lib/`)
- **`api.ts`** - API client
  - Axios instance with JWT token
  - Base URL configuration

- **`socket.ts`** - Socket.io client
  - Socket connection management
  - Token-based authentication
  - Connection/disconnection handling

- **`utils.ts`** - Utility functions
  - Class name merging (cn function)

### Configuration Files
- **`package.json`** - Frontend dependencies
- **`tsconfig.json`** - TypeScript configuration
- **`tailwind.config.ts`** - Tailwind CSS configuration
- **`next.config.js`** - Next.js configuration
- **`postcss.config.js`** - PostCSS configuration
- **`globals.css`** - Global CSS styles

---

## 🎯 Feature-to-File Mapping

### Authentication
- **Backend**: `backend/routes/auth.js`, `backend/models/User.js`
- **Frontend**: `frontend/components/Login.tsx`, `frontend/contexts/AuthContext.tsx`

### Group Management
- **Backend**: `backend/routes/groups.js`, `backend/models/Group.js`
- **Frontend**: `frontend/app/dashboard/page.tsx`, `frontend/app/groups/page.tsx`

### Real-time Chat
- **Backend**: `backend/server.js` (Socket.io), `backend/models/Message.js`
- **Frontend**: `frontend/app/groups/[id]/page.tsx`, `frontend/lib/socket.ts`

### Admin-User Chatbot
- **Backend**: `backend/routes/inbox.js`, `backend/models/InboxMessage.js`, `backend/server.js`
- **Frontend**: `frontend/app/inbox/page.tsx` (Admin), `frontend/app/user-inbox/page.tsx` (User)

### Blocking/Reporting
- **Backend**: `backend/routes/block.js`, `backend/models/BlockedUser.js`, `backend/models/BlockHistory.js`, `backend/models/Report.js`
- **Frontend**: `frontend/app/groups/[id]/page.tsx`, `frontend/app/inbox/page.tsx`

### Theme Management
- **Backend**: `backend/routes/groups.js` (theme endpoint), `backend/models/ThemeHistory.js`
- **Frontend**: `frontend/app/groups/[id]/page.tsx`

### File Sharing
- **Backend**: `backend/models/Message.js` (isFile fields), `backend/server.js` (Socket.io)
- **Frontend**: `frontend/app/groups/[id]/page.tsx`

### Auto-delete Messages
- **Backend**: `backend/models/Message.js` (autoDelete fields), `backend/server.js` (auto-delete job)
- **Frontend**: `frontend/app/groups/[id]/page.tsx`

### Typing Indicators
- **Backend**: `backend/server.js` (typing events)
- **Frontend**: `frontend/app/groups/[id]/page.tsx`, `frontend/app/inbox/page.tsx`, `frontend/app/user-inbox/page.tsx`

---

## 📊 Database Collections

All data is stored in MongoDB Atlas:

1. **users** - User accounts
2. **groups** - Chat groups with anonymous members
3. **messages** - Group chat messages (permanently stored)
4. **inboxmessages** - Admin-user direct messages
5. **blockedusers** - Current block relationships
6. **blockhistories** - Block/unblock history (permanent)
7. **themehistories** - Theme change history (permanent)
8. **reports** - User reports
9. **announcements** - Admin announcements

---

## 🚀 Quick Reference

**To understand a feature:**
1. Check this file for which files implement it
2. Read the relevant files
3. Check `DATABASE_TRACKING.md` for database structure
4. Check `MONGODB_STRUCTURE.md` for schema details

**To add a new feature:**
1. Create model in `backend/models/`
2. Create routes in `backend/routes/`
3. Add Socket.io handlers in `backend/server.js` (if real-time)
4. Create frontend page/component in `frontend/app/` or `frontend/components/`
5. Update this file with new file descriptions

