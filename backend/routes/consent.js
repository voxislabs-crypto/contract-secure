const jwt = require('jsonwebtoken');
const { updateSignerConsent } = require('../services/db');
const { logAudit } = require('../services/audit');

async function postConsent(req, res) {
  try {
    const { token, gps } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fR7!pT2#xL9zV8qC0uG4@kM1dN6^wH3jS5aY7bE2tR9');
    const { contractId, signerId } = decoded;

    if (!contractId || !signerId) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    const ipHeader = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      await updateSignerConsent({
        contractId,
        signerId,
        consentGivenAt: new Date(),
        consentIp: ip,
        consentUserAgent: userAgent,
        gpsLatitude: gps?.lat ?? null,
        gpsLongitude: gps?.lng ?? null,
        gpsAccuracy: gps?.accuracy ?? null,
      });

      await logAudit(contractId, signerId, 'CONSENT_GIVEN', {
        gps: !!gps,
        ip,
        userAgent
      });

      return res.json({ 
        success: true,
        message: 'Consent recorded successfully'
      });
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        error: 'Failed to record consent',
        details: error.message
      });
    }
  } catch (err) {
    console.error('Consent error:', err);
    return res.status(400).json({
      error: err.message || 'Invalid or expired token'
    });
  }
}

module.exports = { postConsent };
