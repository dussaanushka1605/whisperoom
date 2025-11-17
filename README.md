# Whisperoom - Private Group Chat Application

A complete private group chat application with anonymous identities, real-time messaging, file sharing, auto-delete messages, blocking/reporting features, and admin chatbot functionality. Built with Next.js, Express, Socket.io, and MongoDB.

![Whisperoom](https://img.shields.io/badge/Whisperoom-Private%20Group%20Chat-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

## 📋 Project Description

**Whisperoom** is a full-stack private group chat application that enables secure, anonymous group conversations. The application features:

- **Anonymous Messaging**: Users are assigned anonymous identities (e.g., "Happy Panda 42") in each group, ensuring privacy
- **Real-time Chat**: Instant messaging powered by Socket.io
- **Admin Dashboard**: Admin can create groups, manage users, and communicate via chatbot
- **User Features**: Join groups, send messages, share files, block/report users, and customize themes
- **Auto-delete Messages**: Users can set messages to auto-delete after a specified time
- **Complete Privacy**: Admin never sees real user names or emails - only anonymous IDs
- **Permanent Database Tracking**: All messages, block/unblock actions, and theme changes are permanently stored in MongoDB

### Key Features

- ✅ User authentication (signup/login) with JWT
- ✅ Anonymous member IDs per group
- ✅ Real-time group chat with Socket.io
- ✅ File sharing (text-only files)
- ✅ Auto-delete messages with countdown timer
- ✅ Block/unblock users with complete history tracking
- ✅ Report users functionality
- ✅ Admin user removal from groups
- ✅ Group-specific themes (8 color options)
- ✅ Admin-user direct messaging (chatbot)
- ✅ Typing indicators
- ✅ Complete database tracking (nothing is deleted, only marked)

---

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **MongoDB** (Mongoose) - NoSQL database
- **JWT** (jsonwebtoken) - Authentication tokens
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Emoji Picker React** - Emoji selection

### Database
- **MongoDB Atlas** - Cloud-hosted MongoDB database

---

## 🚀 Setup & Run Instructions

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (or local MongoDB instance)
- npm or yarn package manager

### Step 1: Clone the Repository

```bash
git clone https://github.com/dussaanushka1605/whisperoom.git
cd whisperoom
```

### Step 2: Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `backend` directory:
```env
PORT=5001
MONGO_URI=your_mongodb_atlas_connection_string_here
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
FRONTEND_URL=http://localhost:3000
```

4. Replace `MONGO_URI` with your MongoDB Atlas connection string.

5. Initialize the admin user:
```bash
node ensureAdmin.js
```

This creates the default admin user:
- Email: `admin@gmail.com`
- Password: `admin123`

6. Start the backend server:
```bash
npm start
```

**OR** for development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:5001`

**OR** use the batch file (Windows):
```bash
start-backend.bat
```

### Step 3: Frontend Setup

1. Open a **new terminal** and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

**OR** use the batch file (Windows):
```bash
start-frontend.bat
```

### Step 4: Access the Application

1. Open your browser and navigate to: `http://localhost:3000`

2. **Admin Login:**
   - Email: `admin@gmail.com`
   - Password: `admin123`

3. **User Signup/Login:**
   - Regular users can sign up with name, email, and password
   - They will be assigned anonymous identities in groups

---

## 🔐 Environment Variables

### Backend (`.env` file in `backend/` directory)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `5001` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/whisperoom` |
| `JWT_SECRET` | Secret key for JWT token signing | `your_super_secret_jwt_key_change_this_in_production` |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` |

**Example `.env` file:**
```env
PORT=5001
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/whisperoom?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local` file in `frontend/` directory)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5001` |

**Example `.env.local` file:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### ⚠️ Important Notes

- **Never commit `.env` or `.env.local` files to version control**
- Change `JWT_SECRET` to a strong random string in production
- Ensure MongoDB Atlas allows connections from your IP address
- For production, update `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` to your production URLs

---

## 📸 Screenshots

> **Note:** Screenshots can be added here to showcase the application interface, features, and user experience.

### Suggested Screenshots:
- Login/Signup page
- Admin Dashboard
- Group Chat interface
- File sharing feature
- Theme selection
- Block/Report dialogs
- Admin Inbox (Chatbot)

---

## 📖 Usage Guide

### For Admins

1. **Login** with admin credentials (`admin@gmail.com` / `admin123`)
2. **Create Groups**: Go to Dashboard → Create New Group
3. **View All Groups**: See all groups and their member counts
4. **Manage Users**: Remove users from groups if needed
5. **Chatbot**: Communicate with users via Inbox
6. **View Reports**: Check user reports in Reports page

### For Users

1. **Signup/Login**: Create account or login
2. **Join Groups**: Use group code to join groups
3. **Chat**: Send messages, emojis, and files in groups
4. **Customize**: Change group themes
5. **Auto-delete**: Set messages to auto-delete after specified time
6. **Block/Report**: Block or report other users
7. **Chatbot**: Communicate with admin via User Inbox

---

## 🗄️ Database Structure

The application uses MongoDB with the following collections:

- **users** - User accounts (admin/user roles)
- **groups** - Chat groups with anonymous member IDs
- **messages** - Group chat messages (permanently stored)
- **inboxmessages** - Admin-user direct messages
- **blockedusers** - Current block relationships
- **blockhistories** - Complete block/unblock history
- **themehistories** - Complete theme change history
- **reports** - User reports
- **announcements** - Admin announcements

For detailed database structure, see [MONGODB_STRUCTURE.md](./MONGODB_STRUCTURE.md)

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/admin-id` - Get admin user ID

### Groups
- `POST /api/groups/create` - Create group (Admin only)
- `POST /api/groups/join` - Join group with code
- `GET /api/groups/all` - Get all groups
- `GET /api/groups/:id` - Get single group
- `POST /api/groups/:groupId/remove-user` - Remove user from group (Admin only)
- `PUT /api/groups/:groupId/theme` - Update group theme
- `GET /api/groups/:groupId/theme-history` - Get theme change history (Admin only)

### Messages
- `GET /api/messages/group/:groupId` - Get group messages

### Inbox (Chatbot)
- `GET /api/inbox/admin/users` - Get users who sent messages (Admin)
- `GET /api/inbox/admin/user/:userId` - Get chat history with user (Admin)
- `GET /api/inbox/user-messages` - Get user's messages with admin
- `POST /api/inbox/send` - Send inbox message
- `POST /api/inbox/mark-read` - Mark messages as read (Admin)
- `POST /api/inbox/mark-read-user` - Mark messages as read (User)

### Block/Report
- `POST /api/block/block` - Block a user
- `POST /api/block/unblock` - Unblock a user
- `GET /api/block/blocked` - Get list of blocked users
- `GET /api/block/check/:userId` - Check block status
- `POST /api/block/report` - Report a user
- `GET /api/block/reports` - Get all reports (Admin only)
- `PATCH /api/block/reports/:reportId` - Update report status (Admin only)
- `GET /api/block/history` - Get block/unblock history (Admin only)

### Announcements
- `POST /api/announcements/create` - Create announcement (Admin only)
- `GET /api/announcements/all` - Get all announcements
- `GET /api/announcements/group/:groupId` - Get announcements for a group

---

## 🔄 Socket.io Events

### Client to Server
- `join-group` - Join a group room
- `send-message` - Send a group chat message
- `send-inbox-message` - Send an inbox/chatbot message
- `typing-start` - User started typing
- `typing-stop` - User stopped typing

### Server to Client
- `joined-group` - Confirmation of joining group
- `new-message` - New group chat message
- `message-sent` - Confirmation of sent message
- `new-inbox-message` - New inbox/chatbot message
- `messages-deleted` - Auto-deleted messages removed
- `user-joined` - User joined notification
- `user-left` - User left notification
- `member-count-updated` - Group member count updated
- `theme-updated` - Group theme changed
- `user-blocked` - User blocked notification
- `user-unblocked` - User unblocked notification
- `removed-from-group` - User removed from group
- `error` - Error notification

---

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Admin-only routes protection
- ✅ Anonymous identity system
- ✅ User data privacy (admin never sees real names/emails)
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ Mutual blocking system

---

## 📚 Additional Documentation

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Complete project structure
- [FILE_DESCRIPTIONS.md](./FILE_DESCRIPTIONS.md) - File descriptions
- [DATABASE_TRACKING.md](./DATABASE_TRACKING.md) - Database tracking system
- [MONGODB_STRUCTURE.md](./MONGODB_STRUCTURE.md) - MongoDB schema details
- [MONGODB_VERIFICATION.md](./MONGODB_VERIFICATION.md) - MongoDB verification queries
- [QUICK_START.md](./QUICK_START.md) - Quick setup guide
- [REQUIREMENTS_COVERAGE.md](./REQUIREMENTS_COVERAGE.md) - Requirements checklist
- [GITHUB_READY_CHECKLIST.md](./GITHUB_READY_CHECKLIST.md) - Pre-push checklist

---

## 🐛 Troubleshooting

### Backend Issues

**"MongoDB connection error"**
- Check `MONGO_URI` in `.env` file
- Ensure MongoDB Atlas allows connections from your IP
- Verify internet connection

**"Port 5001 already in use"**
- Kill the process using port 5001
- Or change `PORT` in `.env` file

### Frontend Issues

**"Failed to fetch groups"**
- Verify backend is running on port 5001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for errors

**"Token is not valid"**
- Log out and log back in
- Clear browser localStorage

### Common Solutions

1. **Clear browser cache**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Restart servers**: Stop and restart both backend and frontend
3. **Check console**: Look for error messages in browser console (F12)
4. **Verify .env files**: Ensure all environment variables are set correctly

For more troubleshooting tips, see [QUICK_START.md](./QUICK_START.md)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Anushka Dussa**
- GitHub: [@dussaanushka1605](https://github.com/dussaanushka1605)

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Socket.io for real-time communication
- MongoDB for the database solution
- All open-source contributors

---

## 📞 Support

For issues, questions, or contributions, please open an issue on the [GitHub repository](https://github.com/dussaanushka1605/whisperoom).

---

**Made with ❤️ for private group conversations**
