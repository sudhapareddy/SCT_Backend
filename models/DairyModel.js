const mongoose = require('mongoose');

const dairySchema = new mongoose.Schema({
  dairyCode: {
    type: String,
    required: true,
    unique: true,
    match: /^[A-Z]{3}$/ // only 3 uppercase letters
  },
  dairyName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true // store hashed password
  },
  role: {
    type: String,
    enum: ['admin', 'dairy'], // roles for dairy users
    default: 'dairy'
  },
  createdOn: {
    type: Date,
    default: Date.now,
    immutable: true  // 👈 ADD THIS LINE

  }
});

module.exports = mongoose.model('Dairy', dairySchema);
