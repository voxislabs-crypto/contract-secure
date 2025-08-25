const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../utils/db');
const { logAudit } = require('../utils/audit');
const { generateOtp, hashOtp } = require('../utils/otp');
const { finalizePdf } = require('../utils/pdf/stamp');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Rate limiting for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 OTP requests per windowMs
  message: { error: 'Too many OTP requests, please try again later' }
});

// Create a new contract
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const contractId = uuidv4();
    const db = await getDb();

    // Create the contract
    await db.run(
      'INSERT INTO contracts (id, title, base_pdf_path, status) VALUES (?, ?, ?, ?)',
      [contractId, title, req.file.path, 'pending']
    );

    // Log the creation
    await logAudit(contractId, null, 'CONTRACT_CREATED', {
      title,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      id: contractId,
      title,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// Add signers to a contract
router.post('/:id/signers', async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const { signers } = req.body;

    if (!Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({ error: 'At least one signer is required' });
    }

    const db = await getDb();
    const result = [];

    // Start a transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Verify the contract exists
      const contract = await db.get(
        'SELECT id FROM contracts WHERE id = ?',
        [contractId]
      );

      if (!contract) {
        await db.run('ROLLBACK');
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Add each signer
      for (const signerData of signers) {
        const signerId = uuidv4();
        const { name, email, phone, sequence } = signerData;

        await db.run(
          `INSERT INTO signers 
           (id, contract_id, name, email, phone, sequence)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [signerId, contractId, name, email, phone || null, sequence || 1]
        );

        result.push({
          id: signerId,
          contractId,
          name,
          email,
          phone: phone || null,
          sequence: sequence || 1
        });

        await logAudit(contractId, signerId, 'SIGNER_ADDED', {
          name,
          email,
          sequence: sequence || 1
        });
      }

      // Update contract status if this is the first signer
      await db.run(
        'UPDATE contracts SET status = ? WHERE id = ? AND status = ?',
        ['in_progress', contractId, 'pending']
      );

      await db.run('COMMIT');
      res.status(201).json(result);
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error adding signers:', error);
    res.status(500).json({ error: 'Failed to add signers' });
  }
});

// Send OTP to signer
router.post('/:id/otp/send', otpLimiter, async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    const db = await getDb();

    // Find the signer by email or phone
    const signer = await db.get(
      'SELECT id, name, email, phone FROM signers WHERE contract_id = ? AND (email = ? OR phone = ?)',
      [contractId, email || '', phone || '']
    );

    if (!signer) {
      return res.status(404).json({ error: 'Signer not found for this contract' });
    }

    // Generate and store OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await db.run(
      'UPDATE signers SET otp_hash = ?, otp_expires_at = ? WHERE id = ?',
      [otpHash, otpExpiresAt, signer.id]
    );

    // In production, you would send the OTP via email/SMS here
    console.log(`OTP for ${signer.email || signer.phone}: ${otp}`);

    await logAudit(contractId, signer.id, 'OTP_SENT', {
      method: email ? 'email' : 'sms',
      to: email || phone
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and generate token
router.post('/:id/otp/verify', async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const { signerId, code } = req.body;

    if (!signerId || !code) {
      return res.status(400).json({ error: 'Signer ID and OTP code are required' });
    }

    const db = await getDb();

    // Get the signer and verify OTP
    const signer = await db.get(
      'SELECT id, otp_hash, otp_expires_at FROM signers WHERE id = ? AND contract_id = ?',
      [signerId, contractId]
    );

    if (!signer) {
      return res.status(404).json({ error: 'Signer not found' });
    }

    if (!signer.otp_hash || new Date(signer.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP expired or not requested' });
    }

    const isValid = await verifyOtp(code, signer.otp_hash);
    if (!isValid) {
      await logAudit(contractId, signerId, 'OTP_VERIFICATION_FAILED', {
        ip: req.ip
      });
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Mark OTP as verified
    await db.run(
      'UPDATE signers SET otp_verified_at = ?, otp_hash = NULL, otp_expires_at = NULL WHERE id = ?',
      [new Date().toISOString(), signerId]
    );

    // Generate a token (in production, use JWT)
    const token = generateToken();

    await logAudit(contractId, signerId, 'OTP_VERIFIED', {
      ip: req.ip
    });

    res.json({
      success: true,
      token,
      signerId
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Submit signature
router.post('/:id/signature', async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const { signerId, dataUrlPng, page, x, y, width } = req.body;

    // Validate inputs
    if (!signerId || !dataUrlPng || page === undefined || !x || !y || !width) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await getDb();

    // Verify the signer exists and has verified OTP
    const signer = await db.get(
      'SELECT id, name FROM signers WHERE id = ? AND contract_id = ? AND otp_verified_at IS NOT NULL',
      [signerId, contractId]
    );

    if (!signer) {
      return res.status(404).json({ error: 'Signer not found or not verified' });
    }

    // Save the signature image
    const uploadDir = path.join(__dirname, '..', 'uploads', 'signatures');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filename = `${signerId}-${Date.now()}.png`;
    const filePath = path.join(uploadDir, filename);
    
    // Convert data URL to buffer and save
    const base64Data = dataUrlPng.replace(/^data:image\/png;base64,/, '');
    await fs.writeFile(filePath, base64Data, 'base64');

    // Update signer with signature info
    await db.run(
      `UPDATE signers 
       SET signature_image_path = ?, signature_page = ?, signature_x = ?, 
           signature_y = ?, signature_width = ?, signed_at = ?
       WHERE id = ?`,
      [filePath, page, x, y, width, new Date().toISOString(), signerId]
    );

    await logAudit(contractId, signerId, 'SIGNATURE_SAVED', {
      page,
      x,
      y,
      width,
      ip: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// Finalize the contract
router.post('/:id/finalize', async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const db = await getDb();

    // Get the contract and verify all signers have signed
    const [contract, signers] = await Promise.all([
      db.get('SELECT * FROM contracts WHERE id = ?', [contractId]),
      db.all(
        'SELECT * FROM signers WHERE contract_id = ? AND signed_at IS NOT NULL',
        [contractId]
      )
    ]);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (signers.length === 0) {
      return res.status(400).json({ error: 'No signers have signed the contract' });
    }

    // Prepare signatures for PDF stamping
    const signatures = await Promise.all(
      signers.map(async (signer) => {
        if (!signer.signature_image_path) return null;
        
        return {
          signerId: signer.id,
          signerName: signer.name,
          imagePath: signer.signature_image_path,
          page: signer.signature_page || 0,
          x: signer.signature_x || 100,
          y: signer.signature_y || 100,
          width: signer.signature_width || 200,
          signedAt: signer.signed_at
        };
      }).filter(Boolean)
    );

    // Generate the final PDF
    const outputDir = path.join(__dirname, '..', 'output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `${contractId}_final.pdf`);
    
    const { sha256 } = await finalizePdf(
      contractId,
      contract.base_pdf_path,
      signatures,
      outputPath
    );

    // Update the contract with final PDF info
    await db.run(
      'UPDATE contracts SET status = ?, final_pdf_path = ?, pdf_sha256 = ?, completed_at = ? WHERE id = ?',
      ['completed', outputPath, sha256, new Date().toISOString(), contractId]
    );

    await logAudit(contractId, null, 'CONTRACT_FINALIZED', {
      sha256,
      outputPath
    });

    res.json({
      success: true,
      downloadUrl: `/api/contracts/${contractId}/download`,
      sha256
    });
  } catch (error) {
    console.error('Error finalizing contract:', error);
    res.status(500).json({ error: 'Failed to finalize contract' });
  }
});

// Download the final PDF
router.get('/:id/download', async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const db = await getDb();

    const contract = await db.get(
      'SELECT final_pdf_path, pdf_sha256 FROM contracts WHERE id = ? AND status = ?',
      [contractId, 'completed']
    );

    if (!contract || !contract.final_pdf_path) {
      return res.status(404).json({ error: 'Finalized contract not found' });
    }

    // Log the download
    await logAudit(contractId, null, 'CONTRACT_DOWNLOADED', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Stream the file
    res.download(contract.final_pdf_path, `contract-${contractId}.pdf`);
  } catch (error) {
    console.error('Error downloading contract:', error);
    res.status(500).json({ error: 'Failed to download contract' });
  }
});

// Get contract audit trail
router.get('/:id/audit', async (req, res) => {
  try {
    const { id: contractId } = req.params;
    const db = await getDb();

    const auditLogs = await db.all(
      'SELECT * FROM audit WHERE contract_id = ? ORDER BY created_at DESC',
      [contractId]
    );

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
