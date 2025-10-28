const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 3600 // Automatically delete after 1 hour (in seconds)
  }
}, {
  timestamps: true
});

// Create index for faster queries
passwordResetTokenSchema.index({ token: 1 });
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);