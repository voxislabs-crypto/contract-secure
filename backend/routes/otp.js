const express = require('express');
const router = express.Router();
const { getDb } = require('../services/db');
const { hashOTP } = require('../utils/otp');
const { logAudit } = require('../services/audit');

// Start OTP process
router.post('/start', async (req, res) => {
  try {
    const { contractId, signerId, email } = req.body;
    const db = await getDb();
    
    // In production, generate and send OTP
    const otp = '123456'; // In prod: generateOTP()
    const otpHash = hashOTP(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    
    await db.run(
      `UPDATE signers 
       SET otp_hash = ?, otp_expires_at = ?
       WHERE id = ? AND contract_id = ?`,
      [otpHash, otpExpires, signerId, contractId]
    );

    // In production, send email with OTP
    console.log(`OTP for ${email}: ${otp}`); // Remove in production
    
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('OTP start error:', error);
    res.status(500).json({ error: 'Failed to start OTP process' });
  }
});

// Verify OTP
router.post('/verify', async (req, res) => {
  try {
    const { contractId, signerId, code } = req.body;
    const db = await getDb();
    
    // Check for dev override
    const devAcceptCode = process.env.DEV_ACCEPT_CODE;
    const isDevOverride = devAcceptCode && code === devAcceptCode;
    
    const row = await db.get(
      `SELECT * FROM signers 
       WHERE id = ? AND contract_id = ? 
       AND (otp_expires_at > datetime('now') OR ?)`,
      [signerId, contractId, isDevOverride ? 1 : 0]
    );

    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Verify OTP if not using dev override
    if (!isDevOverride) {
      if (!row.otp_hash || row.otp_hash !== hashOTP(code)) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
    }

    // Clear OTP data and mark as verified
    await db.run(
      `UPDATE signers 
       SET otp_hash = NULL, 
           otp_expires_at = NULL,
           otp_verified_at = datetime('now')
       WHERE id = ? AND contract_id = ?`,
      [signerId, contractId]
    );

    await logAudit(contractId, signerId, 'OTP_VERIFIED');
    res.json({ success: true });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

module.exports = router;
