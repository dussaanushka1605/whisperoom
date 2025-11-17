# Quick Start Guide

## Step 1: Start Backend Server

Open a terminal and run:
```bash
cd backend
npm install
node ensureAdmin.js
npm start
```

You should see:
- ✅ MongoDB Connected
- ✅ Server running on port 5001

**OR use the batch file:**
```bash
start-backend.bat
```

## Step 2: Start Frontend Server

Open a NEW terminal and run:
```bash
cd frontend
npm install
npm run dev
```

You should see:
- ▲ Next.js ready on http://localhost:3000

**OR use the batch file:**
```bash
start-frontend.bat
```

## Step 3: Access the Application

1. Open browser: http://localhost:3000
2. Login with admin credentials:
   - Email: `admin@gmail.com`
   - Password: `admin123`
3. You should be redirected to Admin Dashboard

## Troubleshooting

### "Failed to fetch groups" Error

**Check 1: Is backend running?**
- Look for "Server running on port 5001" in backend terminal
- If not, start backend: `cd backend && npm start`

**Check 2: Is MongoDB connected?**
- Look for "MongoDB Connected" in backend terminal
- If not, check your `.env` file in backend folder
- Make sure MONGO_URI is correct

**Check 3: Check browser console**
- Press F12 → Console tab
- Look for error messages
- Check Network tab for failed requests

**Check 4: Verify .env file**
- Backend `.env` should have:
  ```
  PORT=5001
  MONGO_URI=mongodb+srv://dussaanushka200:mongodb123@cluster0.clh0vd7.mongodb.net/whisperoom
  JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
  FRONTEND_URL=http://localhost:3000
  ```

**Check 5: Clear browser cache**
- Press F12 → Application → Clear Storage → Clear site data
- Refresh page

## Common Errors

### Error: "Cannot find module"
**Solution:** Run `npm install` in the folder with the error

### Error: "MongoDB connection error"
**Solution:** 
- Check MONGO_URI in .env
- Make sure MongoDB Atlas allows connections from your IP
- Check internet connection

### Error: "Port 5001 already in use"
**Solution:**
- Kill the process using port 5001
- Or change PORT in .env file

### Error: "Token is not valid"
**Solution:**
- Log out and log back in
- Clear browser localStorage

## Verify Everything Works

1. ✅ Backend shows "MongoDB Connected" and "Server running"
2. ✅ Frontend shows "Ready" on localhost:3000
3. ✅ Can login with admin@gmail.com / admin123
4. ✅ Redirected to /dashboard after login
5. ✅ Can see groups (even if empty)
6. ✅ No errors in browser console

