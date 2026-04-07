const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  socketId: { type: String },
  lastSeen: { type: Date, default: Date.now },
  totalSessions: { type: Number, default: 0 },
});

module.exports = mongoose.model('User', userSchema);
