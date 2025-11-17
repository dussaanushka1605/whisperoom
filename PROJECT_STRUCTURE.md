# Whisperoom - Complete Project Structure

## 📁 Project Overview

**Whisperoom** is a Private Group Chat Application with:
- **Backend**: Node.js + Express + Socket.io + MongoDB
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Database**: MongoDB Atlas (Cloud-hosted)

---

## 🗂️ Directory Structure

```
m-8368-main/
├── backend/                    # Node.js Backend Server
│   ├── models/                 # MongoDB Database Models
│   │   ├── User.js             # User authentication model
│   │   ├── Group.js            # Group model with anonymous members
│   │   ├── Message.js          # Group chat messages
│   │   ├── InboxMessage.js     # Admin-user direct messages
│   │   ├── BlockedUser.js      # Block relationships
│   │   ├── BlockHistory.js     # Block/unblock history tracking
│   │   ├── ThemeHistory.js    # Theme change history tracking
│   │   ├── Report.js           # User reports
│   │   └── Announcement.js     # Admin announcements
│   ├── routes/                 # API Route Handlers
│   │   ├── auth.js             # Authentication (signup/login)
│   │   ├── groups.js           # Group management (create/join)
│   │   ├── messages.js         # Message fetching
│   │   ├── inbox.js            # Admin-user inbox messages
│   │   ├── block.js            # Block/unblock/report functionality
│   │   └── announcements.js   # Admin announcements
│   ├── middleware/             # Authentication Middleware
│   │   └── auth.js             # JWT authentication & role checking
│   ├── server.js               # Main Server (Express + Socket.io)
│   └── ensureAdmin.js          # Admin user setup script
│
├── frontend/                   # Next.js Frontend Application
│   ├── app/                    # Next.js App Router Pages
│   │   ├── page.tsx            # Login/Signup page
│   │   ├── layout.tsx          # Root layout
│   │   ├── dashboard/          # Admin dashboard
│   │   │   ├── page.tsx        # Main dashboard (create/join groups)
│   │   │   └── reports/        # Reports page
│   │   ├── groups/             # Group pages
│   │   │   ├── page.tsx        # Groups list page
│   │   │   └── [id]/           # Dynamic group chat page
│   │   │       └── page.tsx    # Group chat interface
│   │   ├── inbox/              # Admin inbox
│   │   │   └── page.tsx        # Admin chatbot inbox
│   │   └── user-inbox/         # User inbox
│   │       └── page.tsx        # User chatbot interface
│   ├── components/             # React Components
│   │   ├── Login.tsx           # Login/Signup component
│   │   ├── ThemeToggle.tsx     # Dark mode toggle
│   │   └── ui/                 # shadcn/ui components
│   ├── contexts/               # React Context Providers
│   │   └── AuthContext.tsx     # Authentication context
│   └── lib/                    # Utility Libraries
│       ├── api.ts              # API client
│       ├── socket.ts           # Socket.io client
│       └── utils.ts           # Utility functions
│
├── Documentation Files
│   ├── README.md               # Setup instructions
│   ├── PROJECT_STRUCTURE.md   # This file - complete structure
│   ├── CODE_STRUCTURE.md       # Detailed code explanation
│   ├── DATABASE_TRACKING.md    # Database tracking system
│   ├── MONGODB_STRUCTURE.md   # MongoDB schema details
│   ├── QUICK_START.md          # Quick setup guide
│   └── REQUIREMENTS_COVERAGE.md # Requirements checklist
│
└── Batch Files
    ├── start-backend.bat       # Start backend server
    └── start-frontend.bat      # Start frontend server
```

---

## 📚 Documentation Files Guide

1. **`PROJECT_STRUCTURE.md`** (This file)
   - Complete directory structure
   - File organization overview

2. **`CODE_STRUCTURE.md`**
   - Detailed code explanation
   - Feature-to-file mapping
   - How each component works
   - **Best for understanding the codebase**

3. **`DATABASE_TRACKING.md`**
   - Complete database tracking system
   - What's stored permanently
   - How to query everything

4. **`MONGODB_STRUCTURE.md`**
   - MongoDB schema details
   - Collection structures
   - Field descriptions

5. **`QUICK_START.md`**
   - Step-by-step setup guide
   - Troubleshooting tips

6. **`REQUIREMENTS_COVERAGE.md`**
   - Checklist of all requirements
   - Feature verification

7. **`README.md`**
   - Basic project overview
   - Quick setup instructions

---

## 🎯 Key Features by File

### Authentication
- **Frontend**: `frontend/components/Login.tsx`
- **Backend**: `backend/routes/auth.js`
- **Model**: `backend/models/User.js`

### Group Management
- **Frontend**: `frontend/app/dashboard/page.tsx`, `frontend/app/groups/page.tsx`
- **Backend**: `backend/routes/groups.js`
- **Model**: `backend/models/Group.js`

### Real-time Chat
- **Frontend**: `frontend/app/groups/[id]/page.tsx`
- **Backend**: `backend/server.js` (Socket.io handlers)
- **Model**: `backend/models/Message.js`

### Admin-User Chatbot
- **Frontend**: `frontend/app/inbox/page.tsx` (Admin), `frontend/app/user-inbox/page.tsx` (User)
- **Backend**: `backend/routes/inbox.js`, `backend/server.js` (Socket.io)
- **Model**: `backend/models/InboxMessage.js`

### Blocking/Reporting
- **Frontend**: `frontend/app/groups/[id]/page.tsx`, `frontend/app/inbox/page.tsx`
- **Backend**: `backend/routes/block.js`
- **Models**: `backend/models/BlockedUser.js`, `backend/models/BlockHistory.js`, `backend/models/Report.js`

### Theme Management
- **Frontend**: `frontend/app/groups/[id]/page.tsx`
- **Backend**: `backend/routes/groups.js` (theme endpoint)
- **Model**: `backend/models/ThemeHistory.js`

---

## 🚀 Quick Start

1. **Backend Setup**:
   ```bash
   cd backend
   npm install
   node ensureAdmin.js
   npm start
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001/api

---

## 📖 For More Details

- **Understanding Code**: Read `CODE_STRUCTURE.md`
- **Database Info**: Read `DATABASE_TRACKING.md` and `MONGODB_STRUCTURE.md`
- **Setup Help**: Read `QUICK_START.md`
- **Requirements**: Read `REQUIREMENTS_COVERAGE.md`

