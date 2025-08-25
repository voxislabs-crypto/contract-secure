const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash the OTP for storage
async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

// Verify the OTP against the hash
async function verifyOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

// Generate a secure random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  generateToken
};
