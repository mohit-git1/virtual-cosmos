const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  pairKey: { type: String, required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ pairKey: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
