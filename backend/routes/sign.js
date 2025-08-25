const express = require('express');
const router = express.Router();
const { getDb } = require('../services/db');
const { logAudit } = require('../services/audit');
const path = require('path');
const fs = require('fs');

// Sign document
router.post('/:token/sign', async (req, res) => {
  try {
    const { token } = req.params;
    const { signatureDataUrl, gps, consented, ua } = req.body;
    
    // Verify token and get signer info
    const db = await getDb();
    const signer = await db.get(
      `SELECT s.*, c.id as contract_id 
       FROM signers s
       JOIN contracts c ON s.contract_id = c.id
       WHERE s.token = ? AND s.token_expires_at > datetime('now')`,
      [token]
    );

    if (!signer) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if OTP is verified
    if (!signer.otp_verified_at) {
      return res.status(403).json({ error: 'OTP verification required' });
    }

    // Save signature (implementation depends on your storage)
    const signaturePath = await saveSignature(signatureDataUrl, signer.contract_id, signer.id);
    
    // Get client IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Update signer with signature and consent info
    await db.run(
      `UPDATE signers 
       SET signed_at = datetime('now'),
           signature_path = ?,
           gps_lat = ?,
           gps_lng = ?,
           gps_accuracy = ?,
           consented = ?,
           ip_address = ?,
           ua = ?
       WHERE id = ?`,
      [
        signaturePath,
        gps?.lat || null,
        gps?.lng || null,
        gps?.accuracy || null,
        consented ? 1 : 0,
        ip,
        ua || req.headers['user-agent'],
        signer.id
      ]
    );

    await logAudit(signer.contract_id, signer.id, 'DOCUMENT_SIGNED', {
      gps,
      consented: !!consented,
      ip,
      ua: ua || req.headers['user-agent']
    });

    res.json({ 
      success: true,
      downloadUrl: `/api/contracts/${signer.contract_id}/download`
    });
  } catch (error) {
    console.error('Sign error:', error);
    res.status(500).json({ error: 'Failed to process signature' });
  }
});

// Helper function to save signature
async function saveSignature(dataUrl, contractId, signerId) {
  // Extract the base64 data
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid signature data');
  }

  const fileExt = matches[1].split('/')[1] || 'png';
  const fileName = `signature_${contractId}_${signerId}_${Date.now()}.${fileExt}`;
  const filePath = path.join(__dirname, '../uploads/signatures', fileName);

  // Ensure directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Save file
  const base64Data = matches[2];
  fs.writeFileSync(filePath, base64Data, 'base64');

  return `/signatures/${fileName}`;
}

module.exports = router;
