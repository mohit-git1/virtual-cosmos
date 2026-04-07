const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  nameA: { type: String, required: true },
  nameB: { type: String, required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  duration: { type: Number },
});

module.exports = mongoose.model('Connection', connectionSchema);
