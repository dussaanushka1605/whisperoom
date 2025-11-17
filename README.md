# Whisperoom - Private Group Chat Application

A complete private group chat application with anonymous identities, real-time messaging, and admin chatbot functionality.

## Project Structure

```
.
├── backend/          # Node.js + Express + Socket.io + MongoDB
├── frontend/         # Next.js React Application
└── README.md
```

## Features

- **Authentication**: User signup/login with JWT and bcrypt
- **Admin System**: Fixed admin login (admin@gmail.com / admin123)
- **Anonymous Identities**: Users are identified as "User A", "User B", etc. in groups
- **Group Management**: Admin creates groups with unique codes
- **Real-time Chat**: Socket.io powered instant messaging
- **Chatbot System**: Admin can communicate with users anonymously
- **Privacy**: Admin never sees real user names or emails

## Setup Instructions

### Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend folder:
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

6. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. The `.env.local` file is already configured with:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Admin Login**: 
   - Email: `admin@gmail.com`
   - Password: `admin123`

2. **User Signup/Login**: 
   - Regular users can sign up and login
   - They will be assigned anonymous identities in groups

3. **Creating Groups** (Admin only):
   - Go to Admin Dashboard
   - Create a new group with name and description
   - A unique 6-character code will be generated

4. **Joining Groups**:
   - Users can join groups using the group code
   - Each user gets an anonymous identity (User A, User B, etc.)

5. **Group Chat**:
   - Real-time messaging within groups
   - Messages are saved to database
   - All users see anonymous names only

6. **Chatbot**:
   - Admin can send announcements and group codes
   - Users can communicate with admin
   - All communication is anonymous

## Database Collections

- **Users**: User accounts with roles (admin/user)
- **Groups**: Group information with members and anonymous identities
- **Messages**: Group chat messages
- **ChatbotMessages**: Admin-user chatbot communications

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Groups
- `POST /api/groups/create` - Create group (Admin only)
- `POST /api/groups/join` - Join group with code
- `GET /api/groups/all` - Get all groups
- `GET /api/groups/:id` - Get single group

### Messages
- `GET /api/messages/group/:groupId` - Get group messages

### Chatbot
- `GET /api/chatbot/group/:groupId` - Get chatbot messages for group
- `GET /api/chatbot/all` - Get all chatbot messages (Admin only)

## Socket.io Events

### Client to Server
- `join-group` - Join a group room
- `send-message` - Send a group chat message
- `send-chatbot-message` - Send a chatbot message

### Server to Client
- `joined-group` - Confirmation of joining group
- `new-message` - New group chat message
- `new-chatbot-message` - New chatbot message
- `user-joined` - User joined notification
- `error` - Error notification

## Technologies Used

### Backend
- Node.js
- Express.js
- Socket.io
- MongoDB (Mongoose)
- JWT (jsonwebtoken)
- bcryptjs

### Frontend
- Next.js 14
- React 18
- TypeScript
- Socket.io Client
- Axios

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Admin-only routes protection
- Anonymous identity system
- User data privacy (admin never sees real names/emails)

## Notes

- Make sure MongoDB Atlas is accessible from your IP address
- Update the JWT_SECRET in production
- The admin user is created automatically on first run
- All user identities in groups are anonymous to admins

