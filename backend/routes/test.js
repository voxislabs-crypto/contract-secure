const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Test endpoint to generate a token
router.get('/api/test/token', (req, res) => {
  try {
    const { contractId = 1, signerId = 42 } = req.query;
    
    const token = jwt.sign(
      { contractId, signerId },
      process.env.JWT_SECRET || 'fR7!pT2#xL9zV8qC0uG4@kM1dN6^wH3jS5aY7bE2tR9',
      { expiresIn: '1h' }
    );
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating test token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
