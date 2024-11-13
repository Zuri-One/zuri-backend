require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../zuri-backend/src/models/user.model');

async function purgeUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await User.deleteMany({});
    console.log('All users purged successfully');
  } catch (error) {
    console.error('Error purging users:', error);
  } finally {
    await mongoose.disconnect();
  }
}

purgeUsers();