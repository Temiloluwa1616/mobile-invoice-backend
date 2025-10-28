// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken'); // Add this import

router.post('/register', async (req,res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).send({message:'missing fields'});
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).send({ message: 'Email in use' });
    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({ name, email, passwordHash: hash });
    const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET);
    res.send({ token, user: { id: u._id, name: u.name, email: u.email } });
  } catch (err) { res.status(500).send({ message: err.message }); }
});

router.post('/login', async (req,res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email });
  if (!u) return res.status(400).send({ message:'invalid credentials' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(400).send({ message:'invalid credentials' });
  const token = jwt.sign({ id: u._id }, process.env.JWT_SECRET);
  res.send({ token, user: { id: u._id, name: u.name, email: u.email } });
});

// Forgot Password - Generate and send reset token
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).send({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // For security, don't reveal if email exists or not
    if (!user) {
      return res.send({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    // Save reset token to database
    await PasswordResetToken.findOneAndUpdate(
      { userId: user._id },
      { 
        token: resetToken,
        expiresAt: new Date(resetTokenExpiry),
        userId: user._id
      },
      { upsert: true, new: true }
    );

    // In a real app, you would send an email here
    // For now, we'll return the token for testing
    console.log('📧 Password reset token for', email, ':', resetToken);
    
    res.send({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Remove this in production - only for testing
      resetToken: resetToken 
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).send({ message: 'Error processing request' });
  }
});

// Reset Password - Validate token and update password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).send({ message: 'Token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).send({ message: 'Password must be at least 6 characters' });
  }

  try {
    // Find the reset token
    const resetToken = await PasswordResetToken.findOne({ 
      token,
      expiresAt: { $gt: new Date() } // Check if token is not expired
    });

    if (!resetToken) {
      return res.status(400).send({ message: 'Invalid or expired reset token' });
    }

    // Find user and update password
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    await user.save();

    // Delete the used reset token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    res.send({ message: 'Password reset successfully' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).send({ message: 'Error resetting password' });
  }
});

// Verify reset token (optional - for frontend token validation)
router.post('/verify-reset-token', async (req, res) => {
  const { token } = req.body;

  try {
    const resetToken = await PasswordResetToken.findOne({ 
      token,
      expiresAt: { $gt: new Date() }
    });

    if (!resetToken) {
      return res.status(400).send({ valid: false, message: 'Invalid or expired token' });
    }

    res.send({ valid: true, message: 'Token is valid' });

  } catch (err) {
    res.status(500).send({ valid: false, message: 'Error verifying token' });
  }
});

module.exports = router;