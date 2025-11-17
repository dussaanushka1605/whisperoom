const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Ensure admin user exists with correct credentials
const ensureAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin exists
    let admin = await User.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      // Create admin if doesn't exist
      admin = new User({
        name: 'Admin',
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin user created successfully');
      console.log('   Email: admin@gmail.com');
      console.log('   Password: admin123');
    } else {
      // Update admin to ensure correct password and role
      admin.password = 'admin123';
      admin.role = 'admin';
      await admin.save();
      console.log('✅ Admin user updated successfully');
      console.log('   Email: admin@gmail.com');
      console.log('   Password: admin123');
    }

    await mongoose.connection.close();
    console.log('✅ Admin setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ensuring admin:', error);
    process.exit(1);
  }
};

ensureAdmin();

